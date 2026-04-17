---
title: snapshot
description: Deep clone + deep freeze a value into a fully immutable snapshot. Severs the original reference and nullifies plain-object prototypes.
lastReviewed: 2026-04-17
sourceLocale: en
translationStatus: synced
---

# snapshot

## What it does

`snapshot` produces an immutable deep copy of any cloneable value by performing two operations in sequence:

1. **Deep clone** via `structuredClone` (cached as `_structuredClone`). The clone is entirely independent of the original; subsequent mutations to the source object have no effect on the snapshot.
2. **Deep freeze** via `freezeDeep`. Every reachable node in the cloned graph is recursively frozen with `Object.freeze`, making any write attempt throw a `TypeError` in strict mode.

After cloning, `snapshot` walks the cloned graph and calls `Object.setPrototypeOf(node, null)` on every node whose prototype is exactly `Object.prototype`. This severs the inherited `Object.prototype` chain on plain objects, blocking prototype-pollution leakage from a polluted `Object.prototype` into the snapshot output (S1). Built-in types (`Array`, `Date`, `Map`, `Set`, `RegExp`, `TypedArray`) are left intact so their native methods continue to work.

Primitives (`string`, `number`, `boolean`, `bigint`, `symbol`, `null`, `undefined`) are returned unchanged without any cloning or freezing.

## When to use

- You need a safe copy of mutable state that must not change — e.g. saving the previous state before a mutation, caching an initial config object.
- You want to hand off an object to untrusted code and guarantee it cannot modify the original or the copy.
- You need both independence from the source (unlike `deepFreeze`) and full deep immutability (unlike `immutableView`).
- Sharing derived read-only state between modules without worrying about concurrent writes.

## When not to use

- The value contains non-cloneable data: functions, `Symbol` values used as property values, DOM nodes, or other host objects — `structuredClone` will throw a `TypeError`. Use [`immutableView`](/view/immutable-view) for objects with non-cloneable properties.
- You need immutability without allocating a new copy — use [`deepFreeze`](/freeze/deep-freeze) to freeze in place, or [`immutableView`](/view/immutable-view) for a zero-copy proxy.
- You need the output reference to be the same object (identity equality) — `snapshot` always returns a new reference.
- You need plain-object-only hardening with null-prototype + non-configurable getter descriptors — use [`secureSnapshot`](/snapshot/secure-snapshot) instead.

## Guarantees

- The returned value is a structurally independent copy; mutations to the original are not reflected in the snapshot and vice versa.
- Every reachable node in the snapshot is frozen: `Object.isFrozen(snap.nested)` returns `true` at every depth.
- Both string-keyed and Symbol-keyed own properties are traversed during the freeze pass.
- Plain-object nodes have their prototype severed to `null`, preventing `Object.prototype` pollution from leaking into the snapshot (S1).
- Built-in types (`Array`, `Date`, `Map`, `Set`, `RegExp`, `TypedArray`) retain their prototype and native methods.
- Circular references are handled correctly by `structuredClone` (no stack overflow); the WeakSet guard in `freezeDeep` prevents revisiting during the freeze pass.
- `snapshot` is an alias for [`lock`](/snapshot/lock); both are identical at runtime.

## Limitations

- **Non-cloneable values throw (S3).** `structuredClone` throws a `DataCloneError` (re-thrown as `TypeError`) for functions, `Symbol` property values, DOM nodes, and other non-serializable host objects. There is no silent fallback — the entire call fails.
- **Map/Set internal slots are not blocked (F2).** After freezing, the Map/Set object shell is frozen, but `[[MapData]]`/`[[SetData]]` internal slots are unaffected — `.set()`, `.add()`, `.delete()` still work on a frozen `Map`/`Set`. Use [`immutableMapView`](/view/immutable-map-view) or [`immutableSetView`](/view/immutable-set-view) for full collection immutability.
- **Date, RegExp, and TypedArray prototypes are preserved (S4, documented).** Because built-in prototypes are not severed, post-snapshot poisoning of `Date.prototype.getTime` (or similar) can affect the snapshot's built-in methods. Plain-object nodes are protected via null-prototype; built-in instances are not.
- **Identity is not preserved.** `snapshot(x) !== x` always. Code that relies on reference equality (e.g. React `memo`, `WeakMap` keyed on the original) will not match the snapshot.
- **TypedArray byte data is not deeply immutable (F3).** `deepFreeze` skips non-empty TypedArrays to avoid the runtime `TypeError` that `Object.freeze` would throw. Byte-level writes to a frozen TypedArray's underlying buffer remain possible.

