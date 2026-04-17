---
title: isImmutableView
description: Returns true if and only if the value is a Proxy created by immutableView() — uses an unforgeable private WeakSet registry, not a magic property.
lastReviewed: 2026-04-17
sourceLocale: en
translationStatus: synced
---

# isImmutableView

## What it does

`isImmutableView` checks whether a value belongs to the private `immutableRegistry` WeakSet that is maintained by the `immutable-view` module. Every Proxy created by `immutableView()` (including variants created internally during lazy wrapping of nested objects) is registered in that WeakSet at creation time. External code has no way to add entries to the WeakSet — it is a module-level `const` that is never exported.

For non-object values (primitives, `null`) the function immediately returns `false` without consulting the registry. For objects, it calls `WeakSet.prototype.has` on the private set and returns the result.

This function never throws.

## When to use

- Confirming that a value received at a module boundary actually came from `immutableView()` before relying on its mutation-blocking behavior.
- Writing defensive library code that branches on whether an argument is already an immutable view so it does not double-wrap.
- Logging or diagnostics: human-readable indication of the provenance of an object at runtime.
- Test assertions: verifying that a factory function returns an immutable view.

## When not to use

- Checking whether an object is frozen — use [`isDeepFrozen`](/verification/is-deep-frozen). An immutable view Proxy is **not** frozen in the `Object.isFrozen` sense.
- Checking whether an object cannot be mutated in all circumstances — `isImmutableView` returning `true` means the mutations are blocked *through this Proxy reference*. The underlying object may still be mutated through the original reference if the caller retained it.
- When you want a throwing guard — use [`assertImmutableView`](/verification/assert-immutable-view).

## Guarantees

- Returns `true` only for Proxy objects that were registered by the `immutable-view` module at creation time.
- The registry is a module-level private WeakSet — external code cannot forge a registration by setting a property on an object.
- A plain object `{ _isImmutableView: true }` returns `false` — the check is identity-based, not property-based.
- Nested Proxy objects created during lazy wrapping of sub-trees are also registered and return `true`.
- Primitives and `null` always return `false`.
- Never throws.

## Limitations

- **VIEW provenance only — not a mutation guarantee.** `isImmutableView(x)` returning `true` means x is a Proxy from `immutableView()`. It does not mean the underlying data cannot be changed through another reference. If the caller retains the original object, they can still mutate it; those changes are visible through the view.
- **Post-import Proxy tampering.** If `globalThis.Proxy` is replaced after the module loads, the cached `_Proxy` constructor (used to create views) differs from the tampered one. Existing views created before the tampering still return `true`; new `immutableView()` calls continue to use `_Proxy`. `checkRuntimeIntegrity()` detects this case (I2).
- **Cross-realm Proxies.** A Proxy created by `immutableView` in a different realm (for example, a different `vm.createContext()` sandbox) has its own WeakSet registry. `isImmutableView` in the host realm returns `false` for cross-realm proxies.
- **Only covers `immutableView` family.** `immutableMapView` and `immutableSetView` use a separate implementation (`immutable-collection-views.ts`) and do not register in this WeakSet. Those are class instances, not Proxies, and `isImmutableView` returns `false` for them.

## Example

**Basic detection:**

```ts
import { immutableView, isImmutableView } from 'constancy';

const raw  = { data: [1, 2, 3] };
const view = immutableView(raw);

console.log(isImmutableView(raw));   // false — plain object
console.log(isImmutableView(view));  // true  — registered Proxy

// Nested objects are also views:
console.log(isImmutableView(view.data)); // true — lazy-wrapped on access
```

**Cannot be forged with a property:**

```ts
import { isImmutableView } from 'constancy';

const fake = { _isImmutableView: true };
console.log(isImmutableView(fake)); // false — not in the WeakSet
```

**Avoid double-wrapping:**

```ts
import { immutableView, isImmutableView } from 'constancy';

function ensureView<T extends object>(obj: T) {
  return isImmutableView(obj) ? obj : immutableView(obj);
}

const view = immutableView({ x: 1 });
ensureView(view); // returns view unchanged — not double-wrapped
```

**Primitives return `false`:**

```ts
import { isImmutableView } from 'constancy';

console.log(isImmutableView(42));        // false
console.log(isImmutableView('hello'));   // false
console.log(isImmutableView(null));      // false
console.log(isImmutableView(undefined)); // false
```

## Comparison with related APIs

| | `isImmutableView` | `isDeepFrozen` | `assertImmutableView` |
|---|---|---|---|
| **Returns** | `boolean` | `boolean` | `void` |
| **Throws?** | Never | Never | Yes — `TypeError` |
| **Check mechanism** | Private WeakSet registry | `Object.isFrozen` on each node | Same WeakSet, throwing wrapper |
| **Forgeable?** | No — module-private WeakSet | N/A — checks freeze flag | No |
| **Covers nested objects?** | Yes — lazy-registered on access | Yes — traversed by isDeepFrozen | Yes |

## Common mistakes

- **"I called `isImmutableView` on `view.child` and got `false`."** Nested objects are wrapped lazily on first access. A nested sub-object only becomes a registered view after you access it through the Proxy. Access it once first (`view.child`), then `isImmutableView(view.child)` returns `true`.
- **"I expected a frozen object to also be an immutable view."** They are different mechanisms: `deepFreeze` mutates the object and sets the frozen flag; `immutableView` wraps without freezing. A frozen object is not in the immutableView registry; an immutable view is not `Object.isFrozen`.
- **"I expected `isImmutableView` to detect immutableMapView/immutableSetView."** Those are separate class-based wrappers with their own `ImmutableMap`/`ImmutableSet` types, not Proxy-based. This function only covers the Proxy registry from `immutable-view.ts`.

## Type signature

```ts
function isImmutableView(val: unknown): boolean
```

## See also

- [`assertImmutableView`](/verification/assert-immutable-view) — throws `TypeError` when this predicate returns `false`
- [`immutableView`](/view/immutable-view) — creates the Proxy views this function detects
- [`isDeepFrozen`](/verification/is-deep-frozen) — check whether every node in the graph is frozen
- [`checkRuntimeIntegrity`](/verification/check-runtime-integrity) — detect whether `Proxy` itself has been tampered with (I2)
