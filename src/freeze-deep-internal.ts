/**
 * Shared internal helpers: recursive freeze + deep clone.
 * Used by deepFreeze(), snapshot(), vault(), and tamperEvident().
 */
import { _freeze, _ownKeys, _getOwnPropertyDescriptor, _isView } from './cached-builtins';
import { isFreezable } from './utils';

/** structuredClone is available in Node >= 17 and modern browsers but missing from ES2022 lib. */
declare function structuredClone<T>(value: T): T;

/**
 * Deep clone via structuredClone. Requires Node >= 18 or modern browser.
 * Preserves: Date, Map, Set, RegExp, ArrayBuffer, circular refs, TypedArrays.
 */
export function deepClone<T>(value: T): T {
  return structuredClone(value);
}

/** Recursively freeze an object graph; guards circular refs via WeakSet. */
export function freezeDeep(obj: object, seen: WeakSet<object> = new WeakSet()): void {
  if (seen.has(obj)) return;
  seen.add(obj);

  if (obj === Object.prototype || obj === Function.prototype || obj === Array.prototype) return;

  // TypedArrays cannot be frozen when non-empty — skip
  if (_isView(obj) && !(obj instanceof DataView)) return;

  for (const key of _ownKeys(obj)) {
    const desc = _getOwnPropertyDescriptor(obj, key);
    if (desc && 'value' in desc && isFreezable(desc.value)) {
      freezeDeep(desc.value as object, seen);
    }
  }

  _freeze(obj);
}
