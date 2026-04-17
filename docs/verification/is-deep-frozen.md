---
title: isDeepFrozen
description: Returns true only when a value and every reachable descendant object are frozen. Returns false for accessor descriptors — cannot prove the getter returns a frozen value.
lastReviewed: 2026-04-17
sourceLocale: en
translationStatus: synced
---

# isDeepFrozen

## What it does

`isDeepFrozen` walks a value and every reachable object in its property graph, checking that each node is frozen via `Object.isFrozen`. Circular references are tracked in a `WeakSet` — revisited nodes are treated as frozen (the cycle was already processed) and do not cause infinite recursion. Both string-keyed and Symbol-keyed own properties are traversed via `Reflect.ownKeys`. Primitives (`null`, `undefined`, numbers, strings, booleans, bigints, symbols) are always considered deeply frozen and return `true` immediately.

**Accessor handling (F4/I1):** If any node has an accessor descriptor (getter or setter), `isDeepFrozen` returns `false`. A getter could return a fresh, unfrozen object on each call — invoking it to check would introduce side effects and is therefore unsafe. Returning `false` conservatively is correct: deep-immutability cannot be proven without inspecting the getter's output.

This function never throws.

## When to use

- Asserting at a boundary that data received from an external source is fully frozen before trusting it.
- Debugging why `Object.isFrozen(obj)` returns `true` at the top level but a nested object is still mutable.
- Unit tests: verifying that a `deepFreeze` call reached every node of a complex graph.
- Guard conditions in library code that must reject partially-frozen input.

## When not to use

- When you need a throwing guard — use [`assertDeepFrozen`](/verification/assert-deep-frozen), which wraps this function and throws `TypeError` on `false`.
- When the object contains accessor properties that you expect to be "frozen enough" — this function returns `false` conservatively (F4/I1). Either restructure the object to use data properties, or skip the check for that subtree.
- For checking whether a value is an immutable-view Proxy — use [`isImmutableView`](/verification/is-immutable-view). A Proxy is not frozen in the `Object.isFrozen` sense.

## Guarantees

- Returns `true` if and only if every reachable data-property value in the graph is frozen.
- Returns `false` for any node that is not frozen, contains a mutable nested object, or has an accessor descriptor (F4/I1).
- Circular reference cycles do not cause a stack overflow or incorrect results.
- Symbol-keyed properties are traversed — a Symbol-keyed mutable object causes `false`.
- Primitives always return `true`.
- Never throws.

## Limitations

- **Accessor descriptors cause `false` (F4/I1).** If the object has `get`/`set` descriptors, `isDeepFrozen` returns `false` regardless of how the getter behaves. This is intentional: without invoking the getter, deep-immutability cannot be verified.
- **Map/Set internal slots are invisible.** An object whose property graph only contains a frozen Map will report `true`, but the Map's `[[MapData]]` slot is still mutable. `isDeepFrozen` cannot see internal slots.
- **Private class fields are not inspected.** Private fields (`#prop`) live outside the property graph; their mutability is invisible to `Reflect.ownKeys`.
- **Revocable Proxies.** If a Proxy created with `Proxy.revocable()` appears in the graph, `Object.isFrozen` is called on the proxy object. If the underlying target is frozen, this may return `true`, even though the proxy itself can be revoked later.

## Example

**Objects frozen with `deepFreeze`:**

```ts
import { deepFreeze, isDeepFrozen } from 'constancy';

const config = deepFreeze({ server: { host: 'localhost', port: 3000 } });
console.log(isDeepFrozen(config)); // true

const shallow = Object.freeze({ nested: { val: 1 } });
console.log(isDeepFrozen(shallow)); // false — nested not frozen
```

**Accessor descriptor returns `false` (F4/I1):**

```ts
import { deepFreeze, isDeepFrozen } from 'constancy';

const obj = deepFreeze({
  get computed() { return { mutable: true }; },
});

// Even though obj is frozen at the top level, the accessor
// cannot be proven deep-frozen — isDeepFrozen returns false.
console.log(isDeepFrozen(obj)); // false

// The getter still works:
const leaked = obj.computed; // { mutable: true }
leaked.mutable = false;      // succeeds — not frozen
```

**Circular reference — handled without stack overflow:**

```ts
import { deepFreeze, isDeepFrozen } from 'constancy';

const node: Record<string, unknown> = { id: 1 };
node.self = node;
deepFreeze(node);

console.log(isDeepFrozen(node)); // true — cycle detected, no overflow
```

**Primitives always return `true`:**

```ts
import { isDeepFrozen } from 'constancy';

console.log(isDeepFrozen(42));        // true
console.log(isDeepFrozen('hello'));   // true
console.log(isDeepFrozen(null));      // true
console.log(isDeepFrozen(undefined)); // true
```

## Comparison with related APIs

| | `isDeepFrozen` | `assertDeepFrozen` | `isImmutableView` |
|---|---|---|---|
| **Returns** | `boolean` | `void` (throws on false) | `boolean` |
| **Throws?** | Never | Yes — `TypeError` | Never |
| **Checks** | `Object.isFrozen` on every node | Same check, throwing wrapper | WeakSet registry (Proxy identity) |
| **Accessor handling** | Returns `false` (F4/I1) | Throws (F4/I1) | N/A — not relevant |
| **Use case** | Conditional logic | Invariant enforcement | Proxy provenance detection |

## Common mistakes

- **"I froze the top level — why does `isDeepFrozen` return `false`?"** `Object.freeze` is shallow. Any nested object that was not explicitly frozen or reached by `deepFreeze` remains mutable, causing `false`. Use `deepFreeze` to recurse the entire graph.
- **"My object has a getter — why does `isDeepFrozen` return `false`?"** Accessor descriptors cannot be verified for deep-immutability without invoking the getter, which is a side-effectful operation. The function conservatively returns `false` (F4/I1). Replace the getter with a precomputed data property if you need `true`.
- **"I expected `isDeepFrozen` to throw."** It never throws. Use [`assertDeepFrozen`](/verification/assert-deep-frozen) when you want a `TypeError` on failure.

## Type signature

```ts
function isDeepFrozen(val: unknown): boolean
```

The internal `seen: WeakSet<object>` parameter is an implementation detail for cycle detection and should not be passed by callers.

## See also

- [`assertDeepFrozen`](/verification/assert-deep-frozen) — throws `TypeError` when this predicate returns `false`
- [`deepFreeze`](/freeze/deep-freeze) — recursively freeze every reachable object
- [`isImmutableView`](/verification/is-immutable-view) — check Proxy provenance via WeakSet registry
- [`checkRuntimeIntegrity`](/verification/check-runtime-integrity) — detect post-import builtin tampering
