---
title: vault
description: Closure-isolated container — severs the original reference at construction and returns a fresh frozen copy on every .get() call. No mutable reference to the stored value is ever exposed.
lastReviewed: 2026-04-17
sourceLocale: en
translationStatus: synced
---

# vault

## What it does

`vault` wraps `value` inside a closure and immediately discards the caller's reference. At construction it produces a deep-frozen clone (`frozenCopy`) and stores it privately. Every call to `.get()` clones and deep-freezes that stored copy again, returning a brand-new frozen object. Because the stored value is never handed out directly, and every returned copy is itself frozen, callers cannot mutate the vault's contents regardless of what they do with the result. The vault object itself is also `Object.freeze`d — its `get` property cannot be swapped out (U regression).

## When to use

- Storing secret tokens, API keys, or auth state that must remain pristine across the lifetime of a request.
- Any value that must be shared with untrusted code where reference escape — and therefore later mutation — would be a security boundary violation.
- Per-request immutable views: create a `vault` once from validated input, distribute `.get()` results freely, rely on copy-on-read to guarantee each consumer gets an identical but independent snapshot.
- Scenarios where you need to prove that a retained reference cannot affect future reads from the same store.

## When not to use

- Hot paths: `.get()` performs a full deep clone and freeze on every call — O(n) in the size of the stored graph. Tight loops or high-frequency polling will cause measurable heap churn (U2).
- Values that need to be updated: `vault` is deliberately immutable. To "update", discard the old vault and construct a new one.
- `Map` or `Set` values where collection-slot immutability is required: `Object.freeze` cannot reach `[[MapData]]`/`[[SetData]]` internal slots. Use [`immutableMapView`](/view/immutable-map-view) or [`immutableSetView`](/view/immutable-set-view) for collection immutability.
- Non-cloneable payloads (functions, Symbols, DOM nodes): construction throws `TypeError` (U1). If you need to guard against hostile input, wrap the `vault(...)` call in a try/catch.

## Guarantees

- **Reference severance at construction.** The original caller reference is replaced by a deep-frozen clone inside the closure. Mutating the original object after calling `vault()` has no effect on `.get()` results.
- **Copy-on-read.** Each `.get()` invocation returns a distinct object (`a !== b`) with the same structural value (`a` deep-equals `b`). A caller holding a previous `.get()` result cannot influence future reads.
- **Immutable returned values.** Every object returned by `.get()` — including all nested objects — is `Object.freeze`d. Strict-mode mutation throws `TypeError`.
- **Tamper-proof accessor.** The vault object itself is frozen. `v.get = fn` throws `TypeError` — the accessor cannot be swapped (U regression).
- **`this`-binding escape closed.** `get` is an arrow function bound to the enclosing closure, not to the vault object. `v.get.call(otherThis)` returns the vault's data, not anything from `otherThis` (U4).

## Limitations

- **O(n) per call (U2).** `deepClone` + `freezeDeep` traverse the entire object graph on every `.get()`. An attacker who can call `.get()` in a loop amplifies CPU and memory usage linearly. Rate-limit or cache the result for the duration of a single operation if this matters.
- **Map/Set internal slots remain mutable.** `deepFreeze` (used internally) freezes the Map/Set object shell but not `[[MapData]]`/`[[SetData]]`. `.set()`, `.add()`, `.delete()`, and `.clear()` still work on returned copies.
- **Functions and Symbols not cloneable (U1).** `structuredClone` rejects them. Passing `{ fn: () => {} }` or `{ s: Symbol('x') }` throws a `TypeError` at vault construction time.
- **No update mechanism.** The vault has no `.set()` or `.update()`. To change the stored value, construct a new `vault`. This is intentional — the point is permanent isolation, not controlled mutability.
- **Prototype chain not frozen.** The frozen copies carry their original `[[Prototype]]`. Prototype-level mutations affect accessor-resolution on returned copies (same limitation as `deepFreeze` without `freezePrototypeChain`).

## Example

**Basic token isolation:**

