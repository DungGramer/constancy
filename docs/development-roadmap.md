# Development Roadmap

High-level view of planned work, current initiatives, and completed milestones.

## Current Release: 3.0.0

### Completed Initiatives

#### Security Audit Fixes (Completed 2026-04-16)
- [x] Fix stableStringify circular reference guard (Critical)
- [x] Fix NaN/Infinity/null hash collision (Critical)
- [x] Ensure ImmutableMap/Set deep immutability (Critical)
- [x] Add deepClone error handling for non-cloneable values (High)
- [x] Improve secureSnapshot error messages for nested non-plain objects (High)
- [x] Fix Symbol key prefix collision (Medium)
- [x] Deep freeze tamperEvident.stored (Medium)
- [x] Expand checkRuntimeIntegrity coverage (Medium)
- [x] Add Node 18 to CI test matrix (Medium)
- [x] Update docs to version 3.0.0 (Low)
- [x] Correct test file names in docs (Low)
- [x] Remove stale getOwnKeys references (Low)
- [x] Update Node.js version requirement in docs (Low)
- [x] Add assertImmutableView test suite (Low)
- [x] Fix stale snapshot.ts JSDoc (Low)

**Status:** All 15 issues resolved. All tests passing on Node 18, 20, 22.

## Future Releases

### Planned for Next Iteration
- Consider bumping minimum Node.js to 20 (Node 18 EOL: April 2025)
- Performance profiling and optimization opportunities
- Additional integration test coverage
- Enhanced threat model documentation

### Under Consideration
- Extended API documentation
- Additional examples and use cases
- Community feedback implementation
