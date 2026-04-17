---
title: tamperEvident
description: Seals a value inside a vault with a 64-bit structural fingerprint for detecting accidental mutation or library bugs. NOT a cryptographic integrity tool.
lastReviewed: 2026-04-17
sourceLocale: en
translationStatus: synced
---

# tamperEvident

## What it does

`tamperEvident` seals a value inside a frozen vault object that holds an independent deep clone and a structural fingerprint. The vault exposes three members:

- **`.get()`** — returns a new frozen deep copy of the stored value on each call.
- **`.verify()`** — recomputes the fingerprint from the stored clone and compares it to the original; returns `true` if they match.
- **`.assertIntact()`** — throws `TypeError` with a descriptive message if `verify()` returns `false`.
- **`.fingerprint`** — the original fingerprint string (base-36 encoded, 14 characters).

The fingerprint is computed by `stableStringify`, a deterministic serializer that sorts own keys lexicographically (string keys and Symbol keys in separate sections to prevent crafted-key collisions), then passes the resulting string through a **64-bit non-cryptographic hash** built from two independent 32-bit algorithms: djb2 (shift+add) and sdbm (multiply+xor). Concatenating both halves widens the birthday bound from approximately 2^16 (djb2 alone) to approximately 2^32 collision attempts before a match is expected (T1).

**Internal slot awareness.** `stableStringify` reaches into the internal data of built-in types rather than relying on own-property enumeration, which would produce the same fingerprint for all empty Maps/Sets and for all Date instances (T2/T3/T4):
- `Map` — entries are extracted via `.entries()`, keys are stringified and sorted, then serialized as `Map{key:value,...}`.
- `Set` — values are extracted via `.values()`, stringified and sorted, serialized as `Set{value,...}`.
- `Date` — serialized as `Date(<milliseconds>)` using `.getTime()`.
- `RegExp` — serialized as `RegExp(<source>/<flags>)`.

**Accessor properties are never invoked during fingerprinting (T7).** When `stableStringify` encounters a property with an accessor descriptor (getter/setter), it emits the literal string `"[Accessor]"` instead of calling the getter. This prevents side effects and ensures that `verify()` is deterministic even for objects whose getters are time-based or stateful.

The vault itself is sealed with `Object.freeze`. The stored clone is also frozen for defense in depth. Mutations to the original object after vault construction do not affect the stored clone.

## When to use

- Detecting **accidental mutation** of a stored value caused by library bugs or unexpected code paths — e.g. confirming that a cached object was not modified between two checkpoints.
- Comparing the structural identity of two snapshots taken at different times or across serialization boundaries using `.fingerprint`.
- Defense-in-depth assertions in test suites: `vault.assertIntact()` as a precondition before using a value that should be immutable.
- Detecting internal corruption of an in-memory data structure — the kind of bug that is hard to reproduce but easy to assert.

## When not to use

- **Do not use as a security or authentication mechanism.** The fingerprint is a non-cryptographic hash. A motivated attacker can construct a different value that produces the same fingerprint. There is no secret key, no signing, no replay protection, and no cryptographic guarantee.
- Protecting against adversarial tampering by an attacker who controls input data — use an HMAC from `node:crypto` instead.
- Scenarios where you need a message authentication code (MAC) or digital signature.
- Detecting tampering with data that crosses a trust boundary (network, disk, user input).

## Guarantees

- The vault is frozen: attempts to modify `.fingerprint`, `.verify`, `.get`, or `.assertIntact` throw `TypeError`.
- The stored clone is independent of the original: mutations to the source after construction are not reflected in `.get()` output or `verify()` results.
- `.get()` returns a frozen deep copy each time — callers cannot mutate the value retrieved from the vault.
- `.fingerprint` is deterministic: identical values produce identical fingerprints regardless of key insertion order (keys are sorted before hashing).
- Map/Set/Date/RegExp internal data contributes to the fingerprint; empty and non-empty containers of the same type produce different fingerprints (T2/T3/T4 fixes).
- Accessor descriptors on stored objects are represented as `"[Accessor]"` in the fingerprint, not invoked; `verify()` is safe to call on objects with side-effectful getters (T7 fix).
- Symbol keys are included in the fingerprint, serialized in a structurally separate section so a crafted string key cannot collide with a symbol key.

## Limitations

**This is a development-integrity tool, not a cryptographic primitive.**

- **No secret key, no signing, no cryptographic guarantee (T1).** The 64-bit djb2+sdbm hash has a birthday bound of approximately 2^32 — sufficient to catch accidental bugs, not sufficient to resist a motivated attacker. For adversarial tamper detection, use `node:crypto` HMAC.
- **No replay protection.** The fingerprint does not include a timestamp or nonce. A recorded fingerprint can be replayed.
- **Symbols with identical descriptions produce identical hash entries (T5, documented bypass).** `Symbol('id') !== Symbol('id')` at runtime, but both serialize to `"Symbol(id)"` in `stableStringify`. Two vaults whose only difference is different symbol objects with the same description produce the same fingerprint.
- **Circular references are represented as `"[Circular]"` (T9, documented limitation).** Structurally different cycle shapes that serialize identically can produce a fingerprint collision. Circular structures are not common in practice but are a documented edge case.
- **Sparse array holes and explicit `undefined` values produce different fingerprints** (intentional, current behavior locked in by regression tests). `Array(3)` (holes) and `[undefined, undefined, undefined]` (explicit values) hash differently.
- **`structuredClone` is used for the initial clone.** Non-cloneable values (functions, Symbol property values, DOM nodes) throw `TypeError` at construction time.

