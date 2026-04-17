import type { DeepReadonly } from './types';
import { freezeDeep, deepClone } from './freeze-deep-internal';
import { isFreezable } from './utils';
import { _ownKeys, _getOwnPropertyDescriptor, _isArray } from './cached-builtins';

/**
 * Recursively sever Object.prototype from every plain-object node in the tree.
 * Preserves built-in types (Array, Date, Map, Set, RegExp, TypedArray) so their
 * methods keep working. Blocks prototype pollution leakage into snapshot output
 * (audit S1).
 */
function nullifyPlainPrototypes(node: unknown, seen: WeakSet<object>): void {
  if (node === null || typeof node !== 'object') return;
  if (seen.has(node as object)) return;
  seen.add(node as object);

  // Only touch pristine plain objects; preserve Array, Date, Map, Set, etc.
  if (Object.getPrototypeOf(node) === Object.prototype) {
    Object.setPrototypeOf(node, null);
  }

  if (_isArray(node)) {
    for (const item of node) nullifyPlainPrototypes(item, seen);
  } else if (node instanceof Map) {
    for (const v of node.values()) nullifyPlainPrototypes(v, seen);
  } else if (node instanceof Set) {
    for (const v of node.values()) nullifyPlainPrototypes(v, seen);
  } else {
    for (const key of _ownKeys(node)) {
      const desc = _getOwnPropertyDescriptor(node, key);
      if (desc && 'value' in desc) {
        nullifyPlainPrototypes(desc.value, seen);
      }
    }
  }
}

/**
 * Deep clone + deep freeze a value. Returns an immutable snapshot.
 *
 * The original reference is severed via deep clone, then the clone
 * is recursively frozen. No Proxy involved — no invariant conflicts.
 *
 * **Object.freeze limitation:** Map/Set instances are frozen at the object
 * level, but their internal slot methods (.set(), .add()) still work.
 * For full Map/Set immutability, use `immutableMapView()` / `immutableSetView()`.
 *
 * **Clone domain:** Uses structuredClone (Node 18+). Non-cloneable values
 * (functions, Symbols, DOM nodes) throw TypeError. No fallback — use
 * immutableView() for objects containing non-cloneable properties.
 *
 * @param value - Value to snapshot. Primitives returned unchanged.
 * @returns A frozen deep clone typed as DeepReadonly<T>
 *
 * @example
 * const raw = { user: { isVip: false } };
 * const locked = lock(raw);
 * raw.user.isVip = true;     // original mutated
 * locked.user.isVip;          // false — clone is independent
 * locked.user.isVip = true;  // TypeError — frozen
 */
export function snapshot<T>(value: T): DeepReadonly<T> {
  if (!isFreezable(value)) return value as DeepReadonly<T>;
  const clone = deepClone(value);
  nullifyPlainPrototypes(clone, new WeakSet());
  freezeDeep(clone as object);
  return clone as DeepReadonly<T>;
}

/** Alias for snapshot(). Shorter name for power users. */
export const lock = snapshot;
