---
title: secureSnapshot
description: Maximally-hardened immutable copy of a plain object. Null-prototype + non-configurable getter-only descriptors. Plain objects only — throws for Map, Set, Date, Array, and class instances.
lastReviewed: 2026-04-17
sourceLocale: en
translationStatus: synced
---

# secureSnapshot

## What it does

`secureSnapshot` creates a hardened immutable copy of a plain object by applying three layers of protection simultaneously:

1. **Null prototype.** The output object is created with `Object.create(null)`, so it has no prototype chain. `Object.prototype` pollution (e.g. injected `__proto__`, `toString`, or `hasOwnProperty` overrides) cannot reach it.
2. **Getter-only descriptors.** Each property on the output is defined as a `get`-only accessor backed by a closure-private `Map`. No `value` field is ever written to the output object; the stored value lives entirely inside the closure. Callers cannot intercept or replace the value through property assignment or `Object.defineProperty` with a `value` field.
3. **`configurable: false`.** The accessor descriptor cannot be redefined even with `Object.defineProperty`, making the shape of the object permanent for its lifetime.

Nested plain objects are recursively secured with the same three layers. If a nested property is a non-plain object (Date, Array, Map, Set, class instance, TypedArray), the call throws a `TypeError` that names the offending property.

**Accessor properties (getters/setters) on the source throw (X1).** In pre-v3, accessor-only properties were silently dropped — the output object was missing those keys with no warning, creating a data-loss surface. Starting in v3.0.1, any accessor descriptor on the source object causes an immediate `TypeError` naming the property. Callers must resolve the getter value themselves and pass it as a plain data property.

## When to use

- Startup configuration loaded once that must survive `Object.prototype` pollution and cannot be replaced or reconfigured at runtime.
- Security-sensitive plain data that must resist even `Object.defineProperty` redefinition attempts.
- Any scenario where you need stronger guarantees than `snapshot` provides — `snapshot` uses null-prototype but still exposes `value`-field descriptors which can be read by `Object.getOwnPropertyDescriptor`.
- Signing or sealing a configuration namespace that other code should inspect but never mutate or redefine.

## When not to use

- The object contains `Date`, `Array`, `Map`, `Set`, `RegExp`, `TypedArray`, `WeakMap`, `WeakSet`, or any class instance — `secureSnapshot` throws for all non-plain objects. Use [`snapshot`](/snapshot/snapshot) or [`vault`](/isolation/vault) instead.
- Accessor properties are present on the source — you must resolve the getter manually before calling `secureSnapshot`.
- You need to support Map/Set collections — use [`immutableMapView`](/view/immutable-map-view) or [`immutableSetView`](/view/immutable-set-view).
- Performance is critical for large objects — each property is wrapped in a closure; for high-frequency large objects, prefer `snapshot`.

## Guarantees

- The output object has a `null` prototype — inherited properties from `Object.prototype` are not visible, even if `Object.prototype` was polluted before or after the call (X1 regression).
- Every property is exposed only through a non-configurable `get` accessor; `configurable: false` prevents redefinition via `Object.defineProperty`.
- Assignment in strict mode throws `TypeError` (getter-only, no setter).
- `Reflect.set(obj, key, val)` returns `false` and the value is unchanged.
- Nested plain objects are recursively secured with the same guarantees.
- The output object itself is passed through `Object.freeze`, making it non-extensible.
- `JSON.stringify` and `Object.keys` work correctly (enumerable getters are serialized through their return values).

## Limitations

- **Plain objects only.** `secureSnapshot` throws `TypeError` for any value whose type is not a plain object: `Array`, `Date`, `Map`, `Set`, `RegExp`, `WeakMap`, `WeakSet`, `ArrayBuffer` views, and all class instances. The error message names the non-plain type.
- **Nested non-plain objects abort the entire call (X2).** If any nested property value is non-plain, the whole call throws. This is an all-or-nothing operation.
- **Accessor properties throw (X1 — migration note).** Pre-v3, accessor properties were silently dropped. Starting in v3.0.1, they throw `TypeError`. If you have code that relied on the silent-drop behavior, you must update it: invoke the getter yourself and pass the resolved plain value. Example migration:

  ```ts
  // Before (v2 — accessor silently dropped):
  const cfg = secureSnapshot({ get host() { return 'localhost'; } });
  // cfg.host was undefined — silent data loss

  // After (v3.0.1 — throws):
  // Either invoke the getter first:
  const cfg = secureSnapshot({ host: getHost() });
  // Or restructure the source to use plain data properties.
  ```

