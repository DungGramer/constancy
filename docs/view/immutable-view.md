---
title: immutableView
description: Wrap any value in a deeply immutable Proxy — all mutations throw, nested objects wrapped lazily on access.
lastReviewed: 2026-04-17
sourceLocale: en
translationStatus: synced
---

# immutableView

> **VIEW != SNAPSHOT.** The original reference stays mutable. If you retain a direct reference to the source object, you can still mutate it — the view only blocks mutation _through the proxy_. Use [`snapshot`](/snapshot/snapshot) for a fully independent copy, or `vault()` for closure-sealed isolation.

## What it does

`immutableView` wraps a value in a `Proxy` that intercepts every mutation operation and throws a `TypeError`. Nested objects are wrapped lazily on first property access, not upfront, so the O(1) wrap cost is paid once at the top level. The proxy is cached in a `WeakMap` so the same target always returns the identical proxy reference.

Primitive values (`number`, `string`, `boolean`, `null`, `undefined`, `symbol`, `bigint`) pass through unchanged — only object values get a proxy.

All 13 Proxy traps are handled:

- **`set` / `deleteProperty` / `defineProperty` / `setPrototypeOf` / `preventExtensions`** — throw `TypeError` unconditionally.
- **`get`** — returns proxied nested objects for freezable values; returns the raw value for primitives. Mutator methods on built-in collection types (`Map`, `Set`, `WeakMap`, `WeakSet`, `Array`, `Date`) are replaced with throwing stubs.
- **`apply`** — validates the call-site receiver (V1): rejects any mutable object receiver that is neither the original target nor another immutable view.
- **`construct`** — throws `TypeError` unconditionally; an immutable view of a constructor must not manufacture mutable instances (V1).
- **`getPrototypeOf` / `has` / `ownKeys` / `getOwnPropertyDescriptor` / `isExtensible`** — forward to the target through cached `Reflect.*` bindings (V2), wrapping any freezable values before returning.

## When to use

- You want to hand a read-only reference to a shared data structure without cloning it.
- You need the consumer to see live updates through the view (the underlying data can change; the view reflects the current state).
- You are wrapping a function or constructor and need to ensure callers cannot misuse it with a mutable receiver.
- You want to protect against accidental mutation in code that receives a config or state object it should not own.

## When not to use

- You need a completely independent copy that cannot be affected by changes to the original — use [`snapshot`](/snapshot/snapshot) (deep clone + freeze).
- You need runtime immutability baked into the object itself (no proxy) — use [`deepFreeze`](/freeze/deep-freeze).
- You need collection-specific read-only semantics with predictable snapshot-at-construction isolation — use [`immutableMapView`](/view/immutable-map-view) or [`immutableSetView`](/view/immutable-set-view).
- The value contains non-cloneable internal slots where a proxy alone is insufficient and the view needs to block methods via class internals.

## Guarantees

