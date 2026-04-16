# Constancy - System Architecture

## Architecture Overview

Constancy is a multi-level immutability library with 5 defense levels: freeze (L0), proxy views (L1), snapshots (L1.5), vault isolation (L2), and hardened snapshots (L3). The architecture follows strict minimal principles: pure functions, no runtime dependencies, dual ESM+CJS output via conditional package exports. Enhanced with SLSA Level 3 provenance, fuzz testing (Jazzer.js), Codecov coverage tracking, and post-import tamper resistance (12 builtin checks).

**Core Principle:** Provide flexible immutability primitives from lightweight freezing to deep isolation, with full TypeScript type safety and zero external dependencies.

**Critical Distinction:** VIEW (proxy-based) vs SNAPSHOT (clone+freeze). `immutableView()` blocks mutations through its reference but original still mutable if retained. `snapshot()` creates independent frozen clone. Choose based on threat model.

---

## High-Level Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                    User Application                              │
│                (Node.js / Bundler / Browser)                     │
└───────────────────────┬────────────────────────────────────────┘
                        │ import / require
                        ↓
         ┌──────────────────────────────────┐
         │   package.json exports field     │
         ├──────────────────────────────────┤
         │ "import"  → dist/index.js (ESM)  │
         │ "require" → dist/index.cjs(CJS)  │
         │ "types"   → dist/index.d.ts      │
         └───────────┬───────────────────┘
                     │
    ┌────────────────┬────────────────┬──────────────────┬──────────────────────┬───────┐
    ↓                ↓                ↓                  ↓                      ↓       ↓
┌─────────┐    ┌──────────┐    ┌────────────┐    ┌──────────┐        ┌──────────────┐
│ Freeze  │    │ View     │    │ Snapshot   │    │ Isolation│        │Verification  │
│(in-place)    │(Proxy)   │    │(Clone+Frz) │    │(Closure) │        │(Checks)      │
└────┬────┘    │ (no clone)   │ (no orig.  │    │ (copyon  │        └──────────────┘
     │         │          │    │  retained) │    │  read)   │
     │         │          │    └────────────┘    │          │
     │ freezeShallow()    immutableView()       snapshot()  vault()
     │ deepFreeze()       isImmutableView()     lock()       checkRuntimeIntegrity()
     │                    assertImmutableView() secureSnapshot()
     │                    immutableMapView()    tamperEvident()
     │                    immutableSetView()    
     │                                          isDeepFrozen()
     │                                          assertDeepFrozen()
     │
     └─→ cached-builtins.ts
         (Object.freeze, Reflect.ownKeys, etc.)
         Captured at module load time
         
     → verification.ts (isDeepFrozen, assertDeepFrozen)
     → check-runtime-integrity.ts (checkRuntimeIntegrity)
     → utils.ts (isFreezable)
     → types.ts (DeepReadonly, Vault, TamperProofVault)
```

---

## Data Flow: freezeShallow() — Shallow Freeze

```
Input value (T)
    │
    ├─ isFreezable(val)?
    │    ├─ NO  (null, undefined, primitive)
    │    │    └─ return val unchanged
    │    │
    │    └─ YES (object, function)
    │         └─ return Object.freeze(val)
    │              → Readonly<T>
    │
    └─ Output: Readonly<T> | T
```

### Step Detail

#### isFreezable check
```typescript
// src/utils.ts
export function isFreezable(val: unknown): val is object | Function {
  if (val === null || val === undefined) return false;
  const t = typeof val;
  return t === 'object' || t === 'function';
}
```

Only objects and functions proceed to freeze. All primitives (including `null`) return unchanged.

#### Object.freeze
```typescript
return Object.freeze(val) as any;
```

- Makes all own properties non-writable + non-configurable
- Prevents extension (no new properties)
- Returns the same reference (idempotent)
- Does NOT recurse into nested objects

---

## Data Flow: deepFreeze() — Recursive Deep Freeze

```
Input value (T)
    │
    ├─ isFreezable(val)?
    │    ├─ NO  → return val unchanged
    │    │
    │    └─ YES → init WeakSet<object> seen
    │              └─ freezeRecursive(val, seen)
    │                      │
    │              ┌───────┴────────────────────┐
    │              │                            │
    │         seen.has(obj)?              isTypedArray(obj)?
    │              │                            │
    │         YES → return             YES → return (skip freeze)
    │         (cycle guard)
    │              │
    │         seen.add(obj)
    │              │
    │         for key of _ownKeys(obj)    ← cached Reflect.ownKeys
    │              │
    │         _getOwnPropertyDescriptor(obj, key)   ← cached
    │              │
    │         ┌────┴──────────────────────────────┐
    │         │                                   │
    │    data property?                   accessor (get/set)?
    │   ('value' in desc)                   └─ skip
    │         │
    │    isFreezable(desc.value)?
    │         ├─ YES → freezeRecursive(desc.value, seen)
    │         └─ NO  → skip
    │              │
    │         _freeze(obj)   ← cached Object.freeze
    │         (bottom-up: children first)
    │
    └─ Output: DeepReadonly<T> | T

