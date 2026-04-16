# Constancy - Code Standards

## Overview

Constancy is written in TypeScript with strict mode enabled. All source lives in `src/`, compiled by tsup to `dist/`. Code style emphasizes clarity, minimal surface area, and KISS/YAGNI principles.

---

## Language & Syntax

### TypeScript Version
- **Source:** TypeScript 5.x, strict mode
- **Target:** ES2015 (tsconfig)
- **Runtime Environment:** Node.js >= 14, modern bundlers

### Strict Mode Rules
- `strict: true` in tsconfig (enables `noImplicitAny`, `strictNullChecks`, etc.)
- No `any` in public API signatures
- Return types must be explicit on exported functions
- Avoid type assertions (`as`) except in internal implementation where required

### Variable Declaration
```typescript
// Preferred: const for bindings that do not change
const seen = new WeakSet<object>();

// Use let only for mutable bindings
let count = 0;

// Never var
```

### Function Style
```typescript
// Preferred: named export functions with explicit generics
export function constancy<T>(val: T): T extends object ? Readonly<T> : T {
  // ...
}

// Internal helpers: plain named functions
function isTypedArray(val: unknown): val is ArrayBufferView {
  // ...
}
```

### Comments & Documentation
```typescript
/**
 * JSDoc for every exported function.
 * @param val - The value to freeze
 * @returns Frozen value or primitive unchanged
 *
 * @example
 * const frozen = constancy({ a: 1 });
 */
```

Internal functions use single-line `//` comments where non-obvious.

---

## Naming Conventions

### Functions & Variables
- **Style:** camelCase
- **Clarity:** Full words; abbreviations only for well-known patterns

```typescript
function constancy(val) { ... }        // good
function isFreezable(val) { ... }      // good — reads as predicate
const TYPED_ARRAY_CONSTRUCTORS = ...   // UPPER_SNAKE for module-level const sets

function c(v) { ... }                  // avoid — unclear
```

### Types & Interfaces
- **Style:** PascalCase
- **Generic parameters:** Single uppercase letter or descriptive word

```typescript
type DeepReadonly<T> = ...             // PascalCase type
type Freezable = object | Function;    // PascalCase type
```

### Files
- **Source files:** `kebab-case.ts` (`deep-freeze.ts`, `constancy.ts`)
- **Test files:** `<module>.test.ts` in `tests/`
- **Config files:** lowercase (e.g., `tsup.config.ts`, `vitest.config.ts`)

---

## File Organization

```
src/
├── index.ts                           — barrel exports (5 categories)
├── freeze-shallow.ts                  — freezeShallow() (shallow freeze)
├── deep-freeze.ts                     — deepFreeze() (recursive freeze)
├── cached-builtins.ts                 — cached Object/Reflect references
├── immutable-view.ts                  — immutableView(), isImmutableView(), assertImmutableView()
├── immutable-collection-views.ts      — immutableMapView(), immutableSetView()
├── snapshot.ts                        — snapshot() (clone + freeze)
├── secure-snapshot.ts                 — secureSnapshot() (null proto + getters)
├── tamper-evident.ts                  — tamperEvident() + hash verification
├── vault.ts                           — vault() (closure isolation)
├── verification.ts                    — isDeepFrozen(), assertDeepFrozen()
├── check-runtime-integrity.ts         — checkRuntimeIntegrity() detection
├── types.ts                           — DeepReadonly<T>, Freezable, Vault<T>, etc.
└── utils.ts                           — isFreezable(), getOwnKeys()
```

Each file has single responsibility. Shared utilities go in `utils.ts`. Cached references in `cached-builtins.ts`. Exports grouped in `index.ts` by category: Freeze, View, Snapshot, Isolation, Verification.

### Module Structure

```typescript
// 1. Imports
import type { DeepReadonly } from './types';
import { isFreezable, getOwnKeys } from './utils';

// 2. Module-level constants (if any)
const TYPED_ARRAY_CONSTRUCTORS = new Set([...]);

// 3. Internal helpers
function helper(...) { ... }

// 4. Exported functions with JSDoc
export function deepFreeze<T>(...) { ... }
```

---

## Export Patterns

### Barrel (`src/index.ts`)

```typescript
export { constancy } from './constancy';
export { constancy as default } from './constancy';
export type { DeepReadonly, Freezable } from './types';
export { deepFreeze } from './deep-freeze';
```

Rule: `index.ts` is exports only — no logic.

