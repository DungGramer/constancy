---
title: deepFreeze
description: Recursively freeze every reachable object in a graph — handles circular refs, Symbol keys, and optional prototype chain freezing.
lastReviewed: 2026-04-17
sourceLocale: en
translationStatus: synced
---

# deepFreeze

## What it does

`deepFreeze` recursively walks every reachable value in the object graph and calls `Object.freeze` on each node, visiting children before parents (bottom-up order). Circular references are tracked in a `WeakSet` — revisited nodes are silently skipped, so no stack overflow occurs. Both string-keyed and Symbol-keyed own properties are traversed via `Reflect.ownKeys`. Non-empty TypedArrays are skipped entirely (freezing a non-empty TypedArray throws in Node). Accessor descriptors (getters/setters) are skipped to prevent side effects during the freeze pass. The optional `freezePrototypeChain` flag extends traversal to each visited object's prototype, blocking post-freeze prototype poisoning (F1). Primitives pass through unchanged.

## When to use

- You own the entire data graph and need runtime immutability at every depth.
- Application state that must not be mutated after initialization.
- Configuration objects passed across module boundaries where consumers must not modify nested values.
- Security-sensitive objects where you want to block prototype poisoning — use `{ freezePrototypeChain: true }` (F1).
- Anywhere `Object.isFrozen(obj.nested)` needs to return `true`.

## When not to use

- Shared references where the original reference is retained by another party and you don't want to affect their copy — use [`immutableView`](/view/immutable-view) instead (wraps without freezing).
- When you need an independent copy that can diverge — use [`snapshot`](/snapshot/snapshot) (deep clone + freeze).
- Objects containing `Map` or `Set` where you need to block `.set()`/`.add()` — use [`immutableMapView`](/view/immutable-map-view) or [`immutableSetView`](/view/immutable-set-view).
- Objects containing non-empty TypedArrays where byte-level immutability is required — `deepFreeze` skips the TypedArray body (F3).

## Guarantees

- Every reachable object in the graph (own-property values, Symbol-keyed values) is frozen.
- Circular references do not cause a stack overflow — the WeakSet guard ensures each node is visited at most once.
- Symbol-keyed properties are traversed and their values frozen when freezable.
- Accessor descriptors (getters/setters) are preserved intact; the object they belong to is still frozen.
- With `{ freezePrototypeChain: true }`: every visited object's prototype is also frozen, blocking post-freeze prototype poisoning (F1). The canonical built-in prototypes (`Object.prototype`, `Function.prototype`, `Array.prototype`) are never frozen to avoid breaking the runtime.
- Primitives are returned unchanged without any freeze call.

## Limitations

- **Map/Set internal slots remain mutable (F2/F2b).** After `deepFreeze`, the Map/Set object shell is frozen (no new own properties), but the `[[MapData]]`/`[[SetData]]` internal slots are not — `.set()`, `.add()`, `.delete()`, and `.clear()` still work. Use [`immutableMapView`](/view/immutable-map-view) or [`immutableSetView`](/view/immutable-set-view) for true collection immutability.
- **TypedArray byte data mutable after freeze (F3).** Non-empty TypedArrays cannot be frozen by `Object.freeze` (throws in Node ≥20), so `deepFreeze` skips them. Indexed writes to the underlying buffer succeed even after freezing the containing object.
- **Accessor getters can return fresh mutable objects on each call (F5).** Getter bodies run at call time, not during freeze. Each invocation of `obj.accessor` can return a new unfrozen object. `isDeepFrozen` correctly returns `false` for objects with accessor descriptors.
- **Private class fields `#foo` are unaffected (F8).** Private fields live in per-instance private slots outside the object's property graph. Methods that mutate `#data` on the instance continue to work after `deepFreeze`.
- **Revocable Proxy as a leaf: revocation still possible post-freeze (F9).** If a Proxy created with `Proxy.revocable` is reachable in the graph, `deepFreeze` freezes the proxy object shell, but the revoke function is unaffected. Calling `revoke()` after freeze turns all property accesses into `TypeError`.