- **All structural mutations throw.** Property set, delete, define, prototype reassignment, and `preventExtensions` all throw `TypeError` through the proxy.
- **Nested objects are wrapped transitively.** Accessing a property that holds an object returns another proxy; mutation on that nested proxy also throws.
- **Proxy invariant respected.** For `non-writable + non-configurable` own property descriptors, the `get` trap returns the exact original value (required by the ECMAScript Proxy invariant §10.5.8). The wrapped value is not re-wrapped in that case.
- **Collection mutators blocked.** `Map.set/delete/clear`, `Set.add/delete/clear`, `WeakMap.set/delete`, `WeakSet.add/delete`, `Array.push/pop/shift/unshift/splice/sort/reverse/fill/copyWithin`, and all `Date.set*` methods are replaced with throwing stubs.
- **Subclass mutators denied by default (V3).** For objects with internal slots (`Map`, `Set`, `WeakMap`, `WeakSet`, `Date`), any function-typed property not on the explicit read-method allow-list is blocked. This closes the bypass where `class Evil extends Map { sneakSet(k,v){this.set(k,v)} }` would previously call through to the raw target.
- **Apply trap requires safe receiver (V1).** When calling a wrapped function, the `this` argument must be `null`, `undefined`, the original target, or another immutable view proxy. Any other object receiver causes an immediate `TypeError` to prevent `evil.call(target)` mutations.
- **Construct trap blocks `new view(...)` (V1).** Calling `new` on an immutable view of a constructor always throws. A view should not manufacture mutable instances.
- **`toJSON` suppression opt-in (V5).** By default `JSON.stringify` calls the target's `toJSON()` directly, bypassing the proxy traps. An attacker-supplied `toJSON` could forge the serialized output. Pass `{ blockToJSON: true }` to make the `get` trap return `undefined` for the `toJSON` key, forcing `JSON.stringify` to walk own enumerable properties through the proxy instead.
- **Cached builtins (V2).** All `Reflect.*` calls inside the proxy handler use module-level cached references captured at import time. Post-import poisoning of `Reflect.get` etc. does not affect the view.

## Limitations

- **VIEW, not snapshot (V8).** Retaining the original reference allows mutation through it. The view reflects those changes immediately. This is by design for live-reference use cases; it is a hazard when you intended isolation.
- **`blockToJSON` is opt-in.** Without it, `JSON.stringify(view)` invokes `toJSON()` on the real target. This is a documented backward-compatible default (V5).
- **Symbol-keyed mutator methods not blocked (V4).** `getBlockedMutator` only inspects string-keyed properties. A hypothetical future spec method named with a Symbol would not be caught by the deny list. No current built-in mutator uses a Symbol key.
- **Subclass deny-by-default covers Map/Set/WeakMap/WeakSet/Date only (V3).** Custom subclasses of plain objects or `Array` are not subject to the allow-list check — only types with internal slots trigger the deny-by-default path.
- **Iterator objects themselves are not protected (V7).** `view.values()` returns a generator. The generator's `.next` property is writable — an attacker who holds the iterator reference can overwrite `.next` to forge yielded values. The _values_ yielded by an unmodified iterator are correctly wrapped proxies.
- **Accessor getters can return fresh mutable objects.** The `get` trap wraps the returned value in a proxy, but a getter that returns a new object on each call will return a new proxy each time — the original returned object is not frozen.
- **Non-cloneable values are not an issue** — `immutableView` never clones; it only wraps. Functions, Symbols, DOM nodes, and other non-structured-cloneable values work fine.

## Example

**Basic object protection:**

```ts
import { immutableView } from 'constancy';

const config = { db: { host: 'localhost', port: 5432 } };
const view = immutableView(config);

view.db.port = 9999;        // TypeError: Cannot set property "port": object is immutable
view.db.host;               // 'localhost' — reads work

// Original still mutable through direct reference (V8):
config.db.port = 9999;
console.log(view.db.port); // 9999 — view reflects the change
```

**Map/Set through immutableView:**

```ts
const m = new Map([['role', 'viewer']]);
const view = immutableView(m);

view.get('role');           // 'viewer'
view.set('role', 'admin'); // TypeError: Cannot set: object is immutable

// Subclass mutator denied by default (V3):
class ExtMap extends Map {
  sneakSet(k: string, v: string) { this.set(k, v); }
}
const em = immutableView(new ExtMap([['k', 'safe']]));
(em as any).sneakSet('k', 'pwned'); // TypeError: Cannot invoke subclass method "sneakSet": object is immutable
```

**`blockToJSON` — V5 mitigation:**

```ts
const obj = {
  safe: 1,
  toJSON() { return { safe: 'FORGED', secret: 'EXFIL' }; },
};

// Default: toJSON() is called — proxy traps never fire for it
const defaultView = immutableView(obj);
JSON.stringify(defaultView); // '{"safe":"FORGED","secret":"EXFIL"}'

// With blockToJSON: toJSON hidden, default serialization used
const safeView = immutableView(obj, { blockToJSON: true });
JSON.stringify(safeView);    // '{"safe":1}'
```

