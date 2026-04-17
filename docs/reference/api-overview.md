---
title: API Overview
description: Indexed reference for all 17 public constancy exports — find any API in 30 seconds.
lastReviewed: 2026-04-17
sourceLocale: en
translationStatus: synced
---

# API Overview

17 public exports across 5 mental models. Every entry links to the dedicated page with full guarantees, limitations, and examples.

---

## Freeze

In-place freeze — same reference, no clone. Cheapest form of immutability.

### `freezeShallow`

Freezes only top-level properties with native `Object.freeze`. Nested objects remain mutable.

```typescript
function freezeShallow<T>(val: T): T extends object ? Readonly<T> : T
```

[→ freezeShallow](/freeze/freeze-shallow)

---

### `deepFreeze`

Recursively freezes all nested objects. Handles circular refs, Symbol keys, and TypedArrays safely. Cached builtins survive post-import `Object.freeze` override (F1 fix: `freezePrototypeChain` opt-in).

```typescript
function deepFreeze<T>(val: T, options?: DeepFreezeOptions): T extends object ? DeepReadonly<T> : T

interface DeepFreezeOptions {
  freezePrototypeChain?: boolean  // default: false
}
```

[→ deepFreeze](/freeze/deep-freeze)

---

## View

Proxy-based read-only wrapper. No clone. Original remains mutable if retained (V8).

### `immutableView`

Wraps any object in a Proxy. Every mutation attempt throws `TypeError`. Handles Map, Set, WeakMap, WeakSet, Date, Array mutators. `blockToJSON` option (V5 fix) prevents `JSON.stringify(view)` from invoking target's `toJSON()`.

```typescript
function immutableView<T extends object>(obj: T, options?: ImmutableViewOptions): T

interface ImmutableViewOptions {
  blockToJSON?: boolean  // default: false
}
```

[→ immutableView](/view/immutable-view)

---

### `isImmutableView`

Returns `true` if the value is an immutable proxy created by `immutableView`. Uses an unforgeable WeakSet check.

```typescript
function isImmutableView(val: unknown): boolean
```

[→ isImmutableView](/verification/is-immutable-view)

---

### `assertImmutableView`

Throws `TypeError` if the value is not an immutable proxy.

```typescript
function assertImmutableView<T>(val: T): asserts val is T
```

[→ assertImmutableView](/verification/assert-immutable-view)

---

### `immutableMapView`

Wraps a `Map` in a defensive copy + Proxy. All mutator methods (`set`, `delete`, `clear`) throw. Read methods work normally.

```typescript
function immutableMapView<K, V>(map: Map<K, V>): ReadonlyMap<K, V>
```

[→ immutableMapView](/view/immutable-map-view)

---

### `immutableSetView`

Wraps a `Set` in a defensive copy + Proxy. All mutator methods (`add`, `delete`, `clear`) throw.

```typescript
function immutableSetView<T>(set: Set<T>): ReadonlySet<T>
```

[→ immutableSetView](/view/immutable-set-view)

---

## Snapshot

Clone + freeze. True data immutability — original is unaffected, reference is severed.

### `snapshot`

Deep-clones the value with `structuredClone`, then recursively freezes the clone. Plain object prototypes are severed to null (S1 fix). Non-cloneable values throw (S3).

```typescript
function snapshot<T>(value: T): DeepReadonly<T>
```

[→ snapshot](/snapshot/snapshot)

---

### `lock`

Alias for `snapshot`. Identical behavior. Kept from v2 for readability at call sites.

```typescript
function lock<T>(value: T): DeepReadonly<T>
```

[→ lock](/snapshot/lock)

---

### `secureSnapshot`

Snapshot with null prototype + getter-only non-configurable descriptors. Plain objects only. Throws on accessor properties (X1 fix) and non-plain nested values.

```typescript
function secureSnapshot<T extends Record<string, unknown>>(obj: T): DeepReadonly<T>
```

[→ secureSnapshot](/snapshot/secure-snapshot)

---

### `tamperEvident`

Stores value in vault closure + computes 64-bit structural hash (djb2+sdbm). Reaches into Map/Set/Date/RegExp internal slots (T2/T3/T4 fix). Hash is NOT cryptographic — detects bugs, not adversarial attacks.

```typescript
function tamperEvident<T>(val: T): TamperEvidentVault<T>

interface TamperEvidentVault<T> {
  readonly get: () => DeepReadonly<T>
  readonly verify: () => boolean
  readonly assertIntact: () => void
  readonly fingerprint: string
}
```

[→ tamperEvident](/snapshot/tamper-evident)

---

## Isolation

Closure isolation + copy-on-read. Reference extraction is impossible.

### `vault`

Seals value in a closure. Each `.get()` call returns a fresh frozen copy via `structuredClone`. Caller can mutate the copy; vault state is unchanged. Reference identity is never exposed.

```typescript
function vault<T>(val: T): Vault<T>

interface Vault<T> {
  readonly get: () => DeepReadonly<T>
}
```

[→ vault](/isolation/vault)

---

## Verification

Runtime checks — no mutation, no side effects.

### `isDeepFrozen`

Returns `true` if the value and all nested values are frozen. Returns `false` if any accessor descriptor is present (F4/I1 fix — accessor may return mutable object).

```typescript
function isDeepFrozen<T>(val: T): boolean
```

[→ isDeepFrozen](/verification/is-deep-frozen)

---

### `assertDeepFrozen`

Throws `TypeError` if the value is not deeply frozen.

```typescript
function assertDeepFrozen<T>(val: T): asserts val is DeepReadonly<T>
```

[→ assertDeepFrozen](/verification/assert-deep-frozen)

---

### `checkRuntimeIntegrity`

Verifies that 17 builtins constancy depends on still match the references captured at module load time. Also checks `Object.prototype` key-set fingerprint (I2/I5 fix). Returns an `IntegrityResult`. Call at app startup; cannot detect pre-import poisoning.

```typescript
function checkRuntimeIntegrity(): IntegrityResult

interface IntegrityResult {
  intact: boolean
  compromised: string[]  // names of altered builtins
}
```

[→ checkRuntimeIntegrity](/verification/check-runtime-integrity)

---

## Type Exports

| Type | Description |
|------|-------------|
| `DeepReadonly<T>` | Recursively marks all properties as `readonly`. Handles objects, arrays, Maps, Sets. |
| `ImmutableViewOptions` | Options for `immutableView` — `{ blockToJSON?: boolean }` |
| `DeepFreezeOptions` | Options for `deepFreeze` — `{ freezePrototypeChain?: boolean }` |
| `TamperEvidentVault<T>` | Return type of `tamperEvident` — `{ get, verify, assertIntact, fingerprint }` |
| `Vault<T>` | Return type of `vault` — `{ get: () => DeepReadonly<T> }` |
| `IntegrityResult` | Return type of `checkRuntimeIntegrity` — `{ intact, compromised }` |
| `Freezable` | Union: `object \| Function` — types that `Object.freeze` accepts |
