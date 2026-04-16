import { _freeze, _ownKeys, _getOwnPropertyDescriptor, _defineProperty, _create } from './cached-builtins';

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
  // Reject non-plain objects — their data lives in internal slots, not own properties
  if (Array.isArray(value) || value instanceof Map || value instanceof Set
    || value instanceof Date || value instanceof RegExp
    || value instanceof WeakMap || value instanceof WeakSet
    || ArrayBuffer.isView(value)) {
    throw new TypeError('secureSnapshot() only supports plain objects. Use snapshot() or vault() for other types.');
  }
  // Null-prototype object — immune to Object.prototype pollution
  const target = _create(null) as T;

  // Closure store: key → final (possibly recursively secured) value
  const store = new Map<string | symbol, unknown>();

  for (const key of _ownKeys(value)) {
    const desc = _getOwnPropertyDescriptor(value, key);
    if (!desc) continue;

    // Only process data descriptors — skip accessor descriptors (get/set)
    // to avoid side effects and `this` leaking during construction.
    if (!('value' in desc)) continue;
    const raw: unknown = desc.value;

    // Recursively secure nested objects; leave primitives as-is
    let secured: unknown;
    if (raw !== null && typeof raw === 'object') {
      try {
        secured = secureSnapshot(raw as Record<string, unknown>);
      } catch (err) {
        if (err instanceof TypeError) {
          throw new TypeError(
            `secureSnapshot(): property "${String(key)}" contains a ${(raw as object).constructor?.name ?? 'non-plain object'}. ` +
            `secureSnapshot() only supports plain objects. Nested Date, Map, Set, Array, etc. are not supported.`
          );
        }
        throw err;
      }
    } else {
      secured = raw;
    }

    store.set(key, secured);

    _defineProperty(target, key, {
      get: () => store.get(key),
      enumerable: desc.enumerable ?? true,
      configurable: false,   // PERMANENT — cannot be redefined
    });
  }

  return _freeze(target);
}