- **Symbol keys with no description produce a less informative error.** Symbols without a description serialize as `"Symbol()"` in error messages; the key is still preserved correctly in the output.
- **No support for circular references.** Unlike `snapshot`, `secureSnapshot` does not handle circular references — a circular plain-object graph will overflow the call stack.

## Example

**Basic usage — hardened config object:**

```ts
import { secureSnapshot } from 'constancy';

const cfg = secureSnapshot({
  db: { host: 'localhost', port: 5432 },
  feature: { beta: false },
});

cfg.db.host;          // 'localhost'
cfg.db.host = 'hack'; // TypeError — getter only, no setter

Object.defineProperty(cfg, 'db', { value: null });
// TypeError — configurable: false, cannot redefine

Object.getPrototypeOf(cfg); // null — prototype chain severed
```

**Prototype pollution resistance:**

```ts
(Object.prototype as any).injected = 'BAD';

const cfg = secureSnapshot({ role: 'user' }) as Record<string, unknown>;
cfg.injected; // undefined — null prototype, chain lookup stops
```

**Accessor property throws (X1 — migration required):**

```ts
const input = {
  get apiKey(): string { return process.env.API_KEY ?? ''; },
  timeout: 5000,
};

// This throws in v3.0.1:
secureSnapshot(input);
// TypeError: secureSnapshot(): accessor property "apiKey" is not supported.
// Invoke the getter yourself and pass the resolved value as a plain data property.

// Fix — resolve the value before securing:
const cfg = secureSnapshot({
  apiKey: input.apiKey,  // invoke getter once
  timeout: input.timeout,
});
```

**Nested non-plain type throws:**

```ts
secureSnapshot({ createdAt: new Date() });
// TypeError: secureSnapshot(): property "createdAt" contains a Date.
// secureSnapshot() only supports plain objects.
```

## Comparison with related APIs

| | `snapshot` | `secureSnapshot` | `deepFreeze` | `immutableView` |
|---|---|---|---|---|
| **Null prototype on plain objects?** | Yes (S1) | Yes | No | No |
| **Non-configurable descriptors?** | No (`value` field) | Yes (getter-only) | No | No (Proxy) |
| **Getter-only (no value field)?** | No | Yes | No | No |
| **Supports Map/Set/Date/Array?** | Yes | No — throws | Yes | Yes |
| **Accessor properties on source?** | Passed through clone | Throws (X1) | Preserved | Passed through |
| **Circular reference safe?** | Yes | No | Yes | Yes |

## Common mistakes

- **"I passed a Date inside the plain object and it threw."** `secureSnapshot` only accepts plain objects recursively. Flatten the date to a timestamp (`date.getTime()`) or an ISO string before securing.
- **"My pre-v3 code stopped working — accessor was silently dropped before."** See the migration note in Limitations above. Invoke the getter before passing the value.
- **"`JSON.stringify` gives wrong values."** Values are exposed through `get` accessors. `JSON.stringify` calls the getter for each enumerable property — this is correct. Ensure the getter returns a JSON-serializable value.
- **"I can't check `obj instanceof Something`."** The null-prototype output has no prototype chain, so `instanceof` always returns `false`. Use property inspection (`'key' in obj`) instead.

## Type signature

```ts
function secureSnapshot<T extends Record<string, unknown>>(value: T): Readonly<T>
```

The input type is constrained to `Record<string, unknown>` (plain object shape). The return type is `Readonly<T>`, which marks all top-level properties as `readonly` in TypeScript. Nested property mutability is enforced at runtime by the non-configurable getter descriptors, not by the TypeScript type (use `DeepReadonly<T>` manually if needed in the type system).

## See also

- [`snapshot`](/snapshot/snapshot) — deep clone + freeze; supports all cloneable types
- [`deepFreeze`](/freeze/deep-freeze) — freeze in place; supports all object types
- [`immutableView`](/view/immutable-view) — Proxy-based read-only wrapper; supports all types
- [`vault`](/isolation/vault) — closure-isolated deep clone with `.get()` accessor
- [Security Audit — X1](/reference/security-audit#layer-25--securesnapshot) — accessor silent-drop fix detail
- [Migration guide — v2 → v3](/migration/from-v2-to-v3) — secureSnapshot accessor behavior change