## Example

**Basic usage — protect config from mutation:**

```ts
import { snapshot } from 'constancy';

const raw = { db: { host: 'localhost', port: 5432 }, flags: ['beta'] };
const config = snapshot(raw);

// Original can still be mutated
raw.db.port = 9999;

// Snapshot is unaffected
console.log(config.db.port);   // 5432

// Writes to the snapshot throw
config.db.port = 1234;         // TypeError: Cannot assign to read only property
config.flags.push('prod');     // TypeError: Cannot add property 3, object is not extensible
```

**Null-prototype severance (S1):**

```ts
// Attacker pollutes Object.prototype
(Object.prototype as any).pwned = 'INJECTED';

const snap = snapshot({ safe: true }) as Record<string, unknown>;

console.log(snap.pwned);                // undefined — prototype was severed
console.log(Object.getPrototypeOf(snap)); // null
```

**Built-in types preserve their prototypes:**

```ts
const snap = snapshot({
  now: new Date(),
  ids: new Set([1, 2, 3]),
  lookup: new Map([['a', 1]]),
});

snap.now instanceof Date;    // true — Date methods still work
snap.ids instanceof Set;     // true
snap.lookup instanceof Map;  // true
```

**Non-cloneable values throw:**

```ts
snapshot({ fn: () => 'hello' }); // TypeError: value contains non-cloneable data
snapshot({ sym: Symbol('id') }); // TypeError: value contains non-cloneable data
```

## Comparison with related APIs

| | `deepFreeze` | `snapshot` / `lock` | `immutableView` | `secureSnapshot` |
|---|---|---|---|---|
| **Allocates a new copy?** | No (mutates in place) | Yes (deep clone) | No (Proxy wrap) | Yes (getter-only copy) |
| **Severs original reference?** | No | Yes | No | Yes |
| **Null-prototype on plain objects?** | No | Yes (S1) | No | Yes |
| **Supports Map/Set/Date/Array?** | Yes | Yes | Yes | No — throws |
| **Non-cloneable values?** | Allowed | Throws | Allowed | Throws (non-plain) |
| **Depth** | Full graph | Full graph | Full graph (Proxy) | Full graph (plain only) |
| **Map/Set slot immutability** | No | No | Yes (Proxy blocks) | N/A |

## Common mistakes

- **"I need to pass a function inside the object."** `structuredClone` cannot clone functions. Strip the function before calling `snapshot`, or use `immutableView` which does not clone.
- **"I froze the snapshot's Map but `.set()` still works."** Map/Set internal slots are not reached by `Object.freeze`. The object shell is frozen (no new own props), but the slot data is not. Use `immutableMapView(map)` to proxy-block the mutator methods.
- **"I thought the snapshot would stay in sync with the original."** `snapshot` severs the reference — it is a point-in-time copy. Mutations to the original after snapshotting are not reflected. This is the intended behavior.
- **"I compared the snapshot with `===` and it failed."** `snapshot` always returns a new reference. Use a deep-equality check (e.g. `JSON.stringify`) or compare property values explicitly.

## Type signature

```ts
function snapshot<T>(value: T): DeepReadonly<T>

/** Alias — identical at runtime */
const lock: typeof snapshot;
```

`DeepReadonly<T>` recursively marks every nested property as `readonly` in the TypeScript type system, mirroring the runtime freeze. Primitives pass through as `T` unchanged.

## See also

- [`lock`](/snapshot/lock) — alias of `snapshot` kept for backward compatibility
- [`deepFreeze`](/freeze/deep-freeze) — freeze in place without cloning (no new reference)
- [`immutableView`](/view/immutable-view) — zero-copy Proxy-based read-only wrapper
- [`secureSnapshot`](/snapshot/secure-snapshot) — plain-object-only hardening with getter-only descriptors
- [`tamperEvident`](/snapshot/tamper-evident) — snapshot with structural fingerprint verification
- [`vault`](/isolation/vault) — closure-isolated deep clone with `.get()` access