KEY: All Object/Reflect calls use cached references from cached-builtins.ts
     This survives post-import Object.freeze override attacks.
```

### Key Design Decisions

#### Cached Builtins (Post-Import Tamper Resistance)
```typescript
// cached-builtins.ts — captured at module load
export const _freeze = Object.freeze;
export const _ownKeys = Reflect.ownKeys;
// + 10 more builtins

// Usage in deep-freeze.ts
_freeze(obj);  // Original, even if attacker overrides Object.freeze later
```

Attack model: attacker injects code that runs after import:
```javascript
import { deepFreeze } from 'constancy'; // Cached at this point
Object.freeze = () => { /* noop */ };   // Attacker override
const obj = deepFreeze({ a: 1 });       // Still uses original _freeze!
```

Captures 12 builtins at module load time:
- Object.freeze, Object.isFrozen, Object.getOwnPropertyDescriptor, Object.create, Object.defineProperty
- Reflect.ownKeys, Reflect.get, Reflect.defineProperty
- ArrayBuffer.isView, JSON.stringify, structuredClone, Array.isArray

#### Circular Reference Safety (WeakSet)
```typescript
function freezeRecursive(obj: object, seen: WeakSet<object>): void {
  if (seen.has(obj)) return;  // cycle detected — skip
  seen.add(obj);
  // ...
}
```

WeakSet is scoped per `deepFreeze()` call. Holds weak references so GC is not blocked. O(1) lookup.

#### Symbol Key Support (Reflect.ownKeys)
```typescript
// Covers string keys, symbol keys, enumerable + non-enumerable
for (const key of _ownKeys(obj)) { ... }
```

`Reflect.ownKeys()` returns all own property keys, unlike `Object.keys()` which omits non-enumerable and symbol keys.

#### TypedArray Safety
```typescript
if (_isView(obj) && !(obj instanceof DataView)) {
  return; // skip freeze
}
```

`Object.freeze()` on non-empty TypedArray throws. TypedArray element slots are raw memory, not configurable JS properties.

#### Accessor Descriptor Skip
```typescript
const descriptor = _getOwnPropertyDescriptor(obj, key);
if ('value' in descriptor && isFreezable(descriptor.value)) {
  freezeRecursive(descriptor.value as object, seen);
}
```

Only data properties (with `value`) recursed. Accessor descriptors (`get`/`set`) untouched to avoid unintended getter invocation.

#### Bottom-Up Freeze Order
Children frozen before parent. Entire graph immutable when call returns.

#### Proxy-Based Immutability (Level 1)
```typescript
const proxy = new Proxy(target, {
  set() { throw new TypeError('object is immutable'); },
  deleteProperty() { throw new TypeError('object is immutable'); },
  get(target, prop) {
    // Block mutator methods on Map, Set, Array, Date
    if (target instanceof Map && MAP_MUTATORS.has(prop)) {
      return () => rejectMutation(prop);
    }
    return Reflect.get(target, prop, receiver);
  },
});
```

Universal traps throw on any mutation. Mutator method stubs also throw. Works with internal slot types (Map, Set, Date) by managing `this` correctly.

#### Vault Closure Isolation (Level 2)
```typescript
export function vault<T>(val: T): Vault<T> {
  // val sealed in closure — no escape
  return {
    get: () => frozenCopy(val),  // Fresh copy per call
  };
}
```

Original `val` is unreachable from outside. Every `get()` returns new frozen copy. Mutations of copy don't affect vault.

#### Secure Null Prototype (Level 3)
```typescript
const target = Object.create(null);  // No prototype chain
Object.defineProperty(target, key, {
  get: () => store.get(key),
  configurable: false,  // Permanent
});
```

Immune to `__proto__` pollution. All properties are non-configurable getters backed by closure Map.

#### Tamper-Proof Hash (Level 4)
```typescript
const stableJson = stableStringify(val);  // Keys sorted
const fingerprint = hashString(stableJson);  // djb2 hash
```

Deterministic hash of stable JSON. Store fingerprint at creation. `verify()` recomputes and compares. Detects structural corruption.

#### Proxy Cache (Identity Preservation)
```typescript
const proxyCache = new WeakMap<object, object>();
function createImmutableProxy<T>(obj: T): T {
  if (proxyCache.has(obj)) return proxyCache.get(obj) as T;
  // ...
  proxyCache.set(obj, proxy);
  return proxy;
}
```

Same target always returns same proxy. Preserves identity for reference checks.

---

## Module Architecture

### Source Module Graph

```
src/index.ts (barrel — 5 categories)
    │
    ├─ FREEZE CATEGORY
    │  ├─ src/freeze-shallow.ts
    │  │  └─→ src/cached-builtins.ts, src/utils.ts
    │  └─ src/deep-freeze.ts
    │     └─→ src/freeze-deep-internal.ts, src/cached-builtins.ts, src/utils.ts, src/types.ts
    │
    ├─ VIEW CATEGORY
    │  ├─ src/immutable-view.ts
    │  │  └─→ src/immutable-view-collection-wraps.ts, src/utils.ts, src/types.ts
    │  └─ src/immutable-collection-views.ts
    │     └─→ src/immutable-view.ts, src/types.ts
    │
    ├─ SNAPSHOT CATEGORY
    │  ├─ src/snapshot.ts
    │  │  └─→ src/freeze-deep-internal.ts, src/deep-freeze.ts, src/types.ts
    │  ├─ src/secure-snapshot.ts
    │  │  └─→ src/snapshot.ts, src/types.ts
    │  └─ src/tamper-evident.ts
    │     └─→ src/snapshot.ts, src/types.ts
    │
    ├─ ISOLATION CATEGORY
    │  └─ src/vault.ts
    │     └─→ src/types.ts, src/cached-builtins.ts
    │
    ├─ VERIFICATION CATEGORY
    │  ├─ src/verification.ts
    │  │  └─→ src/types.ts
    │  └─ src/check-runtime-integrity.ts
    │     └─→ src/cached-builtins.ts
    │
    ├─ src/freeze-deep-internal.ts (no deps)
    ├─ src/immutable-view-collection-wraps.ts (no deps)
    ├─ src/cached-builtins.ts (no deps)
    ├─ src/types.ts (no deps)
    └─ src/utils.ts (no deps)

