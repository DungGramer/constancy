import { _freeze, _ownKeys, _getOwnPropertyDescriptor, _defineProperty, _create } from './cached-builtins';

/** Returns true for types whose data lives in internal slots, not own properties. */
function isNonPlainObject(value: object): boolean {
  return Array.isArray(value) || value instanceof Map || value instanceof Set
    || value instanceof Date || value instanceof RegExp
    || value instanceof WeakMap || value instanceof WeakSet
    || ArrayBuffer.isView(value);
}

/** Recursively secure a nested value, wrapping TypeError with property context. */
function secureNestedValue(key: string | symbol, raw: unknown): unknown {
  if (raw === null || typeof raw !== 'object') return raw;
  try {
    return secureSnapshot(raw as Record<string, unknown>);
  } catch (err) {
    if (err instanceof TypeError) {
      throw new TypeError(
        `secureSnapshot(): property "${String(key)}" contains a ${raw.constructor?.name ?? 'non-plain object'}. ` +
        `secureSnapshot() only supports plain objects. Nested Date, Map, Set, Array, etc. are not supported.`
      );
    }
    throw err;
  }
}

/**
 * Create a maximally-hardened immutable view of `value`.
 *
 * Three layers of protection are applied simultaneously:
 * - **Null prototype** — the target object has no prototype chain, so
 *   `Object.prototype` pollution (e.g. `__proto__`, `toString` attacks)
 *   cannot reach it.
 * - **Getter-only descriptors** — no `value` field is ever written to the
 *   target; every property is exposed only through a `get` accessor backed
 *   by a closure `Map`, so callers cannot intercept or replace the stored
 *   value through normal property assignment.
 * - **`configurable: false`** — the getter cannot be redefined even with
 *   `Object.defineProperty`, making the shape of the object truly permanent.
 *
 * Nested objects are recursively secured. Accessor descriptors (get/set)
 * on the source object are skipped to avoid side effects during construction.
 *
 * **Supported types:** Plain objects only. Throws TypeError for Map, Set,
 * Date, RegExp, Array, TypedArray, and class instances — these types store
 * data in internal slots or indexed properties that cannot be faithfully
 * represented as getter-only descriptors.
 *
 * @param value - Plain object to secure. Throws for non-plain objects.
 * @returns A `Readonly<T>` proxy-free secured copy.
 *
 * @example
 * const cfg = secureSnapshot({ db: { host: 'localhost', port: 5432 } });
 * cfg.db.host;          // 'localhost'
 * cfg.db.host = 'x';   // TypeError (strict) — getter only
 * Object.defineProperty(cfg, 'db', { value: null }); // TypeError — non-configurable
 */
export function secureSnapshot<T extends Record<string, unknown>>(value: T): Readonly<T> {
  if (isNonPlainObject(value)) {
    throw new TypeError('secureSnapshot() only supports plain objects. Use snapshot() or vault() for other types.');
  }
  // Null-prototype object — immune to Object.prototype pollution
  const target = _create(null) as T;
  const store = new Map<string | symbol, unknown>();

  for (const key of _ownKeys(value)) {
    const desc = _getOwnPropertyDescriptor(value, key);
    if (!desc) continue;
    // Explicit error on accessor properties — silent drop was a data-loss
    // surface (audit X1). Caller must convert to plain data before securing.
    if (!('value' in desc)) {
      throw new TypeError(
        `secureSnapshot(): accessor property "${String(key)}" is not supported. ` +
        `Invoke the getter yourself and pass the resolved value as a plain data property.`
      );
    }

    store.set(key, secureNestedValue(key, desc.value));

    _defineProperty(target, key, {
      get: () => store.get(key),
      enumerable: desc.enumerable ?? true,
      configurable: false,   // PERMANENT — cannot be redefined
    });
  }

  return _freeze(target);
}
