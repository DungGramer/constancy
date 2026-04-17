# Constancy Security Audit — Red-Team Bypass Report

**Target:** `constancy` v3.0.0 — zero-dependency immutability toolkit (7 defense layers).
**Scope:** All `src/*.ts`, all 7 defense levels (`freezeShallow` → `tamperEvident`), verification utilities, cross-cutting supply-chain vectors.
**Mode:** Adversarial audit authorized by owner. No production code modified; attack PoCs live under `tests/security/`.

---

## Executive Summary

The library successfully defends against the headline class of attack (`Object.freeze` override post-import) but **27 bypass vectors remain**, grouped by exploitability:

| Bucket | Count | Most severe examples |
|---|---|---|
| **HIGH — exploitable with no preload** | 9 | S1 proto-pollution via `snapshot()`, T2/T3/T4 Map/Set/Date hash collisions, V3 Map/Set subclass mutator bypass, X1 silent accessor drop, F1 prototype-chain freeze gap, F4/I1 accessor false-positive |
| **MEDIUM — requires preload / API coordination** | 10 | P2 raw `structuredClone`, P3 raw `JSON.stringify`, V2 raw `Reflect.*` in view handler, I2..I5 integrity-check blind spots |
| **LOW — documented / theoretical / DoS** | 8 | F2/F3 (documented Map/TypedArray), F7/F8 Error/private fields, V7 mutable iterator, C3/T8/T9 partial-coverage quirks |

### Most actionable

1. **T2/T3/T4** — `tamperEvident` fingerprints of `new Map([['k','v']])`, `new Map()`, `new Set()`, and `new Date()` all collide. `verify()` cannot detect swapping one for another. **Fix:** special-case Map/Set/Date in `stableStringify`.
2. **S1** — `snapshot()` returns an object whose prototype chain still exposes polluted `Object.prototype`. **Fix:** copy to null-prototype object after `structuredClone`.
3. **V3** — Subclasses of `Map`/`Set`/`Array` with custom mutator methods bypass the proxy: `view.customSet(k,v)` binds to the real target and mutates. **Fix:** block calls on slotted targets unless method is explicitly allow-listed.
4. **X1** — `secureSnapshot` silently drops every accessor property. Data loss, no warning. **Fix:** either throw on encounter or invoke the getter once and secure the result.
5. **P2/P3** — Cached builtins `_structuredClone` / `_jsonStringify` exist but are never used — `freeze-deep-internal.ts:18` and `tamper-evident.ts:{37,54,57}` call raw globals. **Fix:** swap to cached bindings, matching every other cached builtin.

---

## Severity Legend

- **HIGH** — works against an unmodified Node ≥20 process; attacker supplies data only.
- **MEDIUM** — requires either pre-import poisoning (preload hook) or a specific API pattern.
- **LOW** — documented limitation, theoretical future spec, or hostile-input DoS.

---

## Layer 0 — `freezeShallow` / `deepFreeze`

Source: [freeze-shallow.ts](../src/freeze-shallow.ts), [deep-freeze.ts](../src/deep-freeze.ts), [freeze-deep-internal.ts](../src/freeze-deep-internal.ts)

| ID | Severity | Vector | File:Line | PoC |
|---|---|---|---|---|
| F1 | HIGH | Prototype chain not traversed; post-freeze poison of `ClassName.prototype.method` applies to already-frozen instances | [freeze-deep-internal.ts:37](../src/freeze-deep-internal.ts) | `tests/security/freeze-bypass.attack.test.ts` |
| F2 | LOW (documented) | `Map`/`Set` internal slots mutable — `.set()` / `.add()` still work after `deepFreeze` | [freeze-deep-internal.ts:30-40](../src/freeze-deep-internal.ts) | — |
| F3 | LOW (documented) | `TypedArray` byte data mutable after freeze | [freeze-deep-internal.ts:40](../src/freeze-deep-internal.ts) | — |
| F4 | HIGH | Accessor descriptors skipped — `{ get x() { return {mut:true} } }`; each call returns fresh mutable object, `isDeepFrozen` still returns `true` | [freeze-deep-internal.ts:44](../src/freeze-deep-internal.ts), [verification.ts:20](../src/verification.ts) | ✓ |
| F5 | MEDIUM | Well-known symbol methods on prototypes (`Array.prototype[Symbol.iterator]`) subvert iteration of frozen objects | [freeze-deep-internal.ts:42](../src/freeze-deep-internal.ts) | ✓ |
| F6 | MEDIUM | `deepClone` uses raw `structuredClone`, not cached `_structuredClone` | [freeze-deep-internal.ts:18](../src/freeze-deep-internal.ts) | see P2 |
| F7 | LOW | `Error.prepareStackTrace` is a global hook; freezing an instance doesn't stop trace forging | — | ✓ |
| F8 | LOW | Private class fields (`#prop`) are outside freeze — mutations through instance methods succeed | [freeze-deep-internal.ts:42](../src/freeze-deep-internal.ts) | ✓ |
| F9 | LOW | Revocable `Proxy` passed to `deepFreeze` can be revoked afterward, turning reads into DoS | — | ✓ |

