---
title: Migrating from v2.x to v3.0
description: Step-by-step walkthrough of breaking changes, behavior clarifications, and new opt-in features introduced in constancy v3.0.
lastReviewed: 2026-04-17
sourceLocale: en
translationStatus: synced
---

# Migrating from v2.x to v3.0

## Why v3?

v3.0 replaced every v2.x API name with a term that encodes its exact mental model: `immutable()` became `immutableView()` to make clear that it returns a Proxy *view* over the original — not a frozen clone; `lock()` became `snapshot()` to signal clone-plus-freeze semantics; `tamperProof()` became `tamperEvident()` because the vault detects tampering, it does not make tampering impossible. These renames are the single largest source of migration work; the underlying behavior is unchanged unless noted in [Behavior clarifications](#behavior-clarifications-v301) below.

## Breaking Changes

The following changes require action before your code will compile or run correctly under v3.0.

### Node.js >= 20

v3.0 raises the minimum Node.js version from 14 to 20. Verify with:

```bash
node --version  # Must be v20.x or later
```

### API Renames

All v2.x API names were removed (except `lock`, which is kept as an alias for `snapshot`). See the full rename table and codemod script at [Deprecated Aliases](/migration/deprecated-aliases).

### `deepClone()` Uses `structuredClone` Only

`deepClone()` no longer falls back to a JSON round-trip when `structuredClone` is unavailable. If your environment does not provide `structuredClone` natively, the call will throw. All Node.js >= 20 environments provide it natively.

### `secureSnapshot()` Rejects Non-Plain Objects

`secureSnapshot()` now throws `TypeError` when called with anything that is not a plain object. In v2.x, passing a class instance or built-in collection silently produced a shallow snapshot. Audit call sites that pass class instances, `Date`, `Map`, `Set`, or similar values.

## Behavior Clarifications (v3.0.1)

The following corrections were introduced in v3.0.1 as part of a security audit. All are backward compatible — they only affect patterns that were already documented as unsupported or unsafe.

### `snapshot()` Severs `Object.prototype` on Plain Objects (S1)

[`snapshot()`](/snapshot/snapshot) and its alias `lock()` now set `[[Prototype]]` to `null` for plain-object clones. Built-in prototypes (Array, Map, Set, etc.) are preserved. This blocks prototype-pollution attacks where an attacker poisons `Object.prototype` after the snapshot is taken.

### `secureSnapshot()` Throws on Accessor Properties (X1)

[`secureSnapshot()`](/snapshot/secure-snapshot) now throws `TypeError` when the input object contains accessor descriptors (getters or setters). Previously it silently dropped them. If your object uses `get`/`set` descriptors, remove them or convert to plain data properties before calling `secureSnapshot()`.

### `isDeepFrozen()` Returns `false` on Accessor Descriptors (F4/I1)

[`isDeepFrozen()`](/verification/is-deep-frozen) now returns `false` when any property in the object graph is an accessor descriptor, even if the object is otherwise frozen. This prevents false-positives from side-effectful getters that could mask mutations.

### `immutableView()` Blocks Subclass Mutators on Map/Set (V3)

[`immutableView()`](/view/immutable-view) applied to `Map`, `Set`, `WeakMap`, or `WeakSet` subclasses now denies all function properties not in an explicit read-method allow-list. Previously, custom methods on subclasses could bypass mutation blocking.

### `tamperEvident()` Upgraded to 64-bit Fingerprint (T1)

[`tamperEvident()`](/snapshot/tamper-evident) now uses a 64-bit djb2+sdbm fingerprint instead of a 32-bit hash. The fingerprint property format changes from base-36 (32-bit) to base-36 (64-bit). If you have stored or compared `fingerprint` values from v3.0.0, regenerate them.

## Migration Steps

Follow these steps in order.

### 1. Bump Node.js to >= 20

```bash
# With nvm
nvm install 20
nvm use 20

# Verify
node --version
```

### 2. Run the Codemod

Use the automated rename script from [Deprecated Aliases](/migration/deprecated-aliases) to update all call sites in one pass. Commit the result as a standalone commit for a clean diff.

### 3. Check Type Errors

TypeScript will surface any missed renames as `TS2305` (module has no exported member) errors. Run:

```bash
npm run typecheck
```

Fix all reported errors before proceeding. The type errors are exhaustive — if `typecheck` passes, all import names are correct.

### 4. Review Accessor-Using Code

`secureSnapshot()` now throws on accessor properties (X1). Search for call sites that pass objects with `get`/`set` descriptors:

```bash
git grep -n "secureSnapshot"
```

For each call site, confirm the argument is a plain data object. If it contains accessors, convert them to plain properties or switch to `snapshot()` instead.

### 5. Test

Run the full test suite and fix any remaining failures:

```bash
npm test
```

Pay particular attention to tests that:
- Assert on `fingerprint` string values from `tamperEvident()` (T1 — values changed)
- Call `isDeepFrozen()` on objects with accessor descriptors (F4/I1 — now returns `false`)
- Call `secureSnapshot()` on class instances (X1 — now throws)

## New Opt-In Features

The following features are backward compatible — they require explicit opt-in and do not affect existing code.

### `deepFreeze(val, { freezePrototypeChain: true })` (F1)

Freeze the entire prototype chain in addition to own properties. Defends against post-freeze poisoning of `ClassName.prototype.method`.

```typescript
import { deepFreeze } from 'constancy';

const hardened = deepFreeze(MyClass.prototype, { freezePrototypeChain: true });
// Any future assignment to MyClass.prototype.someMethod will throw in strict mode
```

Default is `false`; existing `deepFreeze()` calls are unaffected.

### `immutableView(val, { blockToJSON: true })` (V5)

Prevent `JSON.stringify(view)` from invoking the target object's `toJSON()` method. Useful when the view is passed to untrusted code that could extract internal state via serialization.

```typescript
import { immutableView } from 'constancy';

const view = immutableView(sensitiveData, { blockToJSON: true });
JSON.stringify(view); // Blocked — toJSON() is not invoked
```

Default is `false`; existing `immutableView()` calls are unaffected.
