# Project Changelog

All notable changes to the Constancy project are documented here.

## [3.0.0] — Security Hardening, SLSA 3, Fuzz Testing — 2026-04-17

### Summary
v3.0.0 enhances security posture with SLSA Level 3 provenance, Jazzer.js fuzz testing, Codecov integration, and cognitive complexity refactoring. 228+ tests, 98%+ coverage. Node >= 20 (dropped Node 18).

### Major Features
- **SLSA 3 Provenance:** CI upgraded to use slsa-framework/slsa-github-generator for isolated build and cryptographically signed provenance attestation
- **Fuzz Testing:** 4 Jazzer.js fuzz targets (fuzz-deep-freeze.js, fuzz-immutable-view.js, fuzz-snapshot.js, fuzz-tamper-evident.js) in `fuzz/` directory. New `fuzz.yml` workflow runs on every push/PR
- **Codecov Integration:** Coverage tracking via codecov/codecov-action@v5 in CI (Node 22, Ubuntu)
- **Cognitive Complexity Refactoring:**
  - secureSnapshot (CC 17→10): extracted `isNonPlainObject()` and `secureNestedValue()` helpers
  - stableStringify in tamper-evident (CC 22→6): extracted `stringifyPrimitive()` and `stringifyObjectKeys()` helpers
- **Test Expansion:** 228+ tests (12 test files, 2,270+ lines), 98%+ line coverage
  - New proxy trap tests: preventExtensions, has, isExtensible
  - Set.entries support testing
  - structuredClone tampering tests
  - Arrays in tamper-evident tests
- **New Module:** immutable-view-collection-wraps.ts for Map/Set collection wrapping helpers
- **Expanded Runtime Integrity Checks:** checkRuntimeIntegrity now verifies 12 builtins (added Proxy, structuredClone, JSON.stringify, Array.isArray, Object.create, Object.defineProperty, Reflect.get, Reflect.defineProperty)

### Breaking Changes
- **Node.js >= 20** (dropped Node 18): vitest 4.x requires node:util.styleText
- **ci.yml matrix:** Removed Node 18, now Node 20/22 on macOS/Ubuntu/Windows

### Dependencies Updated
- `typescript` ^6.0.2 (was 5.x)
- `vitest` ^4.1.4 (was 4.1.3)
- `@vitest/coverage-v8` ^4.1.4 (was 4.1.3)
- `@types/node` ^25.6.0 (new)
- `@jazzer.js/core` ^4.0.0 (new)

### Documentation Updates
- Updated project-overview-pdr.md with v3.0.0 features, Node >= 20, SLSA 3, fuzz testing, Codecov
- Updated codebase-summary.md with 16 source files (added freeze-deep-internal, immutable-view-collection-wraps), 4 fuzz files, 7 workflows
- Updated code-standards.md with cognitive complexity standards, fuzz testing mention, refactored file list
- Updated system-architecture.md with SLSA 3 publish flow, fuzz testing in CI, Codecov, 12 runtime integrity checks
- Updated development-roadmap.md with completed v3.0.0 initiatives
- Updated project-changelog.md with this entry

### Security
- SLSA 3 provenance ensures build integrity and supply chain traceability
- Fuzz testing discovers edge cases in core APIs
- Codecov coverage tracking prevents regression
- Cognitive complexity reduction improves maintainability and security reviews

### Performance
- No performance regressions (bundle size: ESM 5.3KB, CJS 5.9KB)
- Extracted helpers improve code clarity without impact on runtime

---

## [3.0.0-beta] — Security Audit Fixes — 2026-04-16

### Summary
Fixed 15 security vulnerabilities and documentation issues identified in the v3.0.0 security audit: 3 critical, 2 high, 4 medium, 6 low (docs/infra).

### Security Fixes
- **stableStringify circular reference guard** — prevented stack overflow on deeply nested circular structures (Critical)
- **NaN/Infinity/null hash collision** — fixed value encoding to prevent hash collisions (Critical)
- **ImmutableMap/Set deep immutability** — values now wrapped via deepFreeze on read, matching ReadonlyMap semantics (Critical)
- **deepClone error handling** — wrapped structuredClone with descriptive TypeError for non-cloneable values (functions, Symbols, DOM nodes) (High)
- **secureSnapshot nested non-plain objects** — improved error messages to indicate which property contains unsupported types (High)
- **Symbol key prefix collision** — fixed prefix collision in symbol key serialization (Medium)
- **tamperEvident.stored deep freeze** — ensured stored property is frozen after clone (Medium)
- **checkRuntimeIntegrity expansion** — extended coverage for edge cases (Medium)

### CI/Infrastructure
- Added Node 18 to test matrix (ubuntu-latest only) — maintains minimal CI cost while catching Node 18 regressions

### Documentation
- Version updated to 3.0.0 across all docs (codebase-summary.md, project-overview-pdr.md)
- Corrected test file names in codebase-summary.md: immutable-view.test.ts → immutable-proxy.test.ts, snapshot.test.ts → lock.test.ts, secure-snapshot.test.ts → secure.test.ts, tamper-evident.test.ts → tamper-proof.test.ts, verification.test.ts → verify.test.ts, check-runtime-integrity.test.ts → runtime-integrity.test.ts
- Removed stale getOwnKeys references from codebase-summary.md, system-architecture.md, code-standards.md
- Fixed Node.js minimum requirement in docs from >=14 to >=18
- Removed stale "JSON fallback" JSDoc reference from snapshot.ts

### Testing
- Added assertImmutableView test suite with 5+ test cases
- Added error handling tests for non-cloneable values in lock.test.ts, vault.test.ts, secure.test.ts
- Added nested non-plain object error tests in secure.test.ts

### Breaking Changes
None — all fixes are backward compatible.

### Migration Guide
No migration required. All changes maintain existing API contracts.