**Suggested fixes**

- Walk the prototype chain and freeze owned methods if caller opts in (new flag: `deepFreeze(obj, {chain:true})`).
- Add `freezeDeep` option to invoke getters and recurse into returned objects (document side-effect trade-off).
- Cache `_structuredClone` usage; ban raw `structuredClone` via ESLint rule.

---

## Layer 1 — `immutableView`

Source: [immutable-view.ts](../src/immutable-view.ts), [immutable-view-collection-wraps.ts](../src/immutable-view-collection-wraps.ts)

| ID | Severity | Vector | File:Line | PoC |
|---|---|---|---|---|
| V1 | HIGH | Handler lacks `apply` + `construct` traps — wrapped function can be `.call()`/`.apply()`/`new`'d, mutating caller-supplied `this` | [immutable-view.ts:66-122](../src/immutable-view.ts) | ✓ |
| V2 | MEDIUM | Handler uses raw `Reflect.get/getOwnPropertyDescriptor/getPrototypeOf/has/isExtensible/ownKeys` — none cached (only `Reflect.ownKeys` cached as `_ownKeys`, but handler line 111 uses raw `Reflect.ownKeys` anyway) | [immutable-view.ts:58,70,107,110-113,121](../src/immutable-view.ts) | ✓ |
| V3 | HIGH | Custom mutator methods on `Map`/`Set` subclasses are not in `MUTATOR_MAP`; `view.customSet(k,v)` returns a method bound to the raw target and the mutation succeeds | [immutable-view.ts:47-54, 87-88](../src/immutable-view.ts) | ✓ |
| V4 | LOW | `getBlockedMutator` only inspects string props; future Symbol-named mutator methods would escape (no current exploit — forward-looking) | [immutable-view.ts:48](../src/immutable-view.ts) | ✓ |
| V5 | HIGH | `JSON.stringify(view)` calls target's `toJSON()` — attacker-supplied `toJSON` replaces serialized output. Proxy trap never fires for toJSON invocation. | — | ✓ |
| V6 | HIGH | Same as V1 — no call-site receiver sandboxing | — | ✓ |
| V7 | LOW | `wrapIterator` returns a plain generator object whose `.next` is writable — attacker can overwrite `next` to forge values | [immutable-view-collection-wraps.ts:11-29](../src/immutable-view-collection-wraps.ts) | ✓ |
| V8 | LOW (documented) | View is a VIEW — retained original reference remains mutable | [immutable-view.ts:128](../src/immutable-view.ts) | ✓ |

**Suggested fixes**

- Add `apply(target, thisArg, args) { if (hasInternalSlots(thisArg)) rejectMutation('apply with slotted receiver') … }` and `construct`.
- When target is Map/Set/Array, return a rejecting stub for ANY function-typed property not explicitly allow-listed (invert the deny list).
- Cache every `Reflect.*` used by the handler in `cached-builtins.ts`.

---

## Layer 1.5 — `immutableMapView` / `immutableSetView`

Source: [immutable-collection-views.ts](../src/immutable-collection-views.ts)

| ID | Severity | Vector | File:Line | PoC |
|---|---|---|---|---|
| C1 | LOW | Values cloned at construction but frozen only on first read — there is a window where the wrapper holds an unfrozen clone | [immutable-collection-views.ts:37-43](../src/immutable-collection-views.ts) | ✓ |
| C2 | LOW (documented) | `has()` uses reference identity; originals passed by caller produce false-negatives | [immutable-collection-views.ts:117](../src/immutable-collection-views.ts) | ✓ |
| C3 | LOW | Generator iteration freezes lazily — aborted iteration leaves later items unfrozen | [immutable-collection-views.ts:83-88](../src/immutable-collection-views.ts) | ✓ |
| C4 | LOW | `structuredClone` throws on non-cloneable values at construction — DoS if caller receives attacker-supplied Map/Set | [immutable-collection-views.ts:28](../src/immutable-collection-views.ts) | ✓ |
| C5 | MEDIUM | `ImmutableMap.prototype` and `ImmutableSet.prototype` are not frozen — attacker can overwrite `get`, `values`, etc. for every wrapper in the process | — | ✓ |

**Suggested fix for C5:** `Object.freeze(ImmutableMap.prototype); Object.freeze(ImmutableSet.prototype)` at module load.

---

## Layer 1.5 — `snapshot` / `lock`

Source: [snapshot.ts](../src/snapshot.ts)

