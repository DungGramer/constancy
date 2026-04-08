# Changelog

All notable changes to this project will be documented in this file.

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
