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

/** Throw a consistent TypeError for any mutation attempt */
function rejectMutation(op: string): never {
  throw new TypeError(`Cannot ${op}: object is immutable`);
}

/** Create a Proxy that blocks all mutations on obj */
function createImmutableProxy<T extends object>(obj: T): T {
  if (proxyCache.has(obj)) return proxyCache.get(obj) as T;

  const proxy = new Proxy(obj, {
    get(target, prop, receiver) {
      // Types with internal slots require `this` to be the real instance.
      // Read value from target directly to avoid "incompatible receiver".
      const hasInternalSlots = target instanceof Map || target instanceof Set
        || target instanceof WeakMap || target instanceof WeakSet
        || target instanceof Date;
      const value = hasInternalSlots
        ? Reflect.get(target, prop)
        : Reflect.get(target, prop, receiver);

      // Block mutation methods on built-in types with internal slots
      if (typeof prop === 'string') {
        if (target instanceof Map && MAP_MUTATORS.has(prop)) return () => rejectMutation(prop);
        if (target instanceof Set && SET_MUTATORS.has(prop)) return () => rejectMutation(prop);
        if (target instanceof WeakMap && WEAKMAP_MUTATORS.has(prop)) return () => rejectMutation(prop);
        if (target instanceof WeakSet && WEAKSET_MUTATORS.has(prop)) return () => rejectMutation(prop);
        if (target instanceof Date && DATE_MUTATORS.has(prop)) return () => rejectMutation(prop);
        if (Array.isArray(target) && ARRAY_MUTATORS.has(prop)) return () => rejectMutation(prop);
      }

      // Bind methods to the real target so they access internal slots correctly
      if (hasInternalSlots && typeof value === 'function') {
        return (value as Function).bind(target);
      }

      // Lazily wrap nested objects in a proxy on access.
      // BUT: if property is non-writable + non-configurable, Proxy spec §10.5.8
      // requires returning exact same value. Return unwrapped to avoid TypeError.
      if (isFreezable(value)) {
        if (typeof prop === 'string' || typeof prop === 'symbol') {
          const desc = Reflect.getOwnPropertyDescriptor(target, prop);
          if (desc && !desc.configurable && 'value' in desc && !desc.writable) {
            return value; // must return exact value per Proxy invariant
          }
        }
        return createImmutableProxy(value as object);
      }

      return value;
    },

    set(_t, prop) {
      return rejectMutation(`set property "${String(prop)}"`);
    },

    deleteProperty(_t, prop) {
      return rejectMutation(`delete property "${String(prop)}"`);
    },

    defineProperty(_t, prop) {
      return rejectMutation(`define property "${String(prop)}"`);
    },

    setPrototypeOf() {
      return rejectMutation('set prototype');
    },

    has(target, prop) {
      return Reflect.has(target, prop);
    },

    ownKeys(target) {
      return Reflect.ownKeys(target);
    },

    getOwnPropertyDescriptor(target, prop) {
      return Reflect.getOwnPropertyDescriptor(target, prop);
    },

    preventExtensions() {
      return rejectMutation('prevent extensions');
    },

    isExtensible(target) {
      return Reflect.isExtensible(target);
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
 * const obj = immutable({ nested: { count: 0 } });
 * obj.nested.count = 1; // throws TypeError
 */
export function immutableView<T>(val: T): T extends object ? DeepReadonly<T> : T {
  if (!isFreezable(val)) return val as T extends object ? DeepReadonly<T> : T;
  // NOTE: We intentionally do NOT freeze the target. Proxy invariants require
  // that get traps on non-writable/non-configurable properties return the exact
  // target value — but we return proxy-wrapped nested objects for deep immutability.
  // Freezing + Proxy get trap are fundamentally incompatible in the JS spec.
  // If callers retain the original reference, they can mutate the underlying data.
  // Use vault() for reference isolation, or don't retain the original reference.
  return createImmutableProxy(val as object) as T extends object ? DeepReadonly<T> : T;
}

/**
 * Check whether a value is a Proxy created by `immutableView()`.
 *
 * Uses a private WeakSet registry — unforgeable from outside the module.
 * Returns false for any other value, including plain frozen objects.
 *
 * @param val - Value to test
 * @returns true if val was produced by immutableView()
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
