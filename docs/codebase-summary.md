# Constancy - Codebase Summary

## Project Overview

**Constancy** is a lightweight TypeScript utility library for deep immutability with multi-level security defenses. Zero dependencies, dual ESM/CJS export, 228 tests, 98%+ coverage, SLSA 3 provenance, fuzz testing.

**Repository:** https://github.com/DungGramer/constancy
**Version:** 3.0.0
**License:** MIT
**Author:** DungGramer
**Size:** ESM 5.3KB, CJS 5.9KB
**Tests:** 228 (12 test files, 2,270+ lines)
**Coverage:** 98%+ line coverage
**Node.js:** >= 20
**Security:** SLSA Level 3 provenance, fuzz testing (Jazzer.js), post-import tamper resistance, cognitive complexity refactoring

---

## Directory Structure

```
constancy/
├── src/
│   ├── index.ts                          # Barrel exports (26 lines)
│   ├── freeze-shallow.ts                 # Shallow freeze (20 lines)
│   ├── deep-freeze.ts                    # Recursive deep freeze (39 lines)
│   ├── freeze-deep-internal.ts           # deepClone() helper (50 lines)
│   ├── cached-builtins.ts                # Cached references (28 lines)
│   ├── immutable-view.ts                 # Proxy-based immutability (171 lines)
│   ├── immutable-view-collection-wraps.ts # Map/Set collection wrappers (123 lines)
│   ├── immutable-collection-views.ts     # ImmutableMap/Set classes (176 lines)
│   ├── vault.ts                          # Closure isolation vault (44 lines)
│   ├── secure-snapshot.ts                # Null proto + getters (81 lines) [CC 17→10 refactored]
│   ├── tamper-evident.ts                 # Hash-verified vault (125 lines)
│   ├── snapshot.ts                       # Clone + deep freeze (37 lines)
│   ├── verification.ts                   # Verification utilities (38 lines)
│   ├── check-runtime-integrity.ts        # Runtime integrity checks (44 lines) [12 builtins]
│   ├── types.ts                          # DeepReadonly<T>, Vault, TamperProofVault (18 lines)
│   └── utils.ts                          # isFreezable() (8 lines)
├── tests/
│   ├── constancy.test.ts             # 19 tests (shallow freeze)
│   ├── deep-freeze.test.ts           # 11 tests (recursive freeze)
│   ├── cached-builtins.test.ts       # 3 tests (tamper resistance)
│   ├── immutable-proxy.test.ts       # 34 tests (proxy immutability, proxy traps)
│   ├── immutable-collections.test.ts # 14+ tests (Map/Set, Set.entries)
│   ├── lock.test.ts                  # 9 tests (snapshot freeze)
│   ├── vault.test.ts                 # 9 tests (copy-on-read)
│   ├── secure.test.ts                # 9 tests (null proto + getters)
│   ├── tamper-proof.test.ts          # 11 tests (hash verification)
│   ├── verify.test.ts                # 12 tests (verification utils)
│   ├── runtime-integrity.test.ts     # 4 tests (builtin integrity)
│   └── api-protection.test.ts        # 34+ tests (mutation defense, structuredClone tampering)
├── fuzz/                              # Fuzz testing targets (Jazzer.js)
│   ├── fuzz-deep-freeze.js           # deepFreeze() fuzzer
│   ├── fuzz-immutable-view.js        # immutableView() fuzzer
│   ├── fuzz-snapshot.js              # snapshot() fuzzer
│   └── fuzz-tamper-evident.js        # tamperEvident() fuzzer
├── dist/                              # Build output (generated)
│   ├── index.js                       # ESM bundle
│   ├── index.cjs                      # CJS bundle
│   └── index.d.ts                     # TypeScript declarations
├── docs/                              # Documentation
│   ├── project-overview-pdr.md
│   ├── codebase-summary.md            # This file
│   ├── code-standards.md
│   ├── system-architecture.md
│   ├── development-roadmap.md
│   ├── project-changelog.md
│   └── security-guide.md
├── .github/workflows/                 # GitHub Actions CI/CD
│   ├── ci.yml                         # Test matrix (Node 20/22, 3 OS), build, security checks
│   ├── codeql.yml                     # CodeQL SAST analysis
│   ├── dependency-review.yml          # Dependency review on PRs
│   ├── osv-scanner.yml                # OSV vulnerability scanning
│   ├── scorecard.yml                  # OpenSSF Scorecard
│   ├── publish.yml                    # SLSA 3 provenance + npm publish
│   └── fuzz.yml                       # Jazzer.js fuzz testing on push/PR
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
├── CHANGELOG.md
└── README.md
```

