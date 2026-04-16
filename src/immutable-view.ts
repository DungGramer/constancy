import type { DeepReadonly } from './types';
import { isFreezable } from './utils';

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

/** Check if prop is a blocked mutator method on target. Returns method name or null. */
function getBlockedMutator(target: object, prop: string | symbol): string | null {
  if (typeof prop !== 'string') return null;
  for (const [ctor, mutators] of MUTATOR_MAP) {
    if (target instanceof ctor && mutators.has(prop)) return prop;
  }
  if (Array.isArray(target) && ARRAY_MUTATORS.has(prop)) return prop;
  return null;
}

/** Check if a property descriptor is non-writable + non-configurable (Proxy invariant) */
function isFrozenDescriptor(target: object, prop: string | symbol): boolean {
  const desc = Reflect.getOwnPropertyDescriptor(target, prop);
  return !!desc && !desc.configurable && 'value' in desc && !desc.writable;
}

/** Create a Proxy that blocks all mutations on obj */
function createImmutableProxy<T extends object>(obj: T): T {
  if (proxyCache.has(obj)) return proxyCache.get(obj) as T;

  const proxy = new Proxy(obj, {
    get(target, prop, receiver) {
      const isSlotted = hasInternalSlots(target);
      const value = isSlotted
        ? Reflect.get(target, prop)
        : Reflect.get(target, prop, receiver);

      // Block mutation methods on built-in types
      const blocked = getBlockedMutator(target, prop);
      if (blocked) return () => rejectMutation(blocked);

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
    has(target, prop) { return Reflect.has(target, prop); },
    ownKeys(target) { return Reflect.ownKeys(target); },
    getOwnPropertyDescriptor(target, prop) { return Reflect.getOwnPropertyDescriptor(target, prop); },
    isExtensible(target) { return Reflect.isExtensible(target); },
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
