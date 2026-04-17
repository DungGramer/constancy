---
title: immutableSetView
description: Wrap a Set in a read-only defensive copy — mutation methods absent at the type level, object values deep-frozen on read.
lastReviewed: 2026-04-17
sourceLocale: en
translationStatus: synced
---

# immutableSetView

## What it does

`immutableSetView` constructs an `ImmutableSet` instance that copies all entries from the source `Set` at construction time. Object values are cloned with `structuredClone` so freezing the wrapper's internal copy does not affect the source, and source mutations after construction do not reach the wrapper.

On each read (`.values()`, `.keys()`, `.entries()`, `.forEach()`, `for...of`), object values are deep-frozen lazily. Primitive values are returned as-is.

Mutation methods (`add`, `delete`, `clear`) are simply absent from `ImmutableSet` — they do not exist on the instance or its prototype at all, so TypeScript catches misuse at compile time and runtime access returns `undefined`.

The return type is `ReadonlySet<T>`, the standard TypeScript interface for read-only Set access.

## When to use

- You need a Set snapshot that callers cannot mutate through any reference — the wrapper is isolated from source changes after construction.
- You store object values in a Set and need to guarantee those objects cannot be mutated after wrapping.
- You want type-level enforcement: `ReadonlySet<T>` removes mutator methods from the inferred type.
- You need predictable iteration semantics: iterators walk the defensive copy made at construction.

## When not to use

- You want a live view that reflects ongoing source mutations — use [`immutableView(someSet)`](/view/immutable-view) instead (Proxy wraps the original without copying).
- The Set contains non-cloneable values (functions, DOM nodes, Symbols as values) — `structuredClone` will throw a `DataCloneError` at construction.
- You have a `WeakSet` — `immutableSetView` accepts only `Set`. For `WeakSet` read-only wrapping, use `immutableView`.
- You only need to block the Set shell's own properties from being added (not the slot methods) — `deepFreeze(set)` is cheaper at O(1) but leaves `.add()` accessible.

## Guarantees

- **Source isolation.** Object values are cloned at construction (`structuredClone`). Subsequent `source.add(v)` or `source.delete(v)` calls do not affect the wrapper. After wrapping, `view.size` reflects the state at construction time.
- **Mutation methods absent.** `.add`, `.delete`, and `.clear` do not exist on `ImmutableSet.prototype` — `(view as any).add` is `undefined`. TypeScript enforces this at compile time via `ReadonlySet<T>`.
- **Object values deep-frozen on read.** First access via `.values()`, `.keys()`, `.entries()`, `.forEach()`, or `for...of` calls `deepFreeze` on the cloned value. Subsequent reads are idempotent.
- **Source object values remain mutable.** The constructor clones before freezing — an object `obj` passed as a Set member is not frozen by wrapping. Only the internal clone is frozen.
- **Prototype frozen at module load (C5).** `Object.freeze(ImmutableSet.prototype)` runs when the module is first imported. An attacker cannot overwrite `ImmutableSet.prototype.values` to hijack every wrapper in the process.
- **`Symbol.toStringTag` is `'ImmutableSet'`.** `Object.prototype.toString.call(view)` returns `'[object ImmutableSet]'`.
- **`entries()` yields `[v, v]` pairs.** Matching native `Set` semantics, each entry is a tuple where both positions hold the same (wrapped) value.

## Limitations

- **Snapshot semantics.** The wrapper holds a defensive copy, not a live view. Changes to the source Set after construction are invisible. Use `immutableView(set)` for live-reference semantics.
- **Iterators are fresh at call time.** Each call to `.values()`, `.keys()`, `.entries()`, or `for...of` creates a new generator over the internal copy. They are bounded by the size of that copy — they do not reflect further changes.
- **`has()` uses reference identity for objects.** Object values are cloned at construction. Calling `view.has(originalObj)` where `originalObj` was a Set member returns `false` — the wrapper holds a clone with a different reference (C2). Use `has()` reliably only for primitive values.
- **Non-cloneable values throw at construction (C4).** If any value in the source Set cannot be cloned by `structuredClone` (functions, Symbols, DOM nodes), the constructor throws `DataCloneError`. Validate input before wrapping if the source is untrusted.
- **Lazy freeze window (C1).** Values are cloned at construction but not frozen until first read. In the window between construction and first access, the internal clone is unfrozen. Public API users are not affected.
- **No `WeakSet` support.** `WeakSet` entries are not iterable, so a defensive copy is not possible. Use `immutableView(weakSet)` for Proxy-based WeakSet protection.

## Example

**Basic read operations:**

