import { _isFrozen, _getOwnPropertyDescriptor, _ownKeys } from './cached-builtins';
import { isFreezable } from './utils';

/**
 * Returns true if `val` and all nested data properties are frozen.
 * Primitives are always considered deeply frozen.
 * Handles circular references via WeakSet.
 *
 * **Accessor handling (audit F4/I1):** Accessor (getter/setter) descriptors
 * return `false`. The getter could return a fresh mutable object on every
 * call, so we cannot prove deep-immutability without invoking it (which has
 * side effects and is not safe to do here). The previous behavior silently
 * skipped accessors and returned a false-positive `true`.
 */
export function isDeepFrozen(val: unknown, seen: WeakSet<object> = new WeakSet()): boolean {
  if (!isFreezable(val)) return true;

  const obj = val as object;
  if (seen.has(obj)) return true;
  if (!_isFrozen(obj)) return false;

  seen.add(obj);

  for (const key of _ownKeys(obj)) {
    const desc = _getOwnPropertyDescriptor(obj, key);
    if (!desc) continue;
    if (!('value' in desc)) {
      // Accessor descriptor — cannot prove the getter returns a frozen value.
      return false;
    }
    if (!isDeepFrozen(desc.value, seen)) {
      return false;
    }
  }

  return true;
}

/**
 * Throws TypeError if `val` is not deeply frozen.
 * @param val - The value to check.
 * @param label - Optional prefix for the error message.
 */
export function assertDeepFrozen(val: unknown, label?: string): void {
  if (!isDeepFrozen(val)) {
    const msg = label ? `${label}: Object is not deep frozen` : 'Object is not deep frozen';
    throw new TypeError(msg);
  }
}