---

## File Descriptions

### Freeze Layer (Level 0)

#### `src/index.ts`
Barrel re-exporting all public APIs in 5 categories:
- **Freeze:** `freezeShallow`, `deepFreeze`
- **View:** `immutableView`, `isImmutableView`, `assertImmutableView`, `immutableMapView`, `immutableSetView`
- **Snapshot:** `snapshot`, `lock` (alias), `secureSnapshot`, `tamperEvident`
- **Isolation:** `vault`
- **Verification:** `isDeepFrozen`, `assertDeepFrozen`, `checkRuntimeIntegrity`
- Types: `DeepReadonly<T>`, `Freezable`, `Vault<T>`, `TamperProofVault<T>`

#### `src/freeze-shallow.ts`
Implements `freezeShallow<T>(val: T)` — shallow freeze.
- Uses `_freeze` cached reference (post-import tamper resistance)
- Returns `Readonly<T>` for objects, unchanged for primitives

#### `src/deep-freeze.ts`
Implements `deepFreeze<T>(val: T)` — recursive freeze with circular ref safety.
- Uses cached builtins: `_freeze`, `_ownKeys`, `_getOwnPropertyDescriptor`, `_isView`
- Delegates deep cloning to `freeze-deep-internal.ts` via `deepClone()`
- WeakSet guards circular references
- Skips TypedArrays (would throw natively on non-empty)
- Skips accessor descriptors (avoid unintended side effects)
- Bottom-up freeze order (children before parent)

#### `src/freeze-deep-internal.ts`
Internal helper for deep cloning and recursive freezing.
- `deepClone()` — clones using structuredClone (Node >= 17) or JSON fallback
- `freezeDeep()` — recursive freeze with circular ref safety
- Extracted helpers reduce cognitive complexity of main freeze logic

#### `src/cached-builtins.ts`
Captures references at module load time:
- `_freeze = Object.freeze`
- `_isFrozen = Object.isFrozen`
- `_getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor`
- `_ownKeys = Reflect.ownKeys`
- `_isView = ArrayBuffer.isView`

Purpose: If attacker overrides Object.freeze AFTER import, library still uses original native implementation.

### Snapshot Layer

#### `src/snapshot.ts`
Implements `snapshot<T>(value: T)` — Deep clone + deep freeze.
- Creates independent frozen copy via `deepClone()` + `deepFreeze()`
- Original reference severed; mutations to original don't affect snapshot
- True data immutability (not a view)
- Returns `DeepReadonly<T>`

#### `src/immutable-view.ts`
Implements `immutableView<T>(obj: T)`, `isImmutableView(val)`, `assertImmutableView(val)`.
- Proxy-based approach: wraps target in Proxy with universal `get`, `set`, `deleteProperty` traps
- All mutation attempts throw `TypeError`
- Special handling for types with internal slots (Map, Set, Date, WeakMap, WeakSet)
- Blocks all mutator method calls (e.g., `map.set()`, `array.push()`)
- Implements all proxy traps: preventExtensions, has, isExtensible, defineProperty
- ProxyCache (WeakMap) ensures same proxy per target
- WeakSet registry for unforgeable detection

