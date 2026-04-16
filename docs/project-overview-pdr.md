# Constancy - Project Overview & PDR

## Executive Summary

**Constancy** is a lightweight, zero-dependency TypeScript utility that makes objects and arrays immutable through five API categories: freeze (shallow/deep), immutable views (proxy-based), snapshots (clone+freeze), vaults (closure isolation), and verification utilities.

**Current Version:** 3.0.0
**License:** MIT
**Repository:** https://github.com/DungGramer/constancy
**npm:** https://www.npmjs.com/package/constancy
**Author:** DungGramer
**Node.js:** >= 20 (dropped Node 18; requires Node 20+ for node:util.styleText)
**Build Output:** ESM 5.3KB + CJS 5.9KB, zero runtime dependencies

---

## Problem Statement

In JavaScript, objects and arrays are mutable by default. Developers need immutability at multiple levels — preventing accidental mutations, blocking untrusted code, isolating references, and detecting tampering. This creates:
- Boilerplate code across projects
- Inconsistent immutability patterns (shallow vs. deep)
- Risk of mutations through retained original references
- Difficulty expressing deep immutability in TypeScript types
- No built-in integrity verification

**Constancy solves this** by providing five API categories for different threat models: freeze (shallow/deep), views (proxy-based), snapshots (independent clones), vaults (closure isolation), and verification (integrity checks). All with strong TypeScript types (`DeepReadonly<T>`) and safe handling of edge cases (circular references, Symbol keys, TypedArrays).

---

## Target Audience

- **Primary:** TypeScript developers building state management systems, Redux stores, config objects, or immutable-first applications
- **Secondary:** Library authors needing lightweight immutability enforcement with full type support
- **Environment:** Node.js >= 14, modern bundlers (ESM + CJS conditional exports)

---

## Key Features

### Freeze (Level 0)
1. **`freezeShallow(val)`** — Shallow freeze via `Object.freeze()`, returns `Readonly<T>`
2. **`deepFreeze(val)`** — Recursive freeze with circular reference safety, returns `DeepReadonly<T>`
3. **Cached Builtins** — `Object.freeze`, `Reflect.ownKeys` cached at module load to defend against post-import tamper

### View (Level 1) - Proxy, No Clone
4. **`immutableView(obj)`** — Proxy-based immutability (VIEW); always throws on mutation through this reference
5. **`isImmutableView(val)`** — Detect immutable view proxy
6. **`assertImmutableView(val)`** — Assert value is an immutable view proxy
7. **`immutableMapView()`, `immutableSetView()`** — Read-only Map/Set wrappers
8. **Mutator Blocking** — Blocks all mutation methods on Map, Set, Array, Date, WeakMap, WeakSet

### Snapshot (Level 1.5+) - Clone + Freeze
9. **`snapshot(value)`** — Clone + deep freeze for true data immutability; original reference severed
10. **`lock(value)`** — Alias for `snapshot()`
11. **`secureSnapshot(obj)`** — Snapshot with null prototype + getter-only + non-configurable descriptors
12. **`tamperEvident(val)`** — Snapshot + djb2 structural hash verification with `verify()` and `assertIntact()`
13. **`fingerprint` Property** — Original hash for integrity checking

### Isolation (Level 2) - Closure + Copy-on-Read
14. **`vault(val)`** — Closure isolation with copy-on-read; every `get()` returns fresh frozen copy

### Verification & Utilities
15. **`isDeepFrozen(val)`** — Check if value and all nested objects are frozen
16. **`assertDeepFrozen(val)`** — Assert value is deeply frozen
17. **`checkRuntimeIntegrity()`** — Detect post-import builtin tampering

### Type Safety & Quality
15. **Type Preservation** — Object prototype chain unaffected by freezing
16. **Symbol Key Support** — `Reflect.ownKeys()` covers string + symbol properties
17. **TypedArray Safety** — Skips freeze on TypedArrays to avoid native throws
18. **Zero Dependencies** — No runtime dependencies
19. **Dual Module Exports** — ESM (`dist/index.js`) and CJS (`dist/index.cjs`) via conditional `exports`
20. **TypeScript Source** — Strict mode, full type declarations in `dist/index.d.ts`
21. **VIEW vs SNAPSHOT distinction** — Clear mental model separating proxy views from frozen snapshots