### Public API Rule
- Every symbol exported from `src/index.ts` is public API
- Internal helpers (in `utils.ts` or file-local) are not exported from index

---

## TypeScript Patterns

### Conditional Return Types
Preserve narrow types through generics:

```typescript
export function freezeShallow<T>(val: T): T extends object ? Readonly<T> : T
export function deepFreeze<T>(val: T): T extends object ? DeepReadonly<T> : T
export function immutableView<T>(obj: T): T
export function snapshot<T>(val: T): T extends object ? DeepReadonly<T> : T
export function vault<T>(val: T): Vault<T>
export function tamperEvident<T>(val: T): TamperProofVault<T>
```

### Type Guards
Use `is` predicates for runtime checks:

```typescript
function isFreezable(val: unknown): val is object | Function { ... }
function isTypedArray(val: unknown): val is ArrayBufferView { ... }
```

### Cached Builtins Pattern
Capture references at module load to prevent post-import overrides:

```typescript
// cached-builtins.ts — module load time
export const _freeze = Object.freeze;
export const _isFrozen = Object.isFrozen;

// deep-freeze.ts — use cached references
_freeze(obj);  // Original Object.freeze, even if attacker overrides later
```

Purpose: Defend against attacker code that runs after import and overrides Object.freeze.

### Proxy Pattern
Universal trap handler for mutation blocking:

```typescript
const proxy = new Proxy(target, {
  get(target, prop, receiver) {
    // Special handling for internal slots
    if (target instanceof Map) {
      if (MAP_MUTATORS.has(prop)) return () => rejectMutation(prop);
    }
    return Reflect.get(target, prop, receiver);
  },
  set() { throw new TypeError(...); },
  deleteProperty() { throw new TypeError(...); },
});
```

Key: internal slots require `this` = target, not proxy.

### Closure Isolation Pattern
Seal value in closure; no reference escape:

```typescript
export function vault<T>(val: T): Vault<T> {
  // val is now sealed in closure
  return {
    get: () => deepCopy(val),  // Fresh copy each call
  };
}
```

No way to access original `val` from outside.

### Null Prototype Pattern
Immune to prototype pollution:

```typescript
const target = Object.create(null);  // No prototype chain
const store = new Map<string | symbol, unknown>();

// All properties are non-configurable getters
Object.defineProperty(target, key, {
  get: () => store.get(key),
  configurable: false,  // Cannot redefine
});
```

### Hash Verification Pattern
Deterministic hash for integrity:

```typescript
function stableStringify(val: unknown): string {
  // Keys sorted alphabetically for determinism
  const keys = Object.keys(val).sort();
  // ... build stable JSON representation
}

const fingerprint = hashString(stableStringify(val));  // Base-36
```

Stable serialization ensures identical values produce identical hash.

### No `any` in Public API
Internal `as any` casts permitted only where TypeScript cannot infer conditional types. Never in function signatures or type exports.

---

## Testing Conventions

### Framework
- **Framework:** Vitest
- **Commands:** `npm test`, `npm run test:watch`, `npm run test:coverage`
- **Config:** `vitest.config.ts`

### Test File Naming
```
tests/
├── constancy.test.ts
└── deep-freeze.test.ts
```

Pattern: `<module>.test.ts` in `tests/` directory.

### Test Organization
```typescript
import { describe, it, expect } from 'vitest';
import { constancy } from '../src';

describe('constancy()', () => {
  it('freezes objects', () => {
    const obj = constancy({ a: 1 });
    // @ts-expect-error — verifying runtime immutability
    obj.a = 2;
    expect(obj.a).toBe(1);
  });
});
```

### Testing Best Practices

1. **Test behavior, not implementation**
   ```typescript
   // Good: tests the effect
   it('prevents mutation on frozen object', () => { ... });

   // Avoid: tests internal detail
   it('calls Object.freeze internally', () => { ... });
   ```

2. **Cover all input categories**
   - Primitives: null, undefined, string, number, boolean, bigint, symbol
   - Objects, arrays, functions
   - Edge cases: empty objects, circular refs, TypedArrays, Symbol keys

3. **Use `@ts-expect-error` for intentional type violations in tests**
   ```typescript
   // @ts-expect-error — testing runtime immutability
   frozen.prop = 'new value';
   ```

4. **Descriptive test names** — test name should read as a specification sentence

### Coverage Requirements
- **Statement Coverage:** >= 95% (current: 96.85%)
- **Branch Coverage:** >= 90% (current: 90.96%)
- **Function Coverage:** 100% (current: 100%)
- **Test Count:** >= 100 (current: 120)

