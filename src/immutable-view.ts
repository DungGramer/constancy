import type { DeepReadonly } from './types';
import { isFreezable } from './utils';
import {
  _Proxy,
  _ownKeys,
  _reflectGet,
  _reflectHas,
  _reflectGetOwnPropertyDescriptor,
  _reflectGetPrototypeOf,
  _reflectIsExtensible,
} from './cached-builtins';
import { wrapMapMethod, wrapSetMethod } from './immutable-view-collection-wraps';

const proxyCache = new WeakMap<object, object>();
/** Private registry of proxies created by immutableView() — unforgeable from outside */
const immutableRegistry = new WeakSet<object>();

const MAP_MUTATORS = new Set(['set', 'delete', 'clear']);
const SET_MUTATORS = new Set(['add', 'delete', 'clear']);
const WEAKMAP_MUTATORS = new Set(['set', 'delete']);
const WEAKSET_MUTATORS = new Set(['add', 'delete']);
const ARRAY_MUTATORS = new Set([
  'push', 'pop', 'shift', 'unshift', 'splice',
  'sort', 'reverse', 'fill', 'copyWithin',
]);
const DATE_MUTATORS = new Set([
  'setTime', 'setMilliseconds', 'setUTCMilliseconds',
  'setSeconds', 'setUTCSeconds', 'setMinutes', 'setUTCMinutes',
  'setHours', 'setUTCHours', 'setDate', 'setUTCDate',
  'setMonth', 'setUTCMonth', 'setFullYear', 'setUTCFullYear',
]);

/** Map of constructor → blocked method names */
const MUTATOR_MAP: [Function, Set<string>][] = [
  [Map, MAP_MUTATORS],
  [Set, SET_MUTATORS],
  [WeakMap, WEAKMAP_MUTATORS],
  [WeakSet, WEAKSET_MUTATORS],
  [Date, DATE_MUTATORS],
];

/** Throw a consistent TypeError for any mutation attempt */
function rejectMutation(op: string): never {
  throw new TypeError(`Cannot ${op}: object is immutable`);
}

/** Check if target has internal slots (Map/Set/WeakMap/WeakSet/Date) */
function hasInternalSlots(target: object): boolean {
  return target instanceof Map || target instanceof Set
    || target instanceof WeakMap || target instanceof WeakSet
    || target instanceof Date;
}

/**
 * Known non-mutating read methods on built-in collection types. Any string-keyed
 * function property NOT in this allow-list (and NOT on the class itself) is
 * treated as a potential subclass custom mutator and blocked. Closes audit V3:
 * `class Evil extends Map { sneakSet(k,v){this.set(k,v)} }` previously bypassed
 * the deny list because `sneakSet` was not named in MUTATOR_MAP.
 */
const MAP_READ_METHODS = new Set([
  'get', 'has', 'keys', 'values', 'entries', 'forEach',
]);
const SET_READ_METHODS = new Set([
  'has', 'keys', 'values', 'entries', 'forEach',
]);
const WEAKMAP_READ_METHODS = new Set(['get', 'has']);
const WEAKSET_READ_METHODS = new Set(['has']);
const DATE_READ_METHODS = new Set([
  'getTime', 'getFullYear', 'getUTCFullYear', 'getMonth', 'getUTCMonth',
  'getDate', 'getUTCDate', 'getDay', 'getUTCDay',
  'getHours', 'getUTCHours', 'getMinutes', 'getUTCMinutes',
  'getSeconds', 'getUTCSeconds', 'getMilliseconds', 'getUTCMilliseconds',
  'getTimezoneOffset', 'valueOf',
  'toString', 'toDateString', 'toTimeString', 'toLocaleString',
  'toLocaleDateString', 'toLocaleTimeString', 'toUTCString', 'toISOString',
  'toJSON',
]);

const READ_METHOD_MAP: [Function, Set<string>][] = [
  [Map, MAP_READ_METHODS],
  [Set, SET_READ_METHODS],
  [WeakMap, WEAKMAP_READ_METHODS],
  [WeakSet, WEAKSET_READ_METHODS],
  [Date, DATE_READ_METHODS],
];

/** Check if prop is a blocked mutator method on target. Returns method name or null. */
function getBlockedMutator(target: object, prop: string | symbol): string | null {
  if (typeof prop !== 'string') return null;
  for (const [ctor, mutators] of MUTATOR_MAP) {
    if (target instanceof ctor && mutators.has(prop)) return prop;
  }
  if (Array.isArray(target) && ARRAY_MUTATORS.has(prop)) return prop;
  return null;
}

/**
 * For objects with internal slots (Map/Set/WeakMap/WeakSet/Date), return true
 * if `prop` is a function that is NOT a known read method. These are treated
 * as subclass-defined mutators and blocked regardless of their actual behavior
 * (defensive deny-by-default — audit V3).
 */
function isSuspectSlottedMethod(target: object, prop: string | symbol, value: unknown): boolean {
  if (typeof prop !== 'string' || typeof value !== 'function') return false;
  for (const [ctor, reads] of READ_METHOD_MAP) {
    if (target instanceof ctor) {
      // Allow own-prototype standard reads; block everything else that's a function.
      if (reads.has(prop)) return false;
      // Also allow Symbol.toStringTag etc. which are handled earlier (typeof !== 'string').
      return true;
    }
  }
  return false;
}

/** Check if a property descriptor is non-writable + non-configurable (Proxy invariant) */
function isFrozenDescriptor(target: object, prop: string | symbol): boolean {
  const desc = _reflectGetOwnPropertyDescriptor(target, prop);
  return !!desc && !desc.configurable && 'value' in desc && !desc.writable;
}