---

## Functional Requirements

### Freeze Layer (FR-1 through FR-7)

#### FR-1: Shallow Freeze Objects and Arrays
- `freezeShallow()` must apply `Object.freeze()` to objects and arrays
- Frozen objects must prevent top-level property mutations
- Primitives must pass through unchanged

#### FR-2: Deep Freeze with Circular Reference Safety
- `deepFreeze()` must recursively freeze all reachable nested objects
- Must detect and skip already-visited objects (WeakSet guard)
- Must process children before parent (bottom-up order)

#### FR-3: Symbol Key Coverage
- `deepFreeze()` must recurse into Symbol-keyed properties via `Reflect.ownKeys()`

#### FR-4: TypedArray Handling
- `deepFreeze()` must skip `Object.freeze()` on TypedArray instances to avoid native runtime errors on non-empty typed arrays

#### FR-5: Accessor Descriptor Safety
- `deepFreeze()` must skip `get`/`set` descriptors during recursion to avoid unintended getter invocation

#### FR-6: Tamper Resistance via Cached Builtins
- `Object.freeze`, `Object.isFrozen`, `Object.getOwnPropertyDescriptor`, `Reflect.ownKeys`, `ArrayBuffer.isView` must be cached at module load time
- All internal freeze operations must use cached references, not live references
- Prevents post-import overrides of Object.freeze from affecting frozen objects

#### FR-7: TypeScript Type Accuracy
- `freezeShallow()` must return `Readonly<T>` for object inputs
- `deepFreeze()` must return `DeepReadonly<T>` for object inputs
- `DeepReadonly<T>` must handle arrays, Maps, Sets, and nested objects correctly

#### FR-8: Dual Module Support
- Package must export both ESM (`import`) and CJS (`require`) via `exports` field

### Immutable View Layer (FR-9 through FR-12)

#### FR-9: Proxy-Based Immutability (View)
- `immutableView()` must wrap object in Proxy that rejects ALL mutations
- Must throw `TypeError` on property assignment, deletion, defineProperty
- Must cache proxies via WeakMap to return same proxy for same target

#### FR-10: Mutator Method Blocking
- Block all methods on Map (`set`, `delete`, `clear`)
- Block all methods on Set (`add`, `delete`, `clear`)
- Block all methods on Array (`push`, `pop`, `shift`, `unshift`, `splice`, `sort`, `reverse`, `fill`, `copyWithin`)
- Block all methods on Date (all `setXxx` methods)
- Block all methods on WeakMap/WeakSet

#### FR-11: Immutable View Detection
- `isImmutableView()` must detect proxies created by `immutableView()`
- Use internal Symbol marker for detection

#### FR-12: Immutable Collection Views
- `immutableMapView()` must wrap Map in Proxy blocking mutators
- `immutableSetView()` must wrap Set in Proxy blocking mutators

### Snapshot Layer (FR-13 through FR-15)

#### FR-13: Clone + Deep Freeze Snapshot
- `snapshot()` must create independent frozen copy via deep clone + deep freeze
- Original reference severed; modifications to original don't affect snapshot
- Returns `DeepReadonly<T>`
- True data immutability (not a view like `immutableView()`)

#### FR-14: Alias for Backward Compat
- `lock()` is an alias for `snapshot()` — identical behavior

#### FR-15: Hardened Snapshot
- `secureSnapshot()` combines snapshot isolation with null prototype + getter-only descriptors
- Immune to prototype pollution; permanent shape

### Vault Layer (FR-16 through FR-18)

#### FR-16: Closure-Based Isolation
- `vault()` must store value in closure; no reference escape
- Every `get()` call must return new frozen copy
- Original value modifications must not affect vault

#### FR-17: Copy-On-Read Pattern
- Use `structuredClone()` (Node >= 17) or JSON fallback for deep copy
- Each copy must be independently frozen

#### FR-18: Vault Interface
- Vault must expose only `get()` method
- No way to access original reference

### Tamper-Evident Layer (FR-19 through FR-21)