```ts
import { immutableSetView } from 'constancy';

const source = new Set([1, 2, 3]);
const view = immutableSetView(source);

view.has(1);          // true
view.has(99);         // false
view.size;            // 3
[...view.values()];   // [1, 2, 3]
[...view.keys()];     // [1, 2, 3]
[...view.entries()];  // [[1, 1], [2, 2], [3, 3]]

// Mutation methods are absent:
(view as any).add(4); // undefined — add does not exist
```

**Source isolation — changes after wrapping are not visible:**

```ts
const source = new Set([1, 2, 3]);
const view = immutableSetView(source);

source.add(99);
source.delete(1);

view.has(1);   // true  — wrapper holds the copy from construction
view.has(99);  // false — added after wrapping, not in copy
view.size;     // 3
```

**Object values are deep-frozen on read:**

```ts
const source = new Set([{ role: 'viewer' }]);
const view = immutableSetView(source);

for (const item of view) {
  item.role = 'admin'; // TypeError: Cannot assign to read only property 'role'
}

// Source object is unaffected — only the internal clone is frozen:
const [original] = source;
original.role = 'admin'; // works — source not frozen
```

**Why `immutableSetView` instead of `immutableView(set)`:**

```ts
const source = new Set([1, 2, 3]);

// immutableView: Proxy over original — live view, no copy
const liveView = immutableView(source);
source.add(99);
liveView.has(99); // true — reflects source change

// immutableSetView: defensive copy at construction — snapshot
const snap = immutableSetView(source);
source.add(100);
snap.has(100); // false — holds the copy from construction time
snap.size;     // 4 (captured when source had 1,2,3,99)
```

**Iterating with `forEach`:**

```ts
const source = new Set([{ id: 1 }, { id: 2 }]);
const view = immutableSetView(source);

view.forEach((val) => {
  console.log(val.id);       // 1, 2
  (val as any).id = 99;      // TypeError: Cannot assign to read only property 'id'
});
```

## Comparison with related APIs

| | `immutableSetView` | `immutableView(set)` | `deepFreeze(set)` | `snapshot(set)` |
|---|---|---|---|---|
| **Copies entries?** | Yes (structuredClone) | No (Proxy) | No | Yes (structuredClone) |
| **Sees source updates?** | No | Yes | N/A (set mutated) | No |
| **`.add()` blocked?** | Yes (absent) | Yes (Proxy trap) | No (slot bypasses freeze) | Yes (result is frozen) |
| **Object values frozen?** | Yes (on read) | Yes (via Proxy) | Set shell only | Yes |
| **Type** | `ReadonlySet<T>` | `DeepReadonly<Set>` | `DeepReadonly<Set>` | `DeepReadonly<Set>` |
| **Non-cloneable values?** | DataCloneError | Works | Works | DataCloneError |

## Common mistakes

- **"`view.add(...)` silently does nothing."** `.add` does not exist on the prototype — `(view as any).add` is `undefined`. Calling it throws `TypeError: undefined is not a function`. If mutation appeared to succeed, check that you are referencing the view and not the source.
- **"`view.has(obj)` returns false even though I added `obj` to the Set."** The constructor clones object values. The clone is a different reference. `has()` uses `===` identity. Retrieve values from the view's iterators to get references that pass `has()` (C2).
- **"Source mutations leaked into the view."** Verify you called `immutableSetView` (copies entries) rather than `immutableView(set)` (Proxy — live view).
- **"My function value in the Set caused `DataCloneError`."** `structuredClone` cannot clone functions or closures. Remove non-cloneable values before wrapping (C4).
- **"`deepFreeze(set)` does not block `.add()`."** `Object.freeze` freezes the Set object shell, not the `[[SetData]]` internal slot. The slot is a runtime mechanism that `Object.freeze` cannot reach. Use `immutableSetView` to block `.add()`.

## Type signature

```ts
class ImmutableSet<T> implements ReadonlySet<T> {
  constructor(source: Set<T>);
  readonly size: number;
  has(value: T): boolean;
  keys(): IterableIterator<T>;
  values(): IterableIterator<T>;
  entries(): IterableIterator<[T, T]>;
  forEach(callbackfn: (value: T, value2: T, set: ReadonlySet<T>) => void): void;
  [Symbol.iterator](): IterableIterator<T>;
}

function immutableSetView<T>(source: Set<T>): ReadonlySet<T>
```

## See also

- [`immutableMapView`](/view/immutable-map-view) — same pattern for `Map`
- [`immutableView`](/view/immutable-view) — Proxy-based live view (no copy; reflects source updates)
- [`deepFreeze`](/freeze/deep-freeze) — freezes the original object graph (Set shell only, not slot)
- [`snapshot`](/snapshot/snapshot) — deep clone + deepFreeze (severs reference; same clone limitation)
- [Security Audit](/reference/security-audit) — C1, C2, C4, C5 vectors
