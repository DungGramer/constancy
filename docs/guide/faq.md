---
title: FAQ
description: Frequently asked questions about constancy — Object.freeze differences, performance, browser support, migration, and tamperEvident security.
lastReviewed: 2026-04-17
sourceLocale: en
translationStatus: synced
---

# FAQ

## 1. How is this different from `Object.freeze`?

`Object.freeze` is shallow — nested objects remain mutable. Constancy's `deepFreeze` recurses through the entire object graph, handles Symbol keys, circular references, and TypedArrays safely. Beyond that, constancy adds Proxy-based views, structural cloning, closure isolation, and hash-verified vaults — none of which exist in native JS.

## 2. Is this a replacement for Immer or Immutable.js?

No. Immer and Immutable.js solve the "produce next state with immutable semantics" problem (structural sharing, produce/draft API). Constancy solves the "make this value immutable and optionally verify it was not tampered with" problem. They are complementary: use Immer to produce state, then `snapshot` or `tamperEvident` to harden it before passing it to untrusted code.

## 3. Why zero dependencies?

Every dependency is a potential supply-chain attack vector. Zero deps means the only code that runs is the code you can audit in this repository. Constancy is also SLSA Level 3 provenance — every release is cryptographically attested. Adding a dependency would require matching provenance for that package too.

## 4. What's the runtime performance cost?

Operations run in sub-microsecond to single-digit microsecond range on Node.js 20 (Windows 11 benchmark):

| Operation | Throughput |
|-----------|-----------|
| `deepFreeze` (3 keys) | ~2.2M ops/s |
| `snapshot` (3 keys) | ~900K ops/s |
| `immutableView` (3 keys) | ~800K ops/s |
| `tamperEvident` (3 keys) | ~400K ops/s |

`immutableView` has near-zero creation cost; the Proxy traps fire only on property access. `snapshot` and `vault` pay `structuredClone` cost on every call — for large objects this is the dominant cost.

## 5. Does `immutableView` work with Maps and Sets?

Yes — `immutableView` handles `Map`, `Set`, `WeakMap`, `WeakSet`, `Date`, and `Array` by intercepting their mutator methods and throwing. For example:

```typescript
import { immutableView } from 'constancy';

const m = immutableView(new Map([['a', 1]]));
m.get('a');   // 1 — read works
m.set('b', 2); // TypeError: Cannot set: object is immutable
```

For Map and Set specifically, you can also use the dedicated `immutableMapView` and `immutableSetView` wrappers which make a defensive copy at construction (V3 subclass-mutator bypass fix in v3.0.1).

## 6. Can I combine `snapshot` and `tamperEvident`?

`tamperEvident` already includes vault isolation (like `snapshot` + `vault` combined) plus the hash fingerprint. You do not need to call `snapshot` first. Call `tamperEvident(value)` directly:

```typescript
import { tamperEvident } from 'constancy';

const tv = tamperEvident({ version: '1.0', data: [1, 2, 3] });
tv.fingerprint;    // hash string
tv.verify();       // true
tv.assertIntact(); // throws if mismatch
const copy = tv.get(); // fresh frozen copy
```

## 7. How do I migrate from v2?

All API names changed in v3.0.0. The full rename table is in [Migration: Deprecated Aliases](/migration/deprecated-aliases). Quick reference:

| v2 name | v3 name |
|---------|---------|
| `constancy()` | `freezeShallow()` |
| `immutable()` | `immutableView()` |
| `secure()` | `secureSnapshot()` |
| `tamperProof()` | `tamperEvident()` |
| `lock()` | `snapshot()` (or `lock()` as alias) |
| `checkIntegrity()` | `checkRuntimeIntegrity()` |

There are no backward-compat aliases — the v2 names throw `ReferenceError`. Run the codemod in [Migration: From v2 to v3](/migration/from-v2-to-v3) to rename imports automatically.

## 8. Does this work in browsers?

Yes — constancy is browser-compatible with ES2022+ environments (Chrome 94+, Firefox 93+, Safari 16+, Edge 94+). The library is tree-shakeable ESM; all modern bundlers (Vite, Webpack 5, Rollup, esbuild) will strip unused exports.

`structuredClone` is required for `snapshot`, `vault`, and `secureSnapshot`. It is available natively in all supported browsers. No polyfill is provided.

## 9. Why doesn't `Object.freeze` protect Map/Set methods?

`Object.freeze` marks all own properties as non-writable and non-configurable and prevents new own properties. But `Map.prototype.set`, `Set.prototype.add`, etc. live on the prototype, not as own properties of the instance. Freezing the instance does not affect the prototype methods.

The underlying data of a `Map` or `Set` is stored in an internal slot (`[[MapData]]`, `[[SetData]]`) that is accessed only through the built-in methods — not through ordinary property access. `Object.freeze` has no mechanism to touch internal slots. This is a fundamental JS spec constraint.

Constancy's `immutableView` works around this by intercepting method calls via a Proxy and throwing before the internal slot can be accessed.

## 10. Is `tamperEvident` secure against attackers?

No — not against a motivated adversary. The fingerprint is a 64-bit djb2+sdbm hash. It reliably detects accidental corruption and bugs. It does NOT provide:

- Collision resistance against crafted inputs (~2^16 collisions)
- Authentication (no secret key)
- Replay protection (no nonce or timestamp)
- Out-of-process integrity (DevTools CDP, network MITM)

For cryptographic guarantees, sign data server-side with HMAC-SHA256 and verify on every privileged request. See [tamperEvident limitations](/guide/limitations#tamperevident-is-not-cryptographic) for detail.
