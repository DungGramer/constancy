import { _isFrozen, _getOwnPropertyDescriptor, _ownKeys } from './cached-builtins';
import { isFreezable } from './utils';

/**
 * Returns true if `val` and all nested data properties are frozen.
 * Primitives are always considered deeply frozen.
 * Handles circular references via WeakSet.
 */
export function isDeepFrozen(val: unknown, seen: WeakSet<object> = new WeakSet()): boolean {
  if (!isFreezable(val)) return true;

  const obj = val as object;
  if (seen.has(obj)) return true;
  if (!_isFrozen(obj)) return false;

  seen.add(obj);

  for (const key of _ownKeys(obj)) {
    const desc = _getOwnPropertyDescriptor(obj, key);
    if (desc && 'value' in desc && !isDeepFrozen(desc.value, seen)) {
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
