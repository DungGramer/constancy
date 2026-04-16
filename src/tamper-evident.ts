import type { DeepReadonly } from './types';
import { _freeze } from './cached-builtins';
import { freezeDeep, deepClone } from './freeze-deep-internal';
import { isFreezable } from './utils';

/**
 * A sealed vault that holds an immutable deep copy of a value and exposes
 * structural hash verification to detect any corruption of internal state.
 */
export interface TamperEvidentVault<T> {
  /** Returns a frozen deep copy of the stored value. */
  readonly get: () => DeepReadonly<T>;
  /** Recomputes the hash and compares it to the original fingerprint. */
  readonly verify: () => boolean;
  /** Throws a TypeError if the stored hash no longer matches the value. */
  readonly assertIntact: () => void;
  /** The original djb2 hash of the serialized value (base-36). */
  readonly fingerprint: string;
}

/** djb2 hash — returns unsigned 32-bit result as base-36 string. */
function hashString(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = Math.trunc((hash << 5) + hash + (str.codePointAt(i) ?? 0));
  }
  return (hash >>> 0).toString(36);
}

/** Deterministic serialisation: Reflect.ownKeys (string + symbol), sorted. */
function stableStringify(val: unknown): string {
  if (val === null || typeof val !== 'object') {
    return JSON.stringify(val) ?? 'undefined';
  }
  if (Array.isArray(val)) {
    return '[' + val.map(stableStringify).join(',') + ']';
  }
  const obj = val as Record<string | symbol, unknown>;
  const allKeys = Reflect.ownKeys(obj);
  // Prefix symbol keys with \0S: to avoid collision with string keys
  const entries = allKeys
    .map(k => typeof k === 'symbol' ? '\0S:' + k.toString() : String(k))
    .sort((a, b) => a.localeCompare(b));
  const pairs = entries.map(sk => {
    const origKey = allKeys.find(k =>
      (typeof k === 'symbol' ? '\0S:' + k.toString() : String(k)) === sk
    )!;
    return JSON.stringify(sk) + ':' + stableStringify(obj[origKey]);
  });
  return '{' + pairs.join(',') + '}';
}

/**
 * Seals `value` inside a tamper-evident vault backed by a djb2 structural hash.
 *
 * The vault stores an independent deep clone — mutations to the original object
 * do not affect the vault. `verify()` recomputes the hash on every call.
 *
 * **Note:** The stored clone is closure-isolated and unreachable from outside.
 * `verify()` is a defense-in-depth check — it detects internal library bugs
 * or exotic memory corruption, not JS-level external tampering. The `fingerprint`
 * is useful for comparing snapshots across time or serialization boundaries.
 *
 * **Hash scope:** Covers plain objects, arrays, string + Symbol keys.
 * Does NOT cover Map/Set internal data, Date specifics, or circular refs.
 * Symbols with identical descriptions produce identical hash entries (djb2 limitation).
 * This is a non-cryptographic fingerprint, not a security proof.
 *
 * @example
 * const te = tamperEvident({ id: 1, name: 'Alice' });
 * te.verify();        // true
 * te.assertIntact();  // no-op
 * te.fingerprint;     // e.g. "3k9h2m"
 */
export function tamperEvident<T>(value: T): TamperEvidentVault<T> {
  const stored = deepClone(value);
  const fingerprint = hashString(stableStringify(stored));

  const get = (): DeepReadonly<T> => {
    const copy = deepClone(stored);
    if (isFreezable(copy)) freezeDeep(copy as object);
    return copy as DeepReadonly<T>;
  };

  const verify = (): boolean =>
    hashString(stableStringify(stored)) === fingerprint;

  const assertIntact = (): void => {
    if (!verify()) {
      throw new TypeError('TamperEvidentVault: integrity check failed — fingerprint mismatch');
    }
  };

  return _freeze({ get, verify, assertIntact, fingerprint });
}
