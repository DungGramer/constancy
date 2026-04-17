---
title: immutableMapView
description: Wrap a Map in a read-only defensive copy — mutation methods absent at the type level, object values deep-frozen on read.
lastReviewed: 2026-04-17
sourceLocale: en
translationStatus: synced
---

# immutableMapView

## What it does

`immutableMapView` constructs an `ImmutableMap` instance that copies all entries from the source `Map` at construction time. Object values are cloned with `structuredClone` so freezing the wrapper's internal copy does not affect the source, and source mutations after construction do not reach the wrapper.

On each read (`.get()`, `.values()`, `.entries()`, `forEach`, `for...of`), object values are deep-frozen lazily. Primitive values are returned as-is.

Mutation methods (`set`, `delete`, `clear`) are simply absent from `ImmutableMap` — they do not exist on the instance or its prototype at all, so TypeScript catches misuse at compile time and runtime access returns `undefined`.

The return type is `ReadonlyMap<K, V>`, the standard TypeScript interface for read-only Map access.

## When to use

- You need a Map snapshot that callers cannot mutate through any reference — the wrapper is isolated from source changes after construction.
- You store object values in a Map and need to guarantee those objects cannot be mutated after wrapping — `deepFreeze` on a Map shell does not block `.set()`, but this wrapper does.
- You want type-level enforcement: `ReadonlyMap<K, V>` removes mutator methods from the inferred type.
- You need predictable iteration semantics: the iterator walks the defensive copy made at construction, not a live view of the source.

## When not to use

- You want a live view that reflects ongoing source mutations — use [`immutableView(someMap)`](/view/immutable-view) instead (Proxy wraps the original without copying).
- The Map contains non-cloneable values (functions, DOM nodes, Symbols as values) — `structuredClone` will throw a `DataCloneError` at construction.
- You have a `WeakMap` — `immutableMapView` accepts only `Map`. For `WeakMap` read-only wrapping, use `immutableView`.
- You only need to block the Map shell's own properties from being added (not the slot methods) — `deepFreeze(map)` is cheaper at O(1) but leaves `.set()` accessible.

## Guarantees

- **Source isolation.** Object values are cloned at construction (`structuredClone`). Subsequent `source.set(k, v)` calls do not affect the wrapper. Calling `source.set(k, 'new')` after wrapping leaves `wrapper.get(k)` returning the original value.
- **Mutation methods absent.** `.set`, `.delete`, and `.clear` do not exist on `ImmutableMap.prototype` — `(view as any).set` is `undefined`. TypeScript enforces this at compile time via `ReadonlyMap<K, V>`.
- **Object values deep-frozen on read.** First access via `.get()`, `.values()`, `.entries()`, `.forEach()`, or `for...of` calls `deepFreeze` on the cloned value. Subsequent reads are idempotent (`Object.freeze` on an already-frozen object is a no-op).
- **Source object values remain mutable.** The constructor clones before freezing — `obj` passed as a Map value is not frozen by wrapping. Only the internal clone is frozen.
- **Prototype frozen at module load (C5).** `Object.freeze(ImmutableMap.prototype)` runs when the module is first imported. An attacker cannot overwrite `ImmutableMap.prototype.get` to hijack every wrapper in the process.
- **`Symbol.toStringTag` is `'ImmutableMap'`.** `Object.prototype.toString.call(view)` returns `'[object ImmutableMap]'`.

## Limitations

- **Snapshot semantics.** The wrapper holds a defensive copy, not a live view. Changes to the source Map after construction are invisible. Use `immutableView(map)` for live-reference semantics.
- **Iterators are fresh at call time.** Each call to `.keys()`, `.values()`, `.entries()`, or `for...of` creates a new generator over the internal copy. Iterators are bounded by the size of that copy — they do not reflect further changes to the wrapper (the wrapper is already immutable, so this is expected).
- **`has()` uses reference identity for objects.** Object values are cloned at construction. Calling `view.has(originalObj)` where `originalObj` was a Map value returns `false` — the wrapper holds a clone with a different reference (C2). Use `has()` reliably only for primitive keys.
- **Non-cloneable values throw at construction (C4).** If any value in the source Map cannot be cloned by `structuredClone` (functions, Symbols, DOM nodes, certain Web APIs), the constructor throws `DataCloneError`. Validate input before wrapping if the source is untrusted.
- **Lazy freeze window (C1).** Values are cloned at construction but not frozen until first read. In the window between construction and first access, the internal clone is unfrozen. Code that bypasses the public API (e.g., via private field access from a subclass) could mutate values in that window. Public API users are not affected.
- **No `WeakMap` support.** `WeakMap` entries are not iterable, so a defensive copy is not possible. Use `immutableView(weakMap)` for Proxy-based WeakMap protection.

## Example

**Basic read operations:**

