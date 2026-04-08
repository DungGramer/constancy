import { isFreezable } from './utils';

/**
 * Shallow-freeze a value. Primitives returned unchanged.
 * Objects/functions frozen via Object.freeze().
 *
 * @param val - Value to freeze
 * @returns Frozen value (Readonly<T> for objects) or primitive unchanged
 *
 * @example
 * const frozen = constancy({ a: 1 });
 * // frozen.a = 2; // TypeError in strict mode
 */
export function constancy<T>(val: T): T extends object ? Readonly<T> : T {
  if (!isFreezable(val)) {
    return val as any;
  }
  return Object.freeze(val) as any;
}
