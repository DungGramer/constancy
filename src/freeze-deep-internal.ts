/**
 * Shared internal helpers: recursive freeze + deep clone.
 * Used by deepFreeze(), snapshot(), vault(), and tamperEvident().
 */
import {
  _freeze,
  _ownKeys,
  _getOwnPropertyDescriptor,
  _isView,
  _structuredClone,
} from './cached-builtins';
import { isFreezable } from './utils';

/**
 * Deep clone via cached structuredClone. Requires Node >= 18 or modern browser.
 * Preserves: Date, Map, Set, RegExp, ArrayBuffer, circular refs, TypedArrays.
 * Throws TypeError for non-cloneable values (functions, Symbols, DOM nodes).
 */
export function deepClone<T>(value: T): T {
  if (typeof _structuredClone !== 'function') {
    throw new TypeError('deepClone: structuredClone is not available in this runtime');
  }
  try {
    return _structuredClone(value);
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
 *  Map/Set internal slots. See deepFreeze() JSDoc.
 *
 *  @param freezePrototypeChain — when true, also freezes the prototype of each
 *    visited object. Blocks post-freeze prototype poisoning (audit F1). Never
 *    freezes the canonical Object.prototype / Function.prototype / Array.prototype
 *    which would break the entire runtime. */
export function freezeDeep(
  obj: object,
  seen: WeakSet<object> = new WeakSet(),
  freezePrototypeChain = false,
): void {
  if (seen.has(obj)) return;
  seen.add(obj);

  if (obj === Object.prototype || obj === Function.prototype || obj === Array.prototype) return;

  // TypedArrays cannot be frozen when non-empty — skip
  if (_isView(obj) && !(obj instanceof DataView)) return;

  for (const key of _ownKeys(obj)) {
    const desc = _getOwnPropertyDescriptor(obj, key);
    if (desc && 'value' in desc && isFreezable(desc.value)) {
      freezeDeep(desc.value as object, seen, freezePrototypeChain);
    }
  }

  if (freezePrototypeChain) {
    const proto = Object.getPrototypeOf(obj);
    // Skip canonical root prototypes to avoid breaking the runtime
    if (proto && proto !== Object.prototype
      && proto !== Function.prototype && proto !== Array.prototype) {
      freezeDeep(proto, seen, freezePrototypeChain);
    }
  }

  _freeze(obj);
}