| ID | Severity | Vector | File:Line | PoC |
|---|---|---|---|---|
| S1 | HIGH | Prototype pollution survives `snapshot()` — `Object.prototype.x` is visible through the clone | [snapshot.ts:29-34](../src/snapshot.ts) | ✓ |
| S2 | MEDIUM | Same raw `structuredClone` as F6/P2 | [freeze-deep-internal.ts:18](../src/freeze-deep-internal.ts) | ✓ |
| S3 | LOW (documented) | Non-cloneable values (functions, Symbols, DOM) throw — DoS on hostile payload | — | ✓ |
| S4 | MEDIUM | `snapshot(new Date())` is still `Date` — poisoning `Date.prototype.getTime` affects the frozen snapshot | — | ✓ |

**Suggested fix for S1:** post-clone, walk the tree and `Object.setPrototypeOf(node, null)` for plain objects (preserve built-in types by `Object.getPrototypeOf(node) === Object.prototype` test).

---

## Layer 2 — `vault`

Source: [vault.ts](../src/vault.ts)

| ID | Severity | Vector | File:Line | PoC |
|---|---|---|---|---|
| U1 | LOW | Non-cloneable input throws → DoS at construction | [vault.ts:17](../src/vault.ts), [freeze-deep-internal.ts:19](../src/freeze-deep-internal.ts) | ✓ |
| U2 | LOW | Repeated `.get()` performs a full deep clone each time — CPU/memory amplification attack | [vault.ts:42](../src/vault.ts) | ✓ |
| U3 | MEDIUM | Raw `structuredClone` (same vector as P2) | — | see P2 |
| U4 | — regression | `.get.call(otherThis, …)` cannot leak — arrow closure pins state (no fix needed, keep test) | [vault.ts:42](../src/vault.ts) | ✓ |

---

## Layer 2.5 — `secureSnapshot`

Source: [secure-snapshot.ts](../src/secure-snapshot.ts)

| ID | Severity | Vector | File:Line | PoC |
|---|---|---|---|---|
| X1 | HIGH | Accessor-only properties **silently dropped** — input `{ get important() {…} }` returns `{}`; caller gets no warning, cannot distinguish from legitimate empty object | [secure-snapshot.ts:68-69](../src/secure-snapshot.ts) | ✓ |
| X2 | LOW (documented) | Any nested non-plain object (Date, Array, Map, class instance) aborts — DoS on hostile payload | [secure-snapshot.ts:15-24, 59-61](../src/secure-snapshot.ts) | ✓ |
| X3 | — regression | Descriptor `.get()` returns already-secured inner object — assignment still throws | [secure-snapshot.ts:73-77](../src/secure-snapshot.ts) | ✓ |
| X4 | — regression | Symbol keys preserved with non-configurable getters | [secure-snapshot.ts:66](../src/secure-snapshot.ts) | ✓ |

**Suggested fix for X1:** either `throw new TypeError('secureSnapshot: accessor property "' + key + '" not supported')` or invoke the getter once and secure the returned value.

---

## Layer 3 — `tamperEvident`

Source: [tamper-evident.ts](../src/tamper-evident.ts)

| ID | Severity | Vector | File:Line | PoC |
|---|---|---|---|---|
| T1 | MEDIUM | djb2 is 32-bit non-cryptographic — birthday attack ~2^16 payloads produces collision | [tamper-evident.ts:22-28](../src/tamper-evident.ts) | ✓ |
| T2 | HIGH | `stableStringify` iterates only own enumerable keys; `Map` entries are in internal slot → every `Map` with no own props has the SAME fingerprint | [tamper-evident.ts:40-78](../src/tamper-evident.ts) | ✓ |
| T3 | HIGH | Same for `Set` | — | ✓ |
| T4 | HIGH | Same for `Date` — different timestamps produce identical fingerprints | — | ✓ |
| T5 | MEDIUM | Symbols with identical descriptions collide via `.toString()` | [tamper-evident.ts:51,57](../src/tamper-evident.ts) | ✓ |
| T6 | MEDIUM | Raw `JSON.stringify` used — cached `_jsonStringify` exists but unused | [tamper-evident.ts:37,54,57](../src/tamper-evident.ts) | see P3 |
| T7 | HIGH | `stableStringify` invokes getters; side-effectful getters (e.g., returning `Date.now()`) make every `verify()` call mismatch → integrity alarm fires without tampering | [tamper-evident.ts:54,57](../src/tamper-evident.ts) | ✓ |
| T8 | LOW | Sparse array holes and explicit `undefined` produce identical hash | [tamper-evident.ts:75](../src/tamper-evident.ts) | ✓ |
| T9 | LOW | `"[Circular]"` placeholder flattens structurally-different cycles into equal strings | [tamper-evident.ts:71](../src/tamper-evident.ts) | ✓ |

**Suggested fixes**

