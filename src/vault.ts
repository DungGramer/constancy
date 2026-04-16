import { _freeze } from './cached-builtins';
import { freezeDeep, deepClone } from './freeze-deep-internal';
import type { DeepReadonly } from './types';
import { isFreezable } from './utils';

/**
 * A sealed container whose stored value can never leak a mutable reference.
 * Every `get()` call returns a fresh frozen deep copy.
 */
export interface Vault<T> {
  readonly get: () => DeepReadonly<T>;
}

/** Return a deep-frozen copy of `val`, or the primitive itself. */
function frozenCopy<T>(val: T): DeepReadonly<T> {
  if (!isFreezable(val)) return val as DeepReadonly<T>;
  const clone = deepClone(val);
  freezeDeep(clone as object);
  return clone as DeepReadonly<T>;
}

/**
 * Seals `value` inside a closure — the original reference is severed
 * immediately. Every call to `get()` returns a new frozen deep copy so
 * callers can never observe or mutate the stored state.
 *
 * **Object.freeze limitation:** Map/Set internal slots remain mutable.
 * Use `immutableMapView()` / `immutableSetView()` for collection immutability.
 *
 * @param value - Any value to protect. Primitives are stored as-is.
 * @returns A frozen `Vault<T>` with a single `get()` accessor.
 *
 * @example
 * const v = vault({ x: 1, nested: { y: 2 } });
 * const a = v.get(); // frozen copy
 * const b = v.get(); // different frozen copy — a !== b
 */
export function vault<T>(value: T): Vault<T> {
  const stored: DeepReadonly<T> = frozenCopy(value);

  return _freeze<Vault<T>>({
    get: () => frozenCopy(stored as T),
  });
}
