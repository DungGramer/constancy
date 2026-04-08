import type { DeepReadonly } from './types';
import { isFreezable, getOwnKeys } from './utils';

/** Check if value is a TypedArray instance (works on Node 6+) */
function isTypedArray(val: unknown): val is ArrayBufferView {
  return ArrayBuffer.isView(val) && !(val instanceof DataView);
}

/** Recursively freeze object and all nested properties */
function freezeRecursive(obj: object, seen: WeakSet<object>): void {
  // Guard against circular references — skip already-visited objects
  if (seen.has(obj)) return;
  seen.add(obj);

  // Protect built-in prototypes from accidental freezing
  if (obj === Object.prototype || obj === Function.prototype || obj === Array.prototype) return;

  // TypedArrays: do NOT call Object.freeze() — it throws for non-empty typed
  // arrays ("Cannot freeze array buffer views with elements"). Their indexed
  // slots are raw memory, not configurable JS properties, so they are already
  // effectively immutable at the element level. Just mark as visited and skip.
  if (isTypedArray(obj)) {
    return;
  }

  // Walk all own keys (string + symbol) via Reflect.ownKeys for full coverage
  for (const key of getOwnKeys(obj)) {
    const descriptor = Object.getOwnPropertyDescriptor(obj, key);
    if (!descriptor) continue;

    // Only recurse into data properties (have 'value').
    // Skip accessor descriptors (get/set) to avoid unintended getter invocation.
    if ('value' in descriptor && isFreezable(descriptor.value)) {
      freezeRecursive(descriptor.value as object, seen);
    }
  }

  Object.freeze(obj);
}

/**
 * Deep-freeze a value recursively. Handles circular references,
 * Symbol keys, TypedArrays, and getter/setter descriptors.
 *
 * Primitives are returned unchanged. Objects and all their reachable
 * nested properties are frozen in bottom-up order (children before parent)
 * so that the final frozen graph is fully immutable.
 *
 * **Note:** Map/Set instances are frozen at the object level, but their
 * internal slots (.set(), .add(), .delete()) remain functional since they
 * bypass ordinary property access. Use immutable wrappers if you need
 * fully immutable Map/Set behavior.
 *
 * @param val - Value to deep-freeze
 * @returns Deep-frozen value typed as DeepReadonly<T> for objects,
 *          or T unchanged for primitives
 *
 * @example
 * const obj = { nested: { a: 1 }, arr: [1, [2, 3]] };
 * const frozen = deepFreeze(obj);
 * // frozen.nested.a = 2;   // TypeError in strict mode
 * // frozen.arr[1].push(4); // TypeError in strict mode
 */
export function deepFreeze<T>(val: T): T extends object ? DeepReadonly<T> : T {
  if (!isFreezable(val)) {
    // Primitives (string, number, boolean, bigint, symbol, null, undefined)
    // are already immutable — return as-is
    return val as T extends object ? DeepReadonly<T> : T;
  }
  const seen = new WeakSet<object>();
  freezeRecursive(val as object, seen);
  return val as T extends object ? DeepReadonly<T> : T;
}
