---
title: Choose between snapshot and vault
description: Both give you an immutable deep copy — pick based on whether reference escape and per-access cost matter.
lastReviewed: 2026-04-17
sourceLocale: en
translationStatus: synced
---

# Choose between snapshot and vault

## The problem

You have sensitive data — an auth token object, a user profile, a license payload — and need it to be immutable. Both `snapshot` and `vault` produce a deep-frozen, structurally independent copy. The APIs look similar and both prevent callers from mutating the data, so it is not obvious which to reach for.

## Requirements

- Writes to the returned value must throw.
- The stored data must be independent of the original — mutations to the source after wrapping must not affect the copy.
- Choice may also depend on: whether callers can hold a stable reference, and whether the value is read once or repeatedly.

## Approach

The key distinction is **reference escape** and **per-access cost**:

- `snapshot` clones once and returns a single frozen object. Every caller that receives the result holds the _same_ frozen reference. One clone, zero marginal cost per subsequent read.
- `vault` never hands out a stable reference. Every `.get()` call returns a _fresh_ frozen clone. A caller who retains one result cannot influence the next read from the vault. Cost is O(n) per `.get()` call (U2).

Use this matrix to decide:

| Scenario | Recommendation |
|---|---|
| Reference escape is acceptable | `snapshot` |
| Reference escape must be impossible | `vault` |
| Hot path, single read | `snapshot` |
| Per-request isolation needed | `vault` |
| Callers may cache the reference | `snapshot` is fine |
| Untrusted code receives the result | `vault` (fresh copy each time) |

## Implementation

```ts
import { snapshot, vault } from 'constancy';

const raw = { token: 'secret-abc', role: 'admin', expiresAt: 1900000000 };

// --- snapshot: one clone, stable reference ---
const snapped = snapshot(raw);
snapped.role = 'hack'; // TypeError — frozen

// All callers share the same frozen object:
const ref1 = snapped;
const ref2 = snapped;
console.log(ref1 === ref2); // true — same reference

// --- vault: fresh copy per .get(), no stable reference ---
const v = vault(raw);
const copy1 = v.get();
const copy2 = v.get();
console.log(copy1 === copy2); // false — new frozen copy each time
copy1.role = 'hack';          // TypeError — frozen
v.get().role;                 // 'admin' — vault is pristine
```

## Tradeoffs

- `vault.get()` is O(n) on every call — full deep clone + freeze of the stored graph (U2). Do not call it in a tight loop. Cache the result for the duration of a single operation if n is non-trivial.
- `snapshot` returns a stable reference. If you hand it to a `WeakMap`, pass it as a React prop, or compare it with `===`, you always get the same object. `vault` results are never `===`-equal across calls.
- Neither API supports non-cloneable values: functions, Symbols, DOM nodes throw `TypeError` at construction/call time.
- Neither API blocks `Map`/`Set` internal slot mutators. If the stored value contains a `Map`, `.set()` still works on the returned copy. Wrap with `immutableMapView` / `immutableSetView` before snapshotting if full collection immutability is required.

## Alternatives considered

- **`secureSnapshot`** — stronger descriptor hardening (getter-only, non-configurable) than `snapshot`. Recommended for plain configs where `Object.getOwnPropertyDescriptor` access is a threat. Rejected here as a general alternative because it throws for any non-plain value (Date, Array, class instances), making it unsuitable for heterogeneous data like auth token objects.
- **`immutableView`** — O(1) wrap, no clone. Does not sever the reference (V8). An attacker or bug that retains the original source can still mutate through it. Not a substitute when reference severance is required.

## Related APIs

- [`snapshot`](/snapshot/snapshot)
- [`vault`](/isolation/vault)
- [`secureSnapshot`](/snapshot/secure-snapshot)
- [`tamperEvident`](/snapshot/tamper-evident)