No circular dependencies.
```

### Responsibilities

| Module | Responsibility |
|--------|---------------|
| `index.ts` | Public barrel — re-exports by category (5 groups) |
| `freeze-shallow.ts` | Shallow freeze via `Object.freeze()` |
| `deep-freeze.ts` | Recursive freeze with WeakSet + cached builtins |
| `freeze-deep-internal.ts` | deepClone() + freezeDeep() helpers (CC optimization) |
| `cached-builtins.ts` | Captured references (12 builtins, post-import tamper resistance) |
| `immutable-view.ts` | Proxy-based immutability + detection + assertion + all traps |
| `immutable-view-collection-wraps.ts` | wrapMapMethod/wrapSetMethod helpers (CC optimization) |
| `immutable-collection-views.ts` | ImmutableMap/Set classes with readonly semantics |
| `snapshot.ts` | Clone + deep freeze for true immutability |
| `secure-snapshot.ts` | Snapshot with null proto + getter-only (CC 17→10) |
| `tamper-evident.ts` | Vault + djb2 hash verification (CC 22→6) |
| `vault.ts` | Closure isolation + copy-on-read |
| `verification.ts` | isDeepFrozen() + assertDeepFrozen() |
| `check-runtime-integrity.ts` | Detect post-import tampering (12 builtins) |
| `types.ts` | DeepReadonly<T>, Vault<T>, TamperProofVault<T>, etc. |
| `utils.ts` | isFreezable() |

---

## Build Pipeline Architecture

```
┌─────────────────────────────────────────────────┐
│                   Developer                      │
│               npm run build                      │
└────────────────────┬────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────┐
│              tsup invoked                        │
│  Entry: src/index.ts                             │
│  Formats: esm, cjs                               │
│  dts: true (TypeScript declarations)             │
└────────────────────┬────────────────────────────┘
                     │
          ┌──────────┴──────────┐
          ↓                     ↓