#### `src/immutable-view-collection-wraps.ts`
Helper functions for Map/Set collection wrapping.
- `wrapMapMethod()` — intercepts Map mutators (set, delete, clear)
- `wrapSetMethod()` — intercepts Set mutators (add, delete, clear)
- Reduces cognitive complexity of main immutableView logic

#### `src/immutable-collection-views.ts`
Implements `ImmutableMap<K, V>` and `ImmutableSet<T>` classes.
- Thin wrappers around `immutableView()` for convenience
- Type-safe readonly aliases for Map and Set
- Full class-based implementations with readonly semantics

#### `src/secure-snapshot.ts`
Implements `secureSnapshot<T>(obj: T)` — hardened snapshot.
- Creates snapshot with `Object.create(null)` (immune to prototype pollution)
- All properties are non-configurable getters backed by closure Map
- Nested objects recursively secured
- Accessor descriptors resolved once; result secured
- Extracted helpers: `isNonPlainObject()`, `secureNestedValue()` (CC 17→10 refactored)
- Returns snapshot with maximum hardening

#### `src/tamper-evident.ts`
Implements `tamperEvident<T>(val: T)` returning `TamperProofVault<T>` interface.
- Combines vault isolation with djb2 hash verification
- `fingerprint`: original hash (base-36 encoded) at creation time
- `verify()`: returns boolean; recomputes hash and compares
- `assertIntact()`: throws `TypeError` if hash mismatch
- Stable serialization: extracted helpers `stringifyPrimitive()` and `stringifyObjectKeys()` (CC 22→6 refactored)
- Handles NaN/Infinity/null collision prevention
- Keys sorted alphabetically for determinism

### Isolation Layer

#### `src/vault.ts`
Implements `vault<T>(val: T)` returning `Vault<T>` interface with `get(): DeepReadonly<T>`.
- Stores value in closure; no reference escape
- `get()` returns fresh frozen copy via `frozenCopy()` helper
- Uses `structuredClone()` (Node >= 17) or JSON fallback for deep copy
- All copies are independently frozen
- Original value mutations don't affect vault

### Verification & Type Layer

#### `src/verification.ts` (formerly verify.ts)
Implements `isDeepFrozen<T>(val: T)` and `assertDeepFrozen<T>(val: T)`.
- `isDeepFrozen()`: recursive traversal with visited set; checks `Object.isFrozen()` on all objects
- `assertDeepFrozen()`: throws if not deeply frozen

#### `src/check-runtime-integrity.ts`
Implements `checkRuntimeIntegrity()` for post-import tampering detection.
- Verifies that 12 builtins haven't been overridden: Object.freeze, Object.isFrozen, Object.getOwnPropertyDescriptor, Object.create, Object.defineProperty, Reflect.ownKeys, Reflect.get, Reflect.defineProperty, ArrayBuffer.isView, JSON.stringify, structuredClone, Array.isArray
- Returns integrity status with detailed issues list
- Comprehensive coverage for advanced threat models

#### `src/types.ts`
Type definitions:
- `DeepReadonly<T>` — Recursively readonly type (handles arrays, Maps, Sets, objects)
- `Freezable` — `object | Function`
- `Vault<T>` — Interface: `{ readonly get: () => DeepReadonly<T> }`
- `TamperProofVault<T>` — Interface: `{ readonly get, verify, assertIntact, fingerprint }`

#### `src/utils.ts`
Utility functions:
- `isFreezable(val)` — Type guard: returns true for objects and functions (not null/undefined)

---

### Test Files (169 tests across 12 files)

#### Freeze Layer Tests

##### `tests/freeze-shallow.test.ts` (19 tests)
- Freezing behavior on objects and arrays
- Primitive passthrough (null, undefined, string, number, boolean)
- Type preservation (Date, RegExp, Error, Map, Set, WeakMap, WeakSet, Promise)
- Idempotency (multiple freeze calls safe)

