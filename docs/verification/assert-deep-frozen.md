---
title: assertDeepFrozen
description: Throws TypeError if a value is not deeply frozen. Thin wrapper over isDeepFrozen — same semantics, throwing API.
lastReviewed: 2026-04-17
sourceLocale: en
translationStatus: synced
---

# assertDeepFrozen

## What it does

`assertDeepFrozen` calls [`isDeepFrozen`](/verification/is-deep-frozen) on the given value. If that predicate returns `false`, it throws a `TypeError` with the message `"Object is not deep frozen"`. When a `label` is provided, the message is prefixed as `"<label>: Object is not deep frozen"` to make the throw site identifiable in logs and stack traces. If the value passes the check, the function returns `void` normally.

The underlying check walks every reachable node in the object graph and confirms each is frozen. Accessor descriptors (F4/I1) cause the check to fail — a getter could return a fresh mutable value on each call, so deep-immutability cannot be proven.

## When to use

- Enforcing invariants at function boundaries: throw fast rather than propagate a partially-mutable value deeper into a call stack.
- Entry guards in a module that expects fully-frozen input and has no safe fallback.
- Tests that must assert a specific freeze contract: cleaner than `expect(isDeepFrozen(x)).toBe(true)` because the thrown error message immediately identifies what failed.
- Validating the output of a custom freeze routine before returning it to a caller.

## When not to use

- When you want to branch on the result rather than throw — use [`isDeepFrozen`](/verification/is-deep-frozen) and handle both branches.
- When the value may legitimately have accessor descriptors — `assertDeepFrozen` will throw for those (F4/I1). Either restructure the data to use plain data properties or skip the assertion for that path.
- When the input is a Proxy created by `immutableView` — a Proxy is not frozen in the `Object.isFrozen` sense; use [`assertImmutableView`](/verification/assert-immutable-view) instead.

## Guarantees

- Throws `TypeError` if and only if `isDeepFrozen(val)` returns `false`.
- The thrown error message always contains the string `"Object is not deep frozen"`.
- When `label` is provided, the message is `"<label>: Object is not deep frozen"`.
- Returns `void` (no return value) when the check passes.
- All guarantees of `isDeepFrozen` apply: circular references are handled, primitives always pass, accessor descriptors always fail (F4/I1).

## Limitations

- **Accessor descriptors throw (F4/I1).** Any object with a getter or setter causes `assertDeepFrozen` to throw, even if the getter always returns a deeply frozen value. This is the same conservative behavior as `isDeepFrozen`.
- **Map/Set internal slots are invisible.** A frozen Map shell passes the check even though `.set()` and `.delete()` still work on its internal slot.
- **Private class fields.** Mutations through private instance methods are undetectable — the assertion does not cover them.
- **No information about which property failed.** The error message does not name the failing node. For diagnosing partial-freeze bugs, call `isDeepFrozen` directly in a debugger to step through the traversal.

## Example

**Guard at module boundary:**

```ts
import { deepFreeze, assertDeepFrozen } from 'constancy';

function registerConfig(cfg: unknown) {
  assertDeepFrozen(cfg, 'registerConfig');
  // cfg is guaranteed fully frozen from this point on
}

const good = deepFreeze({ port: 3000, debug: false });
registerConfig(good); // ok

const bad = Object.freeze({ nested: { val: 1 } }); // nested NOT frozen
registerConfig(bad);
// TypeError: registerConfig: Object is not deep frozen
```

**Label makes the throw site obvious:**

```ts
import { assertDeepFrozen } from 'constancy';

assertDeepFrozen(myObj, 'AppConfig');
// If myObj is not deep frozen:
// → TypeError: AppConfig: Object is not deep frozen
```

**Primitives always pass:**

```ts
import { assertDeepFrozen } from 'constancy';

assertDeepFrozen(42);     // ok
assertDeepFrozen('str');  // ok
assertDeepFrozen(null);   // ok
```

**Accessor descriptor always throws (F4/I1):**

```ts
import { deepFreeze, assertDeepFrozen } from 'constancy';

const obj = deepFreeze({
  get computed() { return { fresh: true }; },
});

assertDeepFrozen(obj);
// TypeError: Object is not deep frozen
// (accessor descriptor cannot be proven deep-frozen)
```

## Comparison with related APIs

| | `assertDeepFrozen` | `isDeepFrozen` | `assertImmutableView` |
|---|---|---|---|
| **Returns** | `void` | `boolean` | `void` |
| **Throws?** | Yes — `TypeError` | Never | Yes — `TypeError` |
| **Label param?** | Yes | No | Yes |
| **Checks** | Freeze status of every node | Same, returning boolean | WeakSet registry (Proxy identity) |
| **Accessor handling** | Throws (F4/I1) | Returns `false` | N/A |

## Common mistakes

- **Using `assertDeepFrozen` on an `immutableView` result.** A Proxy returned by `immutableView` is not frozen — `Object.isFrozen(proxy)` is `false`. The assertion will throw. Use [`assertImmutableView`](/verification/assert-immutable-view) to check Proxy provenance.
- **Expecting the label to appear in `error.name`.** The label is part of `error.message`, not `error.name`. The error name is always `"TypeError"`.
- **Passing an object with accessor properties and expecting it to pass.** Accessor descriptors are treated as unprovable — the assertion throws (F4/I1). Remove or flatten the getter before asserting, or use `isDeepFrozen` to branch instead.

## Type signature

```ts
function assertDeepFrozen(val: unknown, label?: string): void
```

- `val` — any value; primitives pass unconditionally.
- `label` — optional string prefix for the error message.

## See also

- [`isDeepFrozen`](/verification/is-deep-frozen) — non-throwing boolean predicate
- [`deepFreeze`](/freeze/deep-freeze) — make an object graph deeply frozen
- [`assertImmutableView`](/verification/assert-immutable-view) — throws when a value is not an `immutableView` Proxy
- [`checkRuntimeIntegrity`](/verification/check-runtime-integrity) — detect post-import builtin tampering
