# Changelog

All notable changes to this project will be documented in this file.

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