##### `tests/deep-freeze.test.ts` (11 tests)
- Nested object freezing (all levels frozen)
- Circular reference safety (no infinite loop)
- Symbol key support (Symbol-keyed properties frozen)
- TypedArray handling (skipped, no throw)
- Accessor descriptor safety (getters not invoked)
- Primitive passthrough

##### `tests/cached-builtins.test.ts` (3 tests)
- Post-import override resistance
- Cached references used even after Object.freeze override
- Post-import prototype pollution protection

#### Immutable View Layer Tests

##### `tests/immutable-proxy.test.ts` (34 tests)
- Proxy creation and caching
- Property access and mutation blocking
- Mutator method blocking (Map, Set, Array, Date)
- Deep immutability (nested objects wrapped recursively)
- WeakMap/WeakSet mutator blocking
- Immutable view marker detection
- Strict mode throws; non-strict silently fails
- Error messages accurate for each mutation type

##### `tests/immutable-collection-views.test.ts` (14 tests)
- `immutableMapView()` creation and mutation blocking
- `immutableSetView()` creation and mutation blocking
- Type safety verification
- Iteration still works (only mutations blocked)

#### Snapshot Layer Tests

##### `tests/lock.test.ts` (9 tests)
- Closure isolation (no reference escape)
- Copy-on-read behavior (different instance per get())
- Frozen copies (all copies are deeply frozen)
- Snapshot mutations don't affect original
- Original mutations don't affect snapshot
- Idempotency (get() always safe)

##### `tests/secure.test.ts` (9 tests)
- Null prototype chain (no inherited properties)
- Getter-only descriptors (no value field)
- Non-configurable properties (cannot redefine)
- Nested securitization (children also secured)
- Prototype pollution immunity
- Property descriptor manipulation blocked

##### `tests/tamper-proof.test.ts` (11 tests)
- Vault isolation (copy-on-read)
- Hash creation (djb2 deterministic)
- Fingerprint generation (base-36 encoding)
- `verify()` returns true when intact
- `assertIntact()` throws on corruption
- Hash stability across identical values
- Stable serialization (key sorting)
- Empty object/array handling

#### Vault Layer Tests

##### `tests/vault.test.ts` (9 tests)
- Closure isolation (no reference escape)
- Copy-on-read behavior (different instance per get())
- Frozen copies (all copies are deeply frozen)
- Vault mutations don't affect original
- Original mutations don't affect vault
- Idempotency (get() always safe)

#### Verification Utilities Tests

##### `tests/verify.test.ts` (12 tests)
- `isDeepFrozen()` detects frozen objects
- `isDeepFrozen()` rejects partially frozen
- `isDeepFrozen()` handles circular refs
- `isDeepFrozen()` handles primitives
- `assertDeepFrozen()` accepts deeply frozen values
- `assertDeepFrozen()` rejects non-frozen
- `assertDeepFrozen()` throws on failure

##### `tests/runtime-integrity.test.ts` (4 tests)
- Post-import builtin override detection
- Detailed integrity issue reporting
- Success case when environment clean

##### `tests/api-protection.test.ts` (34 tests)
- Comprehensive mutation defense across all APIs
- Edge cases and corner cases
- Type coercion and edge behavior

---

### Configuration Files

#### `package.json`
Key fields:
- `version`: 3.0.0
- `type`: module (ESM-first)
- `main`: `./dist/index.cjs` (CJS fallback)
- `module`: `./dist/index.js` (ESM)
- `types`: `./dist/index.d.ts`
- `exports`: conditional `import`/`require`/`types`
- `engines.node`: `>=20`
- `sideEffects`: false
- `publishConfig.provenance`: true (SLSA 3)

#### `tsconfig.json`
TypeScript configuration targeting ES2015 with strict mode.

#### `tsup.config.ts`
Builds `src/index.ts` to both ESM and CJS formats with TypeScript declarations.