- Switch hash to a cryptographic function (SHA-256 via `node:crypto`) — trade zero-dep purity for real integrity; OR add a clear non-security disclaimer in the API docs.
- In `stableStringify`, special-case Map/Set (sort & serialize entries), Date (`.getTime()`), ArrayBuffer (byte dump), sparse arrays (preserve holes marker).
- Detect accessor descriptors and either skip (matching `freezeDeep`) or document getter-trigger behavior as an explicit feature.

---

## Layer 4 — Verification & `checkRuntimeIntegrity`

Source: [verification.ts](../src/verification.ts), [check-runtime-integrity.ts](../src/check-runtime-integrity.ts)

| ID | Severity | Vector | File:Line | PoC |
|---|---|---|---|---|
| I1 | HIGH | `isDeepFrozen` false positive when accessor returns mutable object | [verification.ts:20](../src/verification.ts) | ✓ |
| I2 | MEDIUM | Missing `Reflect.get/set/has/getOwnPropertyDescriptor/getPrototypeOf/isExtensible` — all used by `immutableView` handler | [check-runtime-integrity.ts:24-44](../src/check-runtime-integrity.ts) | ✓ |
| I3 | MEDIUM | Missing `Map.prototype.*`, `Set.prototype.*`, `WeakMap/WeakSet.prototype.*` | — | ✓ |
| I4 | MEDIUM | Missing `Array.prototype.push/pop/splice/sort/reverse` | — | ✓ |
| I5 | MEDIUM | Missing detection of `Object.prototype` pollution (injected accessors) | — | ✓ |
| I6 | LOW | Poison → use library → restore — subsequent `checkRuntimeIntegrity()` lies (false negative after the fact) | — | ✓ |

**Suggested fixes**

- Extend `cached-builtins.ts` to snapshot every prototype method the library uses; extend `checkRuntimeIntegrity` identity check to match.
- Add an `Object.prototype` own-key fingerprint captured at module load; compare current `_ownKeys(Object.prototype)` to it.

---

## Cross-cutting — Preload / Supply-Chain

Source: [cached-builtins.ts](../src/cached-builtins.ts)

| ID | Severity | Vector | File:Line | PoC |
|---|---|---|---|---|
| P1 | MEDIUM | Self-test only exercises `Object.freeze({})` — other cached builtins untested at load | [cached-builtins.ts:25-28](../src/cached-builtins.ts) | ✓ |
| P2 | MEDIUM | `_structuredClone` captured but never used (`freeze-deep-internal.ts:18` uses raw global) | [freeze-deep-internal.ts:18](../src/freeze-deep-internal.ts) | ✓ |
| P3 | MEDIUM | `_jsonStringify` captured but never used (`tamper-evident.ts` uses raw `JSON.stringify`) | [tamper-evident.ts:37,54,57](../src/tamper-evident.ts) | ✓ |
| P4 | MEDIUM | `Reflect.*` not cached (except `_ownKeys`); immutable-view handler depends on live Reflect | [cached-builtins.ts:9-21](../src/cached-builtins.ts) | ✓ |
| P5 | — regression | ES module namespace spec-frozen — cannot replace exported functions | — | ✓ |

**Suggested fixes**

- Exercise every cached builtin at module load with a representative call; throw on divergence.
- ESLint rule forbidding raw `structuredClone` / `JSON.stringify` / `Reflect.*` inside `src/`.

---

## Running the PoC Suite

```bash
npm test                                        # runs 228+ existing + security PoCs
npm test -- tests/security                      # run bypass tests only
npx vitest run tests/security/tamper-evident-bypass.attack.test.ts
```

A PASSING test under `tests/security/` whose name begins with `BYPASS:` means **the bypass currently works**. After a fix lands, the test either flips to failing (bypass closed) or needs to be rewritten to assert the new post-fix behavior.

## Quick End-to-End Confirmation

```bash
node -e "
const { tamperEvident } = require('./dist/index.cjs');
const a = tamperEvident(new Map([['k','v']]));
const b = tamperEvident(new Map());
const c = tamperEvident(new Date(0));
const d = tamperEvident(new Date(9999999));
console.log('Map with entry:', a.fingerprint);
console.log('Empty Map:    ', b.fingerprint, a.fingerprint === b.fingerprint ? '[COLLISION]' : '');
console.log('Date(0):       ', c.fingerprint);
console.log('Date(big):     ', d.fingerprint, c.fingerprint === d.fingerprint ? '[COLLISION]' : '');
"
```

Expect `[COLLISION]` on both pairs (T2, T4).

---

## Out of Scope

- Production source changes — separate implementation task after review.
- Cryptographic-primitive redesign (SHA-256 vs djb2) — see T1 note.
- Threat modelling of downstream consumers.

## Open Questions

None. Audit scope and format were aligned with the owner before work began.