```ts
import { vault } from 'constancy';

const authVault = vault({ token: 'secret-abc', role: 'admin' });

// Each call produces a new frozen copy
const view1 = authVault.get();
const view2 = authVault.get();
console.log(view1 === view2); // false — different references
console.log(view1.token === view2.token); // true — same value

// Mutations on a copy throw and do not affect vault
(view1 as any).token = 'hacked'; // TypeError (strict mode)
console.log(authVault.get().token); // 'secret-abc' — pristine
```

**Original reference severance:**

```ts
const original = { isVip: false };
const v = vault(original);

original.isVip = true; // mutate after vault construction
console.log(v.get().isVip); // false — vault captured the original value at construction
```

**Nested objects are fully frozen:**

```ts
const v = vault({ user: { name: 'Alice', permissions: ['read'] } });
const copy = v.get();

console.log(Object.isFrozen(copy.user)); // true
copy.user.permissions.push('write');     // TypeError
```

**Primitives pass through unchanged:**

```ts
vault(42).get();   // 42
vault('s').get();  // 's'
vault(null).get(); // null
```

## Comparison with related APIs

| | `snapshot` | `vault` | `immutableView` | `deepFreeze` |
|---|---|---|---|---|
| **Severs original reference?** | Yes | Yes | No | No (freezes in place) |
| **Returns same ref each call?** | N/A (one call) | No — fresh copy each time | Yes — same Proxy | N/A (one call) |
| **Caller can mutate result?** | No (frozen) | No (frozen copy) | No (Proxy blocks) | No (frozen in place) |
| **Reference escape possible?** | Yes — caller holds the ref | No — each call is a new disposable copy | Yes — Proxy is stable ref | Yes — caller holds frozen original |
| **Cost per read** | N/A | O(n) clone + freeze | O(1) | N/A |
| **Suitable for repeated reads?** | No | Only if n is small | Yes | Yes |

The key distinction from `snapshot`: `snapshot` clones once and gives you the frozen result to keep — you own a stable reference. `vault` never gives you a stable reference; every `.get()` produces a fresh copy, so even if an attacker retains one result, the vault's next call is unaffected.

## Common mistakes

- **Calling `.get()` in a loop without caching.** Each call clones the full graph. Cache the result for the duration of a logical operation: `const view = vault.get(); processEverything(view);`.
- **Passing a value containing functions or Symbols.** Construction throws `TypeError` (U1). Screen input before vaulting or use a representation that excludes non-cloneable types.
- **Expecting `.get()` results to be the same object.** `a === b` is always `false` for object values. Use structural equality (`deepEqual`) if you need to compare two snapshots.
- **Trying to update the stored value.** `vault` has no mutation API. Create a new vault: `let v = vault(initial); /* later */ v = vault(updated);`.
- **Using vault for Map/Set and expecting full slot immutability.** The returned copy's Map/Set shell is frozen but internal slots are not. Wrap with `immutableMapView` / `immutableSetView` before vaulting, or store a serializable representation instead.

## Type signature

```ts
export interface Vault<T> {
  readonly get: () => DeepReadonly<T>;
}

function vault<T>(value: T): Vault<T>
```

- `T` — the type of the value to protect. Primitives pass through as-is; objects are deep-cloned and deep-frozen.
- `DeepReadonly<T>` — recursively marks every nested property as `readonly`, preventing TypeScript from accepting mutation at compile time.
- The returned `Vault<T>` object is itself frozen; its `get` property is non-writable and non-configurable.
- Throws `TypeError` if `value` contains non-cloneable types (functions, Symbols, DOM nodes).

## See also

- [`snapshot`](/snapshot/snapshot) — deep clone + freeze, single call, caller retains the resulting reference
- [`deepFreeze`](/freeze/deep-freeze) — freeze in place without cloning; original reference unchanged
- [`immutableView`](/view/immutable-view) — Proxy-based read-only wrapper; no clone, stable reference
- [`immutableMapView`](/view/immutable-map-view) — Proxy-based read-only Map; blocks `.set()`/`.delete()`
- [`immutableSetView`](/view/immutable-set-view) — Proxy-based read-only Set; blocks `.add()`/`.delete()`
- [Security audit — Layer 2](/reference/security-audit#layer-2--vault) — U-series bypass analysis (U1 DoS, U2 amplification, U4 `this`-binding regression)