#### `vitest.config.ts`
Vitest configuration (coverage via v8, test glob pattern).

---

## Module Relationships

### Import Graph

```
User Application
    ↓ import/require
    ↓
package exports field
    ├→ dist/index.js   (ESM — import)
    └→ dist/index.cjs  (CJS — require)
         └→ (original: src/index.ts → src/*.ts)

TypeScript support:
    └→ dist/index.d.ts
```

### Internal Dependencies

```
src/index.ts
    ├─ src/freeze-shallow.ts     → src/utils.ts + src/cached-builtins.ts
    ├─ src/deep-freeze.ts        → src/utils.ts, src/types.ts, src/cached-builtins.ts
    ├─ src/immutable-view.ts     → src/utils.ts, src/types.ts
    ├─ src/immutable-collection-views.ts → src/immutable-view.ts
    ├─ src/snapshot.ts           → src/deep-freeze.ts, src/types.ts
    ├─ src/secure-snapshot.ts    → src/snapshot.ts, src/types.ts
    ├─ src/tamper-evident.ts     → src/snapshot.ts, src/types.ts
    ├─ src/vault.ts              → src/types.ts, src/cached-builtins.ts
    ├─ src/verification.ts       → src/types.ts
    ├─ src/check-runtime-integrity.ts → src/cached-builtins.ts
    ├─ src/cached-builtins.ts    (no deps)
    ├─ src/types.ts              (no deps)
    └─ src/utils.ts              (no deps)

No circular dependencies.
```

---

## Build Pipeline

```
src/*.ts
    ↓ [tsup — esbuild-powered]
    ↓
dist/index.js   (ESM, tree-shakeable)
dist/index.cjs  (CJS)
dist/index.d.ts (TypeScript declarations)
```

Build command: `npm run build`
Typecheck command: `npm run typecheck`

---

## Testing Overview

### Framework: Vitest
- **Config:** `vitest.config.ts`
- **Coverage:** `@vitest/coverage-v8`
- **Test files:** `tests/**/*.test.ts`

### Test Execution
```bash
npm test              # single run
npm run test:watch    # watch mode
npm run test:coverage # with coverage report
npm run fuzz          # Jazzer.js fuzz testing
```

### Coverage (v3.0.0 — 2026-04-17)
- **Line Coverage:** 98%+
- **Total tests:** 228+ across 12 test files (~2,270 lines)
  - constancy.test.ts: 19 (shallow freeze)
  - deep-freeze.test.ts: 11 (recursive freeze)
  - cached-builtins.test.ts: 3 (post-import tamper resistance)
  - immutable-proxy.test.ts: 34+ (proxy traps, preventExtensions, has, isExtensible)
  - immutable-collections.test.ts: 14+ (Map/Set, Set.entries)
  - lock.test.ts: 9 (snapshot freeze)
  - vault.test.ts: 9 (copy-on-read)
  - secure.test.ts: 9 (null proto + getters)
  - tamper-proof.test.ts: 11 (hash verification)
  - verify.test.ts: 12 (verification utils)
  - runtime-integrity.test.ts: 4 (builtin integrity)
  - api-protection.test.ts: 34+ (mutation defense, structuredClone tampering)

### Fuzz Testing
- **Framework:** Jazzer.js (@jazzer.js/core ^4.0.0)
- **Targets:** 4 fuzz targets
  - `fuzz-deep-freeze.js` — deepFreeze() fuzz tests
  - `fuzz-immutable-view.js` — immutableView() fuzz tests
  - `fuzz-snapshot.js` — snapshot() fuzz tests
  - `fuzz-tamper-evident.js` — tamperEvident() fuzz tests
- **CI Integration:** fuzz.yml workflow on push and PR

---

## Dependency Graph

### Runtime Dependencies
**None** — Zero external dependencies.

### Build-Time Dependencies

