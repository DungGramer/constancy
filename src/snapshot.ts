import type { DeepReadonly } from './types';
import { freezeDeep, deepClone } from './freeze-deep-internal';
import { isFreezable } from './utils';

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
  freezeDeep(clone as object);
  return clone as DeepReadonly<T>;
}

/** Alias for snapshot(). Shorter name for power users. */
export const lock = snapshot;