#### FR-19: Structural Integrity Hash
- Compute djb2 hash of stable JSON representation
- Hash must be deterministic across identical values
- Store as `fingerprint` property (base-36 encoded)

#### FR-20: Hash Verification
- `verify()` returns boolean; no throw
- `assertIntact()` throws `TypeError` if hash mismatch

#### FR-21: Stable Serialization
- JSON key order must be alphabetically sorted for determinism
- Handle all JSON-serializable types

### Verification Utilities (FR-22 through FR-24)

#### FR-22: Deep Frozen Check
- `isDeepFrozen()` must verify object and all nested objects are frozen
- Recursive traversal with visited set

#### FR-23: Deep Frozen Assertion
- `assertDeepFrozen()` must throw if not deeply frozen

#### FR-24: Runtime Integrity Check
- `checkRuntimeIntegrity()` must detect post-import Object builtin tampering
- Return integrity status with detailed issues list

---

## Non-Functional Requirements

### NFR-1: Performance
- Execution time < 1ms for typical shallow freeze and `immutable()`
- Deep freeze proportional to object graph size; no redundant traversal
- `vault()` copy latency proportional to value size
- Hash computation O(n) in serialized size

### NFR-2: Bundle Size
- ESM: ~5.13 KB (all features)
- CJS: ~5.74 KB (all features)
- Zero runtime dependencies

### NFR-3: Compatibility
- Node.js: >= 20
- Works in Node.js, modern browsers (via bundler), and server environments
- `structuredClone` available in Node >= 17, browsers; JSON fallback for compatibility

### NFR-4: Code Quality
- TypeScript strict mode
- >= 95% statement coverage (currently 96.85%)
- No `any` in public API signatures
- All exported functions have JSDoc

---

## Success Metrics

| Metric | Target | v3.0.0 Status |
|--------|--------|-------------|
| Test Coverage | >= 95% | 98%+ (228 tests) |
| Bundle Size ESM | < 6KB | 5.3 KB |
| Bundle Size CJS | < 6KB | 5.9 KB |
| Zero Runtime Dependencies | Yes | Confirmed |
| TypeScript Source | Yes | Strict mode |
| Dual ESM+CJS | Yes | Conditional exports |
| Freeze APIs | Yes | freezeShallow() + deepFreeze() |
| Immutable Views | Yes | immutableView() + immutableMapView/SetView() |
| Snapshots | Yes | snapshot() + secureSnapshot() + tamperEvident() |
| Vault | Yes | vault() + copy-on-read |
| Verification | Yes | isDeepFrozen() + assertDeepFrozen() + checkRuntimeIntegrity() |
| Circular Ref Safety | Yes | WeakSet guard |
| Cached Builtins | Yes | Post-import tamper resistance |

---

## Technical Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Language | TypeScript | 5.x (strict) |
| Testing | Vitest | 4.x |
| Build | tsup (esbuild) | 8.x |
| Coverage | @vitest/coverage-v8 | 4.x |
| Module System | ESM + CJS | Conditional exports |
| Type Definitions | TypeScript declarations | dist/index.d.ts |

### Dev Dependencies
- `typescript` ^6.0.2 — TypeScript compiler
- `tsup` ^8.5.1 — Bundler (ESM + CJS output)
- `vitest` ^4.1.4 — Test framework
- `@vitest/coverage-v8` ^4.1.4 — V8-based coverage
- `@jazzer.js/core` ^4.0.0 — Fuzz testing
- `@types/node` ^25.6.0 — Node.js type definitions

---

## Architecture Constraints

1. **Single Responsibility** — Freeze only; no mutation tracking, no observability
2. **Minimal API Surface** — Two functions (`constancy`, `deepFreeze`), no configuration options
3. **Pure Functions** — No side effects beyond `Object.freeze()`
4. **Zero Runtime Dependencies** — Enforced
5. **Idempotent** — Multiple freeze calls on the same object are safe

---

## Version History