## Example

**Happy path — nested config:**

```ts
import { deepFreeze } from 'constancy';

const config = deepFreeze({
  server: { host: 'localhost', port: 3000 },
  flags: ['beta', 'dark-mode'],
});

config.server.port = 9999;   // TypeError in strict mode
config.flags.push('new');    // TypeError in strict mode
```

**Opt-in prototype chain freeze (F1 mitigation):**

```ts
class Box {
  value = 1;
  greet() { return 'hi'; }
}

const b = new Box();
deepFreeze(b, { freezePrototypeChain: true });

// Box.prototype is now frozen:
Box.prototype.greet = () => 'PWNED'; // TypeError
b.greet(); // 'hi' — safe
```

**Map/Set limitation demo:**

```ts
const m = new Map([['key', 1]]);
deepFreeze(m);

// Object shell is frozen — cannot add own props:
(m as any).extra = true; // TypeError

// But internal slot is alive:
m.set('key', 999); // Works — Map slots bypass Object.freeze
console.log(m.get('key')); // 999
// Use immutableMapView(m) for full protection.
```

**Circular reference handled cleanly:**

```ts
const node: Record<string, unknown> = { id: 1 };
node.self = node; // circular

deepFreeze(node); // No stack overflow
console.log(Object.isFrozen(node)); // true
```

## Comparison with related APIs

| | `freezeShallow` | `deepFreeze` | `immutableView` | `snapshot` |
|---|---|---|---|---|
| **Mutates original?** | Yes (freezes it) | Yes (freezes it) | No (Proxy wrap) | No (clones first) |
| **Severs reference?** | No | No | No | Yes |
| **Depth** | Top-level only | Full graph | Full graph (via Proxy) | Full graph |
| **Map/Set slots** | Unaffected | Unaffected | Blocked by Proxy | Unaffected in clone |
| **Cost** | O(1) | O(n) | O(1) wrap | O(n) clone + O(n) freeze |

## Common mistakes

- **"I froze the Map — why does `.set()` work?"** `deepFreeze` freezes the Map object shell but cannot reach `[[MapData]]`. The internal slot is a runtime mechanism outside `Object.freeze`'s reach. Use `immutableMapView(map)` or `immutableSetView(set)` to proxy-block the mutator methods (F2/F2b).
- **"I froze a `User` instance but an attacker still patched `User.prototype`."** By default `deepFreeze` only traverses own properties. Prototype methods live on `User.prototype`, not the instance. Pass `{ freezePrototypeChain: true }` to also freeze the prototype and its chain (F1).
- **"I expected `obj.accessor` to return a frozen value."** Getters are skipped during the freeze walk to avoid triggering side effects. The object returned by a getter is a fresh value produced at call time — it is not frozen. `isDeepFrozen(obj)` returns `false` when the object has accessor descriptors (F5).

## Type signature

```ts
interface DeepFreezeOptions {
  readonly freezePrototypeChain?: boolean;
}

function deepFreeze<T>(val: T, options?: DeepFreezeOptions): T extends object ? DeepReadonly<T> : T
```

`DeepReadonly<T>` recursively marks every nested object property as `readonly` in the TypeScript type system, mirroring the runtime freeze. Primitives return as `T` unchanged.

## See also

- [`freezeShallow`](/freeze/freeze-shallow) — single-level freeze, O(1) cost
- [`immutableMapView`](/view/immutable-map-view) — Proxy-based read-only Map (blocks `.set()`/`.delete()`)
- [`immutableSetView`](/view/immutable-set-view) — Proxy-based read-only Set (blocks `.add()`/`.delete()`)
- [`snapshot`](/snapshot/snapshot) — deep clone + deepFreeze (severs original reference)
- [`isDeepFrozen`](/verification/is-deep-frozen) — check whether all reachable objects are frozen
- [`assertDeepFrozen`](/verification/assert-deep-frozen) — throw if not fully frozen
