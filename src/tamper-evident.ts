import type { DeepReadonly } from './types';
import { _freeze, _ownKeys, _jsonStringify } from './cached-builtins';
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

/** Serialize a non-object primitive to a deterministic string. */
function stringifyPrimitive(val: unknown): string {
  if (typeof val === 'number') {
    if (Number.isNaN(val)) return '"NaN"';
    if (!Number.isFinite(val)) return val > 0 ? '"Infinity"' : '"-Infinity"';
  }
  if (val === undefined) return 'undefined';
  return _jsonStringify(val);
}

/** Serialize an object's own keys into structurally separated string|symbol sections. */
function stringifyObjectKeys(obj: Record<string | symbol, unknown>, seen: WeakSet<object>): string {
  const allKeys = _ownKeys(obj);
  const strKeys: string[] = [];
  const symKeys: symbol[] = [];
  for (const k of allKeys) {
    if (typeof k === 'symbol') symKeys.push(k);
    else strKeys.push(String(k));
  }

  strKeys.sort((a, b) => a.localeCompare(b));
  symKeys.sort((a, b) => a.toString().localeCompare(b.toString()));

  const strPairs = strKeys.map(k =>
    _jsonStringify(k) + ':' + stableStringify(obj[k], seen)
  );
  const symPairs = symKeys.map(k =>
    _jsonStringify(k.toString()) + ':' + stableStringify(obj[k], seen)
  );

  // '|' separates the two sections — structural, not a prefix, so no collision
  return '{' + strPairs.join(',') + (symPairs.length ? '|' + symPairs.join(',') : '') + '}';
}

/** Deterministic serialisation: _ownKeys (string + symbol), sorted.
 *  String and symbol keys are serialized in structurally separate sections
 *  (separated by '|') so no crafted string key can collide with a symbol key.
 *
 *  Built-in types with internal slots (Map, Set, Date) are given a dedicated
 *  tagged representation that reaches into the slot data. Without this, every
 *  empty Map/Set and every Date would share the same fingerprint (audit T2/T3/T4). */
function stableStringify(val: unknown, seen: WeakSet<object> = new WeakSet()): string {
  if (val === null || typeof val !== 'object') return stringifyPrimitive(val);

  // Circular reference guard
  if (seen.has(val)) return '"[Circular]"';
  seen.add(val);

  if (Array.isArray(val)) {
    return '[' + val.map(v => stableStringify(v, seen)).join(',') + ']';
  }

  // Tagged serialization for built-in types whose data is in internal slots
  if (val instanceof Date) {
    return 'Date(' + val.getTime() + ')';
  }
  if (val instanceof Map) {
    const entries = Array.from((val as Map<unknown, unknown>).entries())
      .map(([k, v]) => [stableStringify(k, seen), stableStringify(v, seen)] as const);
    entries.sort((a, b) => a[0].localeCompare(b[0]));
    return 'Map{' + entries.map(([k, v]) => k + ':' + v).join(',') + '}';
  }
  if (val instanceof Set) {
    const items = Array.from((val as Set<unknown>).values())
      .map(v => stableStringify(v, seen));
    items.sort((a, b) => a.localeCompare(b));
    return 'Set{' + items.join(',') + '}';
  }
  if (val instanceof RegExp) {
    return 'RegExp(' + val.source + '/' + val.flags + ')';
  }

  return stringifyObjectKeys(val as Record<string | symbol, unknown>, seen);
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
  // Fix #8: freeze stored clone for defense-in-depth
  if (isFreezable(stored)) freezeDeep(stored as object);
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