---

## Build Conventions

### Build Command
```bash
npm run build   # → tsup
```

tsup configuration (`tsup.config.ts`) builds:
- `dist/index.js` — ESM
- `dist/index.cjs` — CJS
- `dist/index.d.ts` — TypeScript declarations

### Typecheck (no emit)
```bash
npm run typecheck   # → tsc --noEmit
```

Always run `typecheck` before publishing.

### Build Output Characteristics
- **ESM:** Tree-shakeable
- **CJS:** Compatible with older Node.js require()
- **Declarations:** Single `.d.ts` file covering all exports
- **Source Maps:** Not generated (library small enough)
- **`sideEffects: false`** in package.json for bundler tree-shaking

---

## Dependency Management

### Zero Runtime Dependencies Principle

```json
{
  "devDependencies": {
    "typescript": "^5.9.3",
    "tsup": "^8.5.1",
    "vitest": "^4.1.3",
    "@vitest/coverage-v8": "^4.1.3"
  }
  // NO "dependencies" section
}
```

Rules:
1. Never add runtime dependencies without strong justification
2. Dev dependencies only for build/test tooling
3. Review alternatives before any new dependency

---

## Code Quality Standards

### Complexity
- Cyclomatic Complexity: < 5 per function
- Function Length: < 50 lines
- Nesting Depth: < 3 levels

### Readability
- Clear, descriptive variable names
- JSDoc for all exported symbols
- 2-space indentation
- Line length: < 100 characters preferred

---

## Error Handling Standards

### No Exception Throwing from Public API
Both `constancy()` and `deepFreeze()` never throw. They return the input unchanged if it is not freezable.

```typescript
// Safe for any input
constancy(null);      // null
constancy(undefined); // undefined
constancy(42);        // 42
deepFreeze(null);     // null
```

### Graceful Skipping
`deepFreeze()` silently skips TypedArrays and accessor descriptors rather than throwing.

---

## Commit Message Conventions

Format:
```
<type>(<scope>): <subject>
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

Examples:
```
feat(deep-freeze): add circular reference safety via WeakSet
fix(types): correct DeepReadonly for Map and Set generics
docs(readme): update API reference for v2.0
refactor(utils): extract isFreezable helper
test(deep-freeze): add TypedArray edge case test
chore(build): switch from Babel to tsup
```

---

## Documentation Standards

- **Location:** `docs/` directory and `README.md`
- **Format:** Markdown
- **Naming:** kebab-case

Code examples in docs must:
- Be runnable and correct against the actual API
- Include necessary imports
- Be updated when the API changes

### README Constraints
- Keep under 300 lines
- No badges or download images
- Sections: install, quick start, API reference, TypeScript usage, migration, development, license

---

## Versioning Strategy

Semantic Versioning (SemVer): `MAJOR.MINOR.PATCH`

- **MAJOR:** Breaking API changes (e.g., removed exports, changed signatures, new Node.js requirement)
- **MINOR:** New backward-compatible features (e.g., new export, new type)
- **PATCH:** Bug fixes

---

## Release Checklist

Before publishing a new version:

- [ ] All 169 tests passing (`npm test`)
- [ ] No type errors (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] Coverage >= 95% (`npm run test:coverage` — currently 96.46%)
- [ ] All 12 test files passing (freeze-shallow, deep-freeze, cached-builtins, immutable-view, immutable-collection-views, snapshot, vault, secure-snapshot, tamper-evident, verification, check-runtime-integrity, api-protection)
- [ ] Statements >= 96% (defend edge cases in tamper-evident, secure-snapshot, vault)
- [ ] Version bumped in `package.json`
- [ ] `CHANGELOG.md` updated with new API names and 5-category organization
- [ ] Commit follows conventional format
- [ ] `npm publish` executed
- [ ] GitHub release created

---

## Summary of Key Conventions

| Aspect | Convention |
|--------|-----------|
| Language | TypeScript strict mode |
| Functions | Named exports, camelCase |
| Types | PascalCase, exported from `types.ts` |
| Files | kebab-case.ts |
| Test files | `module.test.ts` in `tests/` |
| Modules | Conditional ESM + CJS via exports field |
| Comments | JSDoc for exports, `//` for internals |
| Tests | Vitest, describe/it blocks |
| Build | tsup (esbuild) |
| Deps | Zero runtime deps |
| Errors | No throwing from public API |
| Versioning | SemVer |
| Commits | Conventional commits |