┌──────────────────┐  ┌──────────────────────┐
│   esbuild (ESM)  │  │   esbuild (CJS)      │
│   Tree-shakeable │  │   require() compat   │
│   dist/index.js  │  │   dist/index.cjs     │
└──────────────────┘  └──────────────────────┘
          │                     │
          └──────────┬──────────┘
                     ↓
          ┌──────────────────────┐
          │  tsc declaration     │
          │  dist/index.d.ts     │
          └──────────────────────┘
                     │
                     ↓
          ┌──────────────────────┐
          │  Ready for npm pub   │
          └──────────────────────┘
```

### Build Tools

#### tsup
- esbuild-powered bundler; significantly faster than Babel
- Handles ESM + CJS dual output in one step
- Generates `.d.ts` via TypeScript compiler integration
- `sideEffects: false` enables tree-shaking in downstream bundlers

#### TypeScript Compiler (`tsc`)
- Type checking only (`--noEmit` for `npm run typecheck`)
- Declaration generation delegated to tsup

---

## Module Resolution (Consumer Side)

### Package `exports` Field

```json
{
  "exports": {
    ".": {
      "types":   "./dist/index.d.ts",
      "import":  "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  }
}
```

Resolution order (Node.js / bundlers):
1. TypeScript tooling → `types` → `dist/index.d.ts`
2. ESM (`import`) → `dist/index.js`
3. CJS (`require`) → `dist/index.cjs`

### ESM Import
```typescript
import constancy, { deepFreeze } from 'constancy';
import type { DeepReadonly, Freezable } from 'constancy';
```

### CJS require
```javascript
const { constancy, deepFreeze } = require('constancy');
```

---

## Type System Architecture

### DeepReadonly<T> Resolution

```typescript
type DeepReadonly<T> =
  T extends Primitive ? T :
  T extends Array<infer U> ? ReadonlyArray<DeepReadonly<U>> :
  T extends Map<infer K, infer V> ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>> :
  T extends Set<infer U> ? ReadonlySet<DeepReadonly<U>> :
  T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } :
  T;
```

Conditional type chain: primitives pass through, arrays become ReadonlyArray, Maps become ReadonlyMap, Sets become ReadonlySet, plain objects get mapped with readonly on all keys.

### Function Signature Types

```typescript
// constancy: shallow
constancy<T>(val: T): T extends object ? Readonly<T> : T

// deepFreeze: deep
deepFreeze<T>(val: T): T extends object ? DeepReadonly<T> : T
```

Conditional return types preserve the caller's type information.

---

## CI/CD Pipeline Architecture

### GitHub Actions Workflows (7 workflows)

```
Code Push (master branch)
    │
    ├─→ [ci.yml — Test Job]
    │       • Runs on Node 20, 22 (macOS, Ubuntu, Windows)
    │       • Steps:
    │         └─ npm ci
    │         └─ npm run typecheck
    │         └─ npm run build
    │         └─ npm test (228+ tests)
    │         └─ npm run test:coverage
    │         └─ Integration with Codecov
    │
    ├─→ [codeql.yml — SAST]
    │       • CodeQL analysis for security vulnerabilities
    │
    ├─→ [dependency-review.yml]
    │       • PR dependency review gating
    │
    ├─→ [osv-scanner.yml]
    │       • OSV vulnerability scanning
    │
    ├─→ [scorecard.yml]
    │       • OpenSSF Best Practices Scorecard
    │
    ├─→ [fuzz.yml — Fuzz Testing]
    │       • Runs on push and PR
    │       • Jazzer.js: 4 fuzz targets
    │       • Deep-freeze, immutable-view, snapshot, tamper-evident
    │
    └─→ (tests + coverage must pass before publish)

Git Tag Push (tag: v*)
    │
    └─→ [publish.yml — SLSA 3 Provenance]
            • Triggered on tags matching v* pattern
            • Uses slsa-framework/slsa-github-generator
            • Isolated build container (SLSA Level 3)
            • Auto-generates provenance attestation
            • npm publish with provenance signature
            • id-token: write permission

```

### Key Policies

- **Minimum Production Node:** 20 (requires node:util.styleText for vitest)
- **Dev Tools Minimum:** 20 (tsup 8.x, vitest 4.x require >=20)
- **Prod Test Matrix:** 20, 22 (LTS + latest stable)
- **OS Coverage:** macOS, Ubuntu, Windows
- **Coverage Provider:** @vitest/coverage-v8
- **Coverage Tracking:** Codecov integration (codecov/codecov-action@v5)
- **Fuzz Testing:** Jazzer.js on every push/PR
- **SAST:** CodeQL for code security analysis
- **Publish Gating:** SLSA 3 provenance, all CI must pass
- **Provenance:** SLSA Level 3 via slsa-framework/slsa-github-generator
- **Supply Chain Security:** OpenSSF Best Practices badge, Fuzz Testing badge

---

## Publishing Flow (SLSA 3)

```
src/*.ts
    ↓ [Isolated build container — slsa-framework]
    ↓ [tsc type-check + tsup build]
    ↓
dist/index.js
dist/index.cjs
dist/index.d.ts
    ↓
package.json
README.md
CHANGELOG.md
LICENSE
    ↓
    ├─→ npm Registry (npmjs.com/package/constancy)
    │       └─ with SLSA 3 provenance attestation
    │
    └─→ GitHub Artifacts
            └─ provenance.json (cryptographically signed)
```

Files included in npm package: `"files": ["dist"]` + package.json defaults (README, LICENSE, CHANGELOG).

### Publish Command
```bash
npm publish --access public
```

Automatic via GitHub Actions on version tag push (v*).

### Provenance Details
- **Framework:** slsa-framework/slsa-github-generator (reusable workflow)
- **Level:** SLSA Level 3 (isolated build, full traceability)
- **Attestation:** Cryptographically signed provenance.json
- **Verification:** Can be verified via SLSA tooling
- **Supply Chain Security:** Defends against package tampering, build environment compromise

---

## Performance Architecture

### constancy() — O(n)
Where n = own property count. Object.freeze is O(n). Fast path for primitives is O(1).

### deepFreeze() — O(V + E)
Where V = reachable objects, E = property edges. Each object visited exactly once (WeakSet guard). No redundant traversal with shared refs.

### immutable() — O(1) proxy creation
Proxy creation is O(1). Method interception in `get` trap is O(1) (Set lookup for mutator names).

### vault() — O(S) per get()
Where S = serialized size. Each `get()` triggers structuredClone (or JSON) which is O(S). Memory linear in copy size.

### secure() — O(n)
Where n = own properties. Defines non-configurable getters for each property.

### tamperProof() — O(V + E + S)
V + E for vault isolation, S for stable JSON serialization and hash.

### Memory
- WeakSet/WeakMap per operation; GC-collected after return
- Vault stores single copy in closure; copies on demand
- No retained user data references
- Proxy cache is WeakMap (GC-able)

---

## Security Architecture

1. **No user input sanitization needed** — pure transformation, no code execution
2. **No prototype pollution** — only own properties are frozen
3. **No global state mutation** — WeakSet is scoped per call
4. **No external network or IO** — pure function
5. **Zero runtime dependencies** — no supply chain risk

---

## Architecture Decision Records

| Decision | Rationale | Layer |
|----------|-----------|-------|
| Cached builtins pattern | Defend post-import Object.freeze overrides | 0 |
| TypeScript source | Type safety, `DeepReadonly<T>` requires generics | All |
| tsup over Babel | Faster builds, native ESM+CJS, simpler config | All |
| WeakSet for cycle guard | O(1) lookup, GC-friendly, scoped per call | 0 |
| Reflect.ownKeys for iteration | Covers string + symbol + non-enumerable | 0 |
| Skip TypedArray freeze | Prevents native runtime throw | 0 |
| Skip accessor descriptors | Avoid unintended side effects | 0 |
| Proxy for mutations | Universal blocking; works for all types | 1 |
| Proxy caching (WeakMap) | Preserve object identity | 1 |
| Closure isolation (vault) | Sever all references to original | 2 |
| Copy-on-read pattern | Each access returns fresh copy | 2 |
| Null prototype (secure) | Immunity to prototype pollution | 3 |
| Getter-only descriptors | Prevent property redefinition | 3 |
| djb2 hash function | Fast, deterministic, proven | 4 |
| Stable JSON serialization | Identical values → identical hash | 4 |
| Conditional package exports | Standard dual-package ESM/CJS | All |
| No runtime dependencies | Security, bundle size, maintenance | All |
| No throwing from public API | Production safety | All |
| Bottom-up freeze order | Complete immutability upon return | 0 |
| WeakMap for metadata | GC-friendly, O(1) lookup | 1, 2 |
