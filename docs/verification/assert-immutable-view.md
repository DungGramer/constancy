---
title: assertImmutableView
description: Throws TypeError if a value is not a Proxy registered by immutableView(). Symmetric throwing wrapper over isImmutableView.
lastReviewed: 2026-04-17
sourceLocale: en
translationStatus: synced
---

# assertImmutableView

## What it does

`assertImmutableView` calls [`isImmutableView`](/verification/is-immutable-view) on the given value. If that predicate returns `false`, it throws a `TypeError` with the message `"Not an immutable view"`. When a `label` is provided, the message is prefixed as `"<label>: Not an immutable view"`. If the value is in the private `immutableRegistry` WeakSet — meaning it is a Proxy created by `immutableView()` — the function returns `void` normally.

The underlying check is identity-based using a module-private WeakSet. External code cannot forge a passing result by setting properties on an object.

## When to use

- Enforcing at a function boundary that an argument must be an immutable view Proxy, failing fast rather than propagating an unsupported value type.
- Internal library assertions: verifying that a factory or middleware layer correctly wraps output before returning.
- Test assertions: confirming that a helper function returns an immutable view, with a clear thrown error message when it does not.
- Layered security patterns: requiring that all data handed to a sensitive subsystem arrives as an immutable view.

## When not to use

- When you want to branch on the result — use [`isImmutableView`](/verification/is-immutable-view) and handle both cases.
- When you want to check if an object is frozen rather than proxy-wrapped — use [`assertDeepFrozen`](/verification/assert-deep-frozen). Immutable views are Proxies, not frozen objects; `Object.isFrozen(immutableView(obj))` is `false`.
- When you need to check `immutableMapView`/`immutableSetView` instances — those are class instances, not Proxy views; this function returns `false` (and throws) for them.

## Guarantees

- Throws `TypeError` if and only if `isImmutableView(val)` returns `false`.
- The thrown error message always contains `"Not an immutable view"`.
- When `label` is provided, the message is `"<label>: Not an immutable view"`.
- Returns `void` when the check passes.
- The registry check is unforgeable from outside the module — a plain object with any property set will not pass.
- Primitives and `null` always throw, as they are never in the WeakSet.

## Limitations

- **Passing does not imply the underlying data is safe.** The assertion confirms provenance (this value came from `immutableView()`), not that the underlying object is deeply frozen. If the caller retained the original reference, they can still mutate the underlying data.
- **Cross-realm views.** A view created in another realm (separate `vm.createContext`) has a different WeakSet registry; `assertImmutableView` in the host realm will throw for it.
- **No coverage of `immutableMapView`/`immutableSetView`.** Those are class-based wrappers. The assertion always throws for them.

## Example

**Guard at a subsystem boundary:**

```ts
import { immutableView, assertImmutableView } from 'constancy';

function processData(data: unknown) {
  assertImmutableView(data, 'processData');
  // data is a registered immutableView Proxy from here on
}

const view = immutableView({ results: [1, 2, 3] });
processData(view); // ok

processData({ results: [1, 2, 3] });
// TypeError: processData: Not an immutable view
```

**Label identifies the assert site in logs:**

```ts
import { assertImmutableView } from 'constancy';

assertImmutableView(apiResponse, 'validateApiResponse');
// If apiResponse is not a view:
// → TypeError: validateApiResponse: Not an immutable view
```

**Primitives always throw:**

```ts
import { assertImmutableView } from 'constancy';

assertImmutableView(42);
// TypeError: Not an immutable view
```

**Cannot be fooled by a crafted object:**

```ts
import { assertImmutableView } from 'constancy';

const fake = Object.create(null);
(fake as any)._isImmutableView = true;
assertImmutableView(fake);
// TypeError: Not an immutable view — WeakSet check, not property check
```

## Comparison with related APIs

| | `assertImmutableView` | `isImmutableView` | `assertDeepFrozen` |
|---|---|---|---|
| **Returns** | `void` | `boolean` | `void` |
| **Throws?** | Yes — `TypeError` | Never | Yes — `TypeError` |
| **Label param?** | Yes | No | Yes |
| **Check mechanism** | Private WeakSet (Proxy identity) | Same, returning boolean | `Object.isFrozen` on each node |
| **Forgeable?** | No | No | N/A |
| **Covers Map/Set views** | No | No | No (different check) |

## Common mistakes

- **Asserting on the original object instead of the view.** `assertImmutableView(raw)` will always throw — the registry entry is on the Proxy returned by `immutableView(raw)`, not on `raw` itself.
- **Assuming passing means deep-frozen.** Immutable views block mutation through the Proxy. They do not freeze the underlying object. `Object.isFrozen(view)` is `false`. Use [`assertDeepFrozen`](/verification/assert-deep-frozen) if freeze status matters.
- **Using this to check `immutableMapView` / `immutableSetView`.** Those class-based wrappers are not registered in the Proxy WeakSet. The assertion will throw for them.

## Type signature

```ts
function assertImmutableView(val: unknown, label?: string): void
```

- `val` — any value; only registered Proxy objects from `immutableView()` pass.
- `label` — optional string prefix added to the error message on failure.

## See also

- [`isImmutableView`](/verification/is-immutable-view) — non-throwing boolean predicate
- [`immutableView`](/view/immutable-view) — creates the Proxy views this function validates
- [`assertDeepFrozen`](/verification/assert-deep-frozen) — throws when a value is not deeply frozen
- [`checkRuntimeIntegrity`](/verification/check-runtime-integrity) — detect whether `Proxy` itself has been tampered with (I2)