## Example

**Basic usage — detect accidental mutation between checkpoints:**

```ts
import { tamperEvident } from 'constancy';

const config = { db: { host: 'localhost', port: 5432 } };
const vault = tamperEvident(config);

// ... code runs ...

vault.verify();      // true — no corruption
vault.assertIntact(); // no-op

// Get a frozen copy to read:
const snapshot = vault.get();
snapshot.db.host;    // 'localhost'
snapshot.db.host = 'hack'; // TypeError — frozen
```

**Mutation of original does not affect vault:**

```ts
const original = { isVip: false };
const vault = tamperEvident(original);

original.isVip = true; // mutate original

vault.get().isVip; // false — vault holds independent clone
vault.verify();    // true
```

**Fingerprint comparison across time:**

```ts
const a = tamperEvident({ x: 1, y: 2 });
const b = tamperEvident({ y: 2, x: 1 }); // different key order

a.fingerprint === b.fingerprint; // true — keys sorted before hashing
```

**Map/Set fingerprinting — no empty-collection collision (T2/T3/T4):**

```ts
const emptyMap = tamperEvident(new Map());
const filledMap = tamperEvident(new Map([['key', 'value']]));

emptyMap.fingerprint === filledMap.fingerprint; // false — internal slot read
```

**Asserting integrity as a precondition:**

```ts
function processConfig(vault: ReturnType<typeof tamperEvident>) {
  vault.assertIntact(); // throws if something corrupted the stored clone
  const cfg = vault.get();
  // ... use cfg safely
}
```

**Accessor properties are not invoked during verify (T7):**

```ts
let sideEffectCount = 0;
const obj = Object.defineProperty({}, 'tick', {
  get() { sideEffectCount++; return sideEffectCount; },
  enumerable: true,
  configurable: false,
});

const vault = tamperEvident(obj);
vault.verify();
vault.verify();

// structuredClone invokes the getter once at construction;
// stableStringify never invokes it during verify()
console.log(sideEffectCount); // 1 — not called again by verify()
```

## Comparison with related APIs

| | `snapshot` | `vault` | `tamperEvident` |
|---|---|---|---|
| **Stores independent copy?** | Yes | Yes | Yes |
| **Fingerprint / verify?** | No | No | Yes |
| **`.get()` returns frozen copy?** | N/A (direct value) | Yes | Yes |
| **Vault is frozen?** | N/A | Yes | Yes |
| **Cryptographic guarantee?** | No | No | No |
| **Circular reference safe?** | Yes | Yes | Partial (`"[Circular]"` placeholder) |
| **Non-cloneable values?** | Throws | Throws | Throws |

## Common mistakes

- **"I used `tamperEvident` to detect adversarial tampering."** The djb2+sdbm hash is not adversarial-safe. An attacker can craft a payload with the same fingerprint. Use `node:crypto` HMAC with a secret key for security-critical tamper detection.
- **"`.verify()` returned `false` — was the data tampered with?"** In a normal JavaScript process, the stored clone is closure-private and frozen. A `false` result most likely indicates a library bug or exotic runtime behavior, not external tampering. Treat it as a bug signal, not an attack signal.
- **"The fingerprint changed after I serialized and deserialized the value."** `fingerprint` is computed from the in-memory structural representation, not from a canonical wire format. Date values, Map key order, and other runtime details must be identical for fingerprints to match.
- **"Two Symbols with the same description hash the same."** This is a documented limitation (T5). If Symbol identity matters for your comparison, supplement the fingerprint with an explicit check.

## Type signature

```ts
interface TamperEvidentVault<T> {
  readonly get: () => DeepReadonly<T>;
  readonly verify: () => boolean;
  readonly assertIntact: () => void;
  readonly fingerprint: string;
}

function tamperEvident<T>(value: T): TamperEvidentVault<T>
```

`DeepReadonly<T>` recursively marks all properties as `readonly`. The vault interface itself is runtime-frozen; all four members are non-writable.

## See also

- [`snapshot`](/snapshot/snapshot) — deep clone + freeze without fingerprinting
- [`vault`](/isolation/vault) — closure-isolated clone with `.get()`, no fingerprint
- [Security Audit — T1](/reference/security-audit#layer-3--tamperevident) — 64-bit fingerprint design rationale
- [Security Audit — T2/T3/T4](/reference/security-audit#layer-3--tamperevident) — Map/Set/Date internal-slot serialization
- [Security Audit — T7](/reference/security-audit#layer-3--tamperevident) — accessor-safe fingerprinting