/** Create a Proxy that blocks all mutations on obj */
function createImmutableProxy<T extends object>(obj: T): T {
  if (proxyCache.has(obj)) return proxyCache.get(obj) as T;

  const proxy = new _Proxy(obj, {
    get(target, prop, receiver) {
      const isSlotted = hasInternalSlots(target);
      const value = isSlotted
        ? _reflectGet(target, prop)
        : _reflectGet(target, prop, receiver);

      // Block mutation methods on built-in types
      const blocked = getBlockedMutator(target, prop);
      if (blocked) return () => rejectMutation(blocked);

      // Block subclass-defined methods on slotted types (V3 defense):
      // any function property that is not in the known read-method allow-list
      // is treated as a potential mutator even if not named in MUTATOR_MAP.
      if (isSlotted && isSuspectSlottedMethod(target, prop, value)) {
        return () => rejectMutation(`invoke subclass method "${String(prop)}"`);
      }

      // Wrap value-returning Map/Set methods so returned objects are proxied
      if (target instanceof Map) {
        const wrapped = wrapMapMethod(target, prop, createImmutableProxy);
        if (wrapped !== null) return wrapped;
      } else if (target instanceof Set) {
        const wrapped = wrapSetMethod(target, prop, createImmutableProxy);
        if (wrapped !== null) return wrapped;
      }

      // Bind non-mutator methods to real target for internal slot access
      if (isSlotted && typeof value === 'function') {
        return (value as Function).bind(target);
      }

      // Lazily wrap nested objects. Respect Proxy invariant §10.5.8:
      // non-writable + non-configurable props must return exact value.
      if (isFreezable(value)) {
        if (isFrozenDescriptor(target, prop)) return value;
        return createImmutableProxy(value as object);
      }

      return value;
    },

    set(_t, prop) { return rejectMutation(`set property "${String(prop)}"`); },
    deleteProperty(_t, prop) { return rejectMutation(`delete property "${String(prop)}"`); },
    defineProperty(_t, prop) { return rejectMutation(`define property "${String(prop)}"`); },
    setPrototypeOf() { return rejectMutation('set prototype'); },
    preventExtensions() { return rejectMutation('prevent extensions'); },
    getPrototypeOf(target) {
      const proto = _reflectGetPrototypeOf(target);
      return proto && isFreezable(proto) ? createImmutableProxy(proto) : proto;
    },
    has(target, prop) { return _reflectHas(target, prop); },
    ownKeys(target) { return _ownKeys(target); },
    getOwnPropertyDescriptor(target, prop) {
      const desc = _reflectGetOwnPropertyDescriptor(target, prop);
      if (desc && 'value' in desc && isFreezable(desc.value)) {
        if (!isFrozenDescriptor(target, prop)) {
          return { ...desc, value: createImmutableProxy(desc.value as object) };
        }
      }
      return desc;
    },
    isExtensible(target) { return _reflectIsExtensible(target); },

    // Audit V1/V6: block function application with a mutable / slotted `this`.
    // An attacker could pass a callsite receiver that the function mutates
    // (`evil.call(target)` where evil does `this.hacked = true`). By default
    // we require the receiver to be either primitive, the original target, or
    // another immutable view — anything else is rejected defensively.
    apply(target, thisArg, args) {
      if (typeof target !== 'function') {
        return rejectMutation('apply non-function target');
      }
      const safeReceiver =
        thisArg === null ||
        thisArg === undefined ||
        typeof thisArg !== 'object' ||
        thisArg === target ||
        immutableRegistry.has(thisArg as object);
      if (!safeReceiver) {
        return rejectMutation('apply function with a mutable receiver');
      }
      return (target as (...a: unknown[]) => unknown).apply(thisArg, args);
    },

    // Audit V1: block `new view(...)` entirely. An immutable view of a
    // constructor should not manufacture mutable instances.
    construct() {
      return rejectMutation('construct from immutable view');
    },
  });

  proxyCache.set(obj, proxy);
  immutableRegistry.add(proxy);
  return proxy;
}

/**
 * Wrap a value in a deeply immutable Proxy **view**.
 *
 * All mutation operations through this reference throw a TypeError.
 * Nested objects are wrapped lazily on first access.
 *
 * **Important:** This is a VIEW, not a snapshot. If the caller retains
 * the original reference, they can still mutate the underlying data.
 * Use `snapshot()` for true data immutability (clone + freeze),
 * or `vault()` for complete reference isolation (closure + copy-on-read).
 *
 * @param val - Value to wrap
 * @returns A Proxy-based immutable view, typed as DeepReadonly<T>
 *
 * @example
 * const obj = immutableView({ nested: { count: 0 } });
 * obj.nested.count = 1; // throws TypeError
 */
export function immutableView<T>(val: T): T extends object ? DeepReadonly<T> : T {
  if (!isFreezable(val)) return val as T extends object ? DeepReadonly<T> : T;
  return createImmutableProxy(val as object) as T extends object ? DeepReadonly<T> : T;
}

/**
 * Check whether a value is a Proxy created by `immutableView()`.
 * Uses a private WeakSet registry — unforgeable from outside the module.
 */
export function isImmutableView(val: unknown): boolean {
  if (!isFreezable(val)) return false;
  return immutableRegistry.has(val as object);
}

/**
 * Throws TypeError if `val` is not an immutable view Proxy.
 * @param val - Value to assert
 * @param label - Optional prefix for error message
 */
export function assertImmutableView(val: unknown, label?: string): void {
  if (!isImmutableView(val)) {
    const msg = label ? `${label}: Not an immutable view` : 'Not an immutable view';
    throw new TypeError(msg);
  }
}