### 3.0.0 (Current — 2026-04-17)
- Security hardening: 15 vulnerabilities fixed, cognitive complexity refactored
- SLSA 3 provenance: CI upgraded to use slsa-framework/slsa-github-generator for isolated builds
- Fuzz testing: 4 Jazzer.js fuzz targets (deep-freeze, immutable-view, tamper-evident, snapshot)
- Codecov integration: coverage reports now tracked via codecov/codecov-action@v5
- Cognitive complexity reduction: secureSnapshot (CC 17→10), stableStringify (CC 22→6) via extracted helpers
- Test expansion: 228 tests (12 test files, 2,270+ lines), 98%+ coverage
- Node.js >= 20: dropped Node 18; requires node:util.styleText for vitest 4.x
- Extracted helpers: isNonPlainObject(), secureNestedValue(), stringifyPrimitive(), stringifyObjectKeys()
- Build: tsup (ESM 5.3KB + CJS 5.9KB), zero runtime dependencies
- Immutable-view-collection-wraps: new helper module for Map/Set collection wrapping

### 2.0.0 (Previous — 2026-04-16)
- Full TypeScript rewrite with 5 API categories
- Freeze layer: `freezeShallow()`, `deepFreeze()` with cached builtins for tamper resistance
- View layer: `immutableView()`, `isImmutableView()`, `assertImmutableView()`, `immutableMapView()`, `immutableSetView()`
- Snapshot layer: `snapshot()`, `lock()` (alias), `secureSnapshot()`, `tamperEvident()` with djb2 hash verification
- Vault layer: `vault()` for closure isolation + copy-on-read
- Verification: `isDeepFrozen()`, `assertDeepFrozen()`, `checkRuntimeIntegrity()`
- Build: tsup (ESM 5.13KB + CJS 5.74KB)
- Tests: Vitest, 169 tests (12 test files), 96.46% coverage
- ESM-first, Node >= 14

### 1.0.2
- Stable release with shallow freeze and Object.freeze polyfill
- 22 Jest tests

### 1.0.0
- Initial release

---

## Publishing & Distribution

### npm Registry
- Package: `constancy`
- Publish command: `npm publish`
- ESM entry: `dist/index.js`
- CJS entry: `dist/index.cjs`
- Types: `dist/index.d.ts`
- Conditional `exports` field in package.json

### Package `exports` Field
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

## Build Pipeline

```
src/*.ts
  ↓ [tsup — esbuild]
  ↓
dist/index.js   (ESM)
dist/index.cjs  (CJS)
dist/index.d.ts (TypeScript declarations)
  ↓
npm package (published)
```

**Build Command:**
```bash
npm run build
```

---

## Future Considerations

1. **Immutability Tracking** — Optional event listeners for mutation attempts in debug builds
2. **Performance Profiling** — Monitor real-world deep-freeze timing on large graphs
3. **Stricter TypedArray Handling** — Consider wrapping TypedArray in a proxy for element-level read-only enforcement

---

## Known Limitations

1. **TypedArray Elements Not Frozen** — Element slots are raw memory; `Object.freeze()` is intentionally skipped
2. **Accessor Properties Skipped** — Getters/setters are not recursed into during deep freeze
3. **Non-enumerable Properties** — `Reflect.ownKeys()` covers all own keys including non-enumerable ones; freezing prevents deletion but cannot prevent mutation of inherited mutable properties

---

## Dependencies & Licensing

| Dependency | Version | License | Type |
|------------|---------|---------|------|
| typescript | ^5.9.3 | Apache-2.0 | Dev |
| tsup | ^8.5.1 | MIT | Dev |
| vitest | ^4.1.3 | MIT | Dev |
| @vitest/coverage-v8 | ^4.1.3 | MIT | Dev |

**Zero Runtime Dependencies** — Constancy has no production dependencies.

---

## Security Considerations

- No user input processing
- No network operations
- No file system access
- Safe to use in security-sensitive applications
- Relies on native `Object.freeze()` for immutability enforcement

---

## Success Criteria for v2.0.0

- [x] All 30 tests passing
- [x] >= 95% statement coverage
- [x] TypeScript strict mode source
- [x] deepFreeze() with circular reference safety
- [x] Dual ESM + CJS build via tsup
- [x] Conditional exports in package.json
- [x] Documentation updated
- [x] CHANGELOG created
- [x] MIT license included
