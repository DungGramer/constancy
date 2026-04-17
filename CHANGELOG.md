# Changelog

All notable changes to this project will be documented in this file.

## [3.0.1] - 2026-04-17

### Security Fixes — 12 Audit Vectors Closed

12 security vulnerabilities from the v3.0.0 audit (#16–#26) have been resolved. All fixes maintain backward compatibility; behavior corrections affect only unsafe patterns.

#### Freeze Layer
- **F1:** `deepFreeze(val, { freezePrototypeChain: true })` opt-in flag to freeze prototype chain and defend against post-freeze poisoning of `ClassName.prototype.method` (#24)
- **F4/I1:** `isDeepFrozen()` now returns `false` when accessor descriptors are present, preventing false-positive on side-effectful getters (#25)

#### View (Proxy) Layer
- **V1:** `immutableView()` now includes `apply` trap (rejects mutable receivers) and `construct` trap (rejects `new view()`) to close function-binding bypass (#20)
- **V3:** `immutableView()` on Map/Set/WeakMap/WeakSet subclasses now denies all function props not in explicit read-method allow-list (#18)
- **V5:** `immutableView(val, { blockToJSON: true })` opt-in flag prevents `JSON.stringify(view)` from invoking target's `toJSON()` (#21)

#### Snapshot Layer
- **S1:** `snapshot()` / `lock()` now severs `[[Prototype]]` to null for plain objects (preserves built-in prototypes) to block prototype pollution (#17)
- **X1:** `secureSnapshot()` now throws `TypeError` on accessor properties instead of silently dropping them (#19)

#### Tamper-Evident Layer
- **T1/T7:** `stableStringify()` upgraded to 64-bit fingerprint (djb2+sdbm); accessor descriptors now emit structural marker instead of invoking getters (#26)
- **T2/T3/T4:** `stableStringify()` now reaches into Map/Set/Date/RegExp internal slots to detect data mutations; blocks hash collisions (#16)

#### Cross-Cutting (Preload/Supply-Chain)
- **P2/P3:** Internal usage of `structuredClone` and `JSON.stringify` now use cached references `_structuredClone` and `_jsonStringify` (#22)
- **I2/I5:** `checkRuntimeIntegrity()` expanded to verify Reflect.get/has/getOwnPropertyDescriptor/getPrototypeOf/isExtensible and Object.prototype key-set fingerprint (#23)

### Test Suite
- +50 security regression tests in `tests/security/` (7 files, all BYPASS tests rewritten as FIX assertions)
- Total tests: 228+ passing

### Backward Compatibility
All fixes are backward compatible. New optional parameters (`freezePrototypeChain`, `blockToJSON`) default to `false`. Behavior corrections (null-proto snap, accessor throw) only affect unsafe patterns that violated the documented contract.

### Internal
- Refactored `checkRuntimeIntegrity` (CC 19 → 5), `immutableView` get-trap (CC 17 → 10), and `snapshot` nullifyPlainPrototypes (CC 19 → 6) to satisfy SonarCloud quality gate
- Shared `_fingerprintSort` helper for prototype-key fingerprint (fixed `en-US` locale for cross-machine consistency)
- Removed Claude Code review / assistant workflows (`claude.yml`, `claude-code-review.yml`) to reduce API cost surface
- Replaced Symbol sentinel in view `get`-trap dispatch with discriminated union `{ handled, value }` for type safety

---

## [3.0.0] - 2026-04-16

### Breaking Changes
- Minimum Node.js version: 18 (was 14)
- All API names renamed for semantic clarity (see migration below)
- `deepClone()` uses `structuredClone` only — no JSON fallback
- `secureSnapshot()` rejects non-plain objects with TypeError

### API Renames (no backward compat aliases)
- `constancy()` → `freezeShallow()`
- `immutable()` → `immutableView()`
- `isImmutable()` → `isImmutableView()`
- `immutableMap()` → `immutableMapView()`
- `immutableSet()` → `immutableSetView()`
- `lock()` → `snapshot()` (lock kept as alias)
- `secure()` → `secureSnapshot()`
- `tamperProof()` → `tamperEvident()`
- `assertImmutable()` → `assertDeepFrozen()`
- `checkIntegrity()` → `checkRuntimeIntegrity()`
- `TamperProofVault` → `TamperEvidentVault`

### Added
- `snapshot()` / `lock()` — clone + deepFreeze (true data immutability)
- `vault()` — closure isolation with copy-on-read
- `secureSnapshot()` — null proto + getter-only + non-configurable (plain objects only)
- `tamperEvident()` — vault + djb2 structural hash verification
- `immutableView()` — Proxy-based view with full trap set (ownKeys, getOwnPropertyDescriptor, has, preventExtensions, isExtensible)
- `assertImmutableView()` — symmetric assertion for Proxy views
- `assertDeepFrozen()` — assertion for data-level immutability
- `isImmutableView()` — WeakSet-based detection (unforgeable)
- `checkRuntimeIntegrity()` — detect builtin tampering at runtime
- `immutableMapView()` / `immutableSetView()` — read-only collection wrappers with defensive copy
- Cached builtins (Object.freeze, Reflect.ownKeys, etc.) for post-import tamper resistance
- Date/WeakMap/WeakSet mutation blocking in `immutableView()`
- Proxy invariant guard for frozen descriptors
- 169 tests, ~95% statement coverage

### Architecture
- 5 API categories: Freeze / View / Snapshot / Isolation / Verification
- File names match function names (kebab-case)
- Shared internals: `freeze-deep-internal.ts` (freezeDeep + deepClone)

## [2.0.0] - 2026-04-08

### Breaking Changes
- Minimum Node.js version: 14 (was 10)
- ESM-first package (`"type": "module"`)
- Removed `Object.freeze` polyfill (native in all supported environments)
- Removed root `index.js` and `index.d.ts` (use package `exports` field)
- Package now uses conditional exports (`import` / `require`)

### Added
- `deepFreeze()` — recursive deep freeze with circular reference handling via WeakSet
- Full TypeScript source with strict types
- `DeepReadonly<T>` type export for deep immutability typing
- `Freezable` type export
- Symbol key support via `Reflect.ownKeys()`
- TypedArray edge case handling (skips freeze to avoid runtime errors)
- Getter/setter descriptor safety (skips accessor properties during recursion)
- Dual ESM + CJS build via tsup (esbuild-powered)
- Vitest test suite (30 tests, ~97% statement coverage)
- `tsup.config.ts` and `vitest.config.ts` configuration files

### Changed
- Build system: Babel → tsup
- Test framework: Jest → Vitest
- Source language: JavaScript → TypeScript (strict mode)
- Package exports use conditional `exports` field in package.json
- `constancy()` now uses `isFreezable()` helper instead of inline null/typeof checks

## [1.0.2]

- Stable release with shallow freeze, Object.freeze polyfill, 22 Jest tests

## [1.0.0]

- Initial release