**Apply/construct traps — V1 mitigation:**

```ts
function greet(this: { name: string }) { return `Hello, ${this.name}`; }
const viewFn = immutableView(greet);

// Safe receiver (another immutable view) — allowed
const person = immutableView({ name: 'Alice' });
viewFn.call(person); // 'Hello, Alice'

// Mutable receiver — rejected
viewFn.call({ name: 'Bob' }); // TypeError: Cannot apply function with a mutable receiver: object is immutable

class Widget {}
const ViewWidget = immutableView(Widget);
new (ViewWidget as any)(); // TypeError: Cannot construct from immutable view: object is immutable
```

## Comparison with related APIs

| | `immutableView` | `deepFreeze` | `snapshot` | `immutableMapView` |
|---|---|---|---|---|
| **Mutates original?** | No (Proxy wrap) | Yes (freezes it) | No (clones first) | No (copies entries) |
| **Severs reference?** | No | No | Yes | Yes (at construction) |
| **Sees source updates?** | Yes | N/A (frozen) | No | No |
| **Map/Set slot blocking** | Yes (via Proxy traps) | No | No | Yes (class methods absent) |
| **Subclass mutator deny** | Yes (allow-list V3) | No | N/A | N/A |
| **Wrap cost** | O(1) | O(n) | O(n) clone | O(n) copy entries |
| **`toJSON` bypass** | Opt-in block (V5) | N/A | N/A | N/A |

## Common mistakes

- **"I passed the view to a library — the library mutated the original data."** A library that retains the original reference (not the view) can still mutate. `immutableView` only protects the view reference. If you need full isolation, use `snapshot`.
- **"My `class Evil extends Map` method got through before v3.0.1."** The V3 fix adds deny-by-default for function-typed properties on slotted types. Upgrade to v3.0.1; then any function prop not in the read-method allow-list is blocked.
- **"`JSON.stringify(view)` returned forged data."** The target's `toJSON()` method is called by `JSON.stringify` before the Proxy get trap fires. Use `immutableView(obj, { blockToJSON: true })` to suppress it (V5).
- **"I wrapped a constructor and called `new view()` — why no instance?"** The construct trap throws unconditionally. Wrapping a constructor does not give you a safe factory; it gives you a view that refuses to construct.
- **"I see the nested value changed after I got a reference to it."** The view wraps lazily — each property access returns a proxy of the _current_ property value. Wrapping is not a snapshot.

## Type signature

```ts
interface ImmutableViewOptions {
  readonly blockToJSON?: boolean;
}

function immutableView<T>(
  val: T,
  options?: ImmutableViewOptions,
): T extends object ? DeepReadonly<T> : T
```

`DeepReadonly<T>` recursively marks every nested object property as `readonly` in the TypeScript type system, mirroring the Proxy-enforced runtime behavior. Primitives return as `T` unchanged (no proxy is created).

`isImmutableView(val)` — returns `true` if `val` is a Proxy created by `immutableView`. Uses a private `WeakSet` registry; unforgeable from outside the module.

`assertImmutableView(val, label?)` — throws `TypeError` if `val` is not an immutable view proxy. `label` is prepended to the error message.

## See also

- [`immutableMapView`](/view/immutable-map-view) — dedicated read-only Map with defensive copy at construction
- [`immutableSetView`](/view/immutable-set-view) — dedicated read-only Set with defensive copy at construction
- [`deepFreeze`](/freeze/deep-freeze) — mutates the original by freezing every reachable node
- [`snapshot`](/snapshot/snapshot) — deep clone + deepFreeze; severs the original reference
- [Security Audit](/reference/security-audit) — V1, V2, V3, V5 vectors and fix history
