# Project Changelog

All notable changes to the Constancy project are documented here.

## [3.0.0] — Security Audit Fixes — 2026-04-16

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
