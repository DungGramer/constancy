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
 * Throws TypeError for non-cloneable values (functions, Symbols, DOM nodes).
 */
export function deepClone<T>(value: T): T {
  try {
    return structuredClone(value);
  } catch (err) {
    if ((err as Error)?.name === 'DataCloneError') {
      throw new TypeError(
        `deepClone: value contains non-cloneable data (functions, Symbols, DOM nodes). ` +
        `Use immutableView() for non-cloneable objects, or remove non-cloneable properties first.`
      );
    }
    throw err;
  }
}

/** Recursively freeze an object graph; guards circular refs via WeakSet.
 *  Skips: TypedArray byte data, accessor (getter/setter) properties,
 *  prototype chain, Map/Set internal slots. See deepFreeze() JSDoc. */
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