```ts
import { immutableMapView } from 'constancy';

const source = new Map([
  ['alice', { role: 'admin', active: true }],
  ['bob',   { role: 'viewer', active: false }],
]);

const view = immutableMapView(source);

view.get('alice');          // { role: 'admin', active: true }
view.has('bob');            // true
view.size;                  // 2
[...view.keys()];           // ['alice', 'bob']
[...view.values()];         // [{ role: 'admin', ... }, { role: 'viewer', ... }]

// Mutation methods are absent:
(view as any).set('charlie', {}); // undefined — set does not exist
```

**Source isolation — changes after wrapping are not visible:**

```ts
const source = new Map([['k', 'original']]);
const view = immutableMapView(source);

source.set('k', 'CHANGED');
view.get('k'); // 'original' — wrapper holds the copy
```

**Object values are deep-frozen on read:**

```ts
const source = new Map([['user', { isVip: false }]]);
const view = immutableMapView(source);

const user = view.get('user')!;
user.isVip = true; // TypeError: Cannot assign to read only property 'isVip'

// Source object is unaffected — only the internal clone is frozen:
source.get('user')!.isVip = true; // works — source not frozen
```

**Why `immutableMapView` instead of `immutableView(map)`:**

```ts
const source = new Map([['k', 'v']]);

// immutableView: Proxy over original — live view, no copy
const liveView = immutableView(source);
source.set('k', 'updated');
liveView.get('k'); // 'updated' — reflects source change

// immutableMapView: defensive copy at construction — snapshot
const snap = immutableMapView(source);
source.set('k', 'updated again');
snap.get('k'); // 'updated' — holds the copy from construction time
```

## Comparison with related APIs

| | `immutableMapView` | `immutableView(map)` | `deepFreeze(map)` | `snapshot(map)` |
|---|---|---|---|---|
| **Copies entries?** | Yes (structuredClone) | No (Proxy) | No | Yes (structuredClone) |
| **Sees source updates?** | No | Yes | N/A (map mutated) | No |
| **`.set()` blocked?** | Yes (absent) | Yes (Proxy trap) | No (slot bypasses freeze) | Yes (result is frozen) |
| **Object values frozen?** | Yes (on read) | Yes (via Proxy) | Object shell only | Yes |
| **Type** | `ReadonlyMap<K,V>` | `DeepReadonly<Map>` | `DeepReadonly<Map>` | `DeepReadonly<Map>` |
| **Non-cloneable values?** | DataCloneError | Works | Works | DataCloneError |

## Common mistakes

- **"I called `view.set(...)` — why did it silently do nothing?"** The method does not exist on the `ImmutableMap` prototype at all. `(view as any).set` is `undefined`. You called `undefined(...)`, which throws `TypeError: undefined is not a function`. If you saw no error, you may be checking a different reference.
- **"`view.has(obj)` returns false even though I put `obj` in the Map."** The constructor clones object values. The clone has a different reference identity. `has()` uses `===` identity — it returns `false` for the original. Use `has()` with primitive keys or retrieve cloned references via `.keys()` / `.entries()` first (C2).
- **"Source mutations leaked into the view."** Check that you called `immutableMapView` (copies entries) and not `immutableView(map)` (Proxy — live view). Only the dedicated helper gives you source isolation.
- **"My function stored in the Map caused a `DataCloneError`."** `structuredClone` cannot clone functions, Symbols, DOM nodes, or closures. Pre-process your Map to remove or replace non-cloneable values before wrapping (C4).
- **"I used `deepFreeze(map)` but `.set()` still works."** `Object.freeze` freezes the Map object shell (own properties), not the `[[MapData]]` internal slot. The slot is a runtime mechanism that `Object.freeze` cannot reach. Use `immutableMapView` to block `.set()`.

## Type signature

```ts
class ImmutableMap<K, V> implements ReadonlyMap<K, V> {
  constructor(source: Map<K, V>);
  readonly size: number;
  get(key: K): V | undefined;
  has(key: K): boolean;
  keys(): MapIterator<K>;
  values(): IterableIterator<V>;
  entries(): IterableIterator<[K, V]>;
  forEach(callbackfn: (value: V, key: K, map: ReadonlyMap<K, V>) => void): void;
  [Symbol.iterator](): IterableIterator<[K, V]>;
}

function immutableMapView<K, V>(source: Map<K, V>): ReadonlyMap<K, V>
```

## See also

- [`immutableSetView`](/view/immutable-set-view) — same pattern for `Set`
- [`immutableView`](/view/immutable-view) — Proxy-based live view (no copy; reflects source updates)
- [`deepFreeze`](/freeze/deep-freeze) — freezes the original object graph (Map shell only, not slot)
- [`snapshot`](/snapshot/snapshot) — deep clone + deepFreeze (severs reference; same clone limitation)
- [Security Audit](/reference/security-audit) — C1, C2, C4, C5 vectors
