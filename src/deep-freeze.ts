import type { DeepReadonly } from './types';
import { isFreezable } from './utils';
import { freezeDeep } from './freeze-deep-internal';

/**
 * Deep-freeze a value recursively. Handles circular references,
 * Symbol keys, TypedArrays, and getter/setter descriptors.
 *
 * Primitives are returned unchanged. Objects and all their reachable
 * nested properties are frozen in bottom-up order (children before parent)
 * so that the final frozen graph is fully immutable.
 *
 * **Known limitations (by design):**
 * - **Map/Set:** Internal slots (.set(), .add(), .delete()) remain functional
 *   after freeze — use `immutableMapView()`/`immutableSetView()` for full immutability.
 * - **TypedArrays:** Byte data remains writable (non-empty TypedArrays cannot be
 *   frozen). The container property is frozen but indexed writes still work.
 * - **Getters:** Accessor properties are skipped to avoid side effects during freeze.
 *   Objects returned by getters are not frozen.
 * - **Prototypes:** Only own properties are traversed. Inherited properties from
 *   the prototype chain remain mutable. Use `secureSnapshot()` for null-prototype objects.
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
    return val as T extends object ? DeepReadonly<T> : T;
  }
  freezeDeep(val as object);
  return val as T extends object ? DeepReadonly<T> : T;
}