```
tsup              →  esbuild (bundling, ESM+CJS)
typescript        →  tsc (type checking, .d.ts gen)
vitest            →  test runner
@vitest/coverage-v8 → coverage report
```

### Dev Dependencies (package.json)
```json
{
  "devDependencies": {
    "@vitest/coverage-v8": "^4.1.3",
    "tsup": "^8.5.1",
    "typescript": "^5.9.3",
    "vitest": "^4.1.3"
  }
}
```

---

## Entry Points & Exports

### ESM (modern bundlers, Node.js ESM)
```typescript
import constancy from 'constancy';
import { constancy, deepFreeze } from 'constancy';
import type { DeepReadonly, Freezable } from 'constancy';
```

### CJS (Node.js CommonJS, older bundlers)
```javascript
const { constancy, deepFreeze } = require('constancy');
```

### Resolved via `exports` field
```json
{
  ".": {
    "types": "./dist/index.d.ts",
    "import": "./dist/index.js",
    "require": "./dist/index.cjs"
  }
}
```

---

## Key Implementation Insights

### Freeze Layer
1. **Cached Builtins** — `Object.freeze`, `Reflect.ownKeys`, etc. captured at module load time to preserve original behavior even if attacker overrides post-import.

2. **WeakSet Cycle Guard** — `deepFreeze` uses `WeakSet<object>` scoped to each call; already-visited nodes skipped, preventing infinite recursion on circular graphs.

3. **Reflect.ownKeys Coverage** — Covers non-enumerable and Symbol-keyed properties; `Object.keys()` would miss these.

4. **TypedArray Safety** — `Object.freeze()` on non-empty TypedArray throws natively. `deepFreeze` detects via `ArrayBuffer.isView()` and skips.

5. **Accessor Descriptor Skip** — Only data properties (with `value`) recursed. Getter/setter descriptors left untouched to avoid side effects.

6. **Bottom-Up Freeze Order** — Children frozen before parent; entire graph immutable when call returns.

### Immutable Proxy Layer
7. **Proxy Traps** — Three universal traps (`get`, `set`, `deleteProperty`) plus method interception. Throws always for mutations (strict + non-strict).

8. **Internal Slot Handling** — Map, Set, Date, WeakMap, WeakSet have internal slots; `this` must be real instance, not proxy. Special `hasInternalSlots` check.

9. **Proxy Cache** — WeakMap caches proxies per target; same target always returns same proxy. Identity preserved.

10. **Mutator Set Lists** — Hardcoded Set of method names per type (e.g., `MAP_MUTATORS = ['set', 'delete', 'clear']`). Methods return stub that throws.

### Vault Layer
11. **Closure Isolation** — Value stored in closure; no escape. `get()` always returns new copy, severing all references.

12. **Copy-on-Read** — Each call to `get()` triggers deep copy + freeze. Mutations of copy don't affect vault.

13. **Clone Strategy** — `structuredClone()` (Node >= 17) preferred; JSON fallback for compatibility. Both return independent copy.

### Secure Layer
14. **Null Prototype** — `Object.create(null)` immune to prototype chain pollution. `__proto__` has no effect.

15. **Getter-Only Descriptors** — No `value` field; all properties are non-configurable getters backed by closure Map. Prevents property replacement.

16. **Nested Recursion** — Accessor descriptors on source resolved once; result recursively secured. Full graph secured.

### Tamper-Proof Layer
17. **djb2 Hash** — Fast, deterministic hash function. Computed on stable JSON representation. Base-36 encoded for compactness.

18. **Stable Serialization** — JSON keys sorted alphabetically. Arrays iterated in order. Identical values always produce identical hash.

19. **Fingerprint Storage** — Hash captured at creation time; stored on vault interface. `verify()` recomputes; `assertIntact()` throws on mismatch.

### Module Design
20. **Conditional Exports** — Both ESM and CJS consumers get correct format; TypeScript picks declarations automatically.
