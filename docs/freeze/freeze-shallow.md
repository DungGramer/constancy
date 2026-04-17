---
title: freezeShallow
description: Freeze only the top-level properties of an object via native Object.freeze — nested objects stay mutable.
lastReviewed: 2026-04-17
sourceLocale: en
translationStatus: synced
---

# freezeShallow

## What it does

`freezeShallow` passes the value directly to native `Object.freeze()`. The freeze is applied to the **top level only**: own property additions, deletions, and assignments on the target object will throw in strict mode (or silently fail in sloppy mode). Properties whose values are themselves objects are not touched — they remain fully mutable. Primitives (`null`, `undefined`, numbers, strings, booleans, bigints, symbols) are returned unchanged without any call to `Object.freeze`.

## When to use

- Flat configuration objects where every value is a primitive (ports, flags, strings).
- Module-level constants exported as plain records — callers must not add keys.
- Performance-sensitive code paths where the recursion cost of `deepFreeze` is measurable and nested mutation is not a concern.
- Freezing a leaf value you know has no object-typed properties.

## When not to use

- Any object with nested objects, arrays, or class instances as property values — use [`deepFreeze`](/freeze/deep-freeze) instead.
- When you need the freeze to be visible to `isDeepFrozen` — a shallowly-frozen object with live nested refs returns `false` from that check.
- Shared data graphs where a consumer could reach a nested reference and mutate it.
- When you need to protect Maps, Sets, or TypedArrays — shallow freeze does not reach their internal slots.

## Guarantees

- The target object becomes non-extensible: `Object.isExtensible(target)` returns `false`.
- Every existing own property descriptor has `configurable: false` and `writable: false` set.
- Attempting to add, delete, or reassign a top-level property throws `TypeError` in strict mode.
- In sloppy mode the same operations silently no-op; no error is thrown.
- Primitives pass through untouched — `freezeShallow(42)` returns `42`.

## Limitations

- **Nested objects stay fully mutable.** A property value that is an object can have its own properties changed freely:
  ```ts
  const cfg = freezeShallow({ host: 'localhost', db: { port: 5432 } });
  cfg.db.port = 9999; // Works — nested not frozen
  ```
- **Array elements that are objects stay mutable.** Freezing an array shallowly prevents index reassignment but not mutation of element objects:
  ```ts
  const arr = freezeShallow([{ id: 1 }]);
  arr[0].id = 2; // Works — element object not frozen
  ```
- **Map and Set internal slots are unaffected.** `Object.freeze` marks the Map/Set object shell as non-extensible but the `[[MapData]]`/`[[SetData]]` internal slots remain functional — `.set()`, `.add()`, `.delete()`, and `.clear()` all still work after a shallow freeze.

## Example

**Happy path — flat config:**

```ts
import { freezeShallow } from 'constancy';

const config = freezeShallow({
  host: 'localhost',
  port: 3000,
  debug: false,
});

config.port = 8080; // TypeError in strict mode
config.extra = 'x'; // TypeError in strict mode
console.log(config.port); // 3000 — unchanged
```

**Common trap — nested still mutable:**

```ts
const config = freezeShallow({
  host: 'localhost',
  db: { port: 5432 },   // ← object value
});

// Top level is frozen:
config.host = 'evil';   // TypeError

// But nested object is NOT frozen — this succeeds silently:
config.db.port = 9999;  // Works!
console.log(config.db.port); // 9999
// Use deepFreeze({ ... }) if you need recursion.
```

## Comparison with related APIs

| | `freezeShallow` | `deepFreeze` |
|---|---|---|
| **Depth** | Top-level only | All reachable objects |
| **Cost** | O(1) | O(n) — visits every node |
| **Circular ref handling** | N/A | WeakSet guard included |
| **Map/Set slots** | Unaffected | Unaffected (documented) |
| **Best for** | Flat primitive records | Object graphs, nested state |

## Common mistakes

- **Expecting recursion.** `freezeShallow` does exactly one level. If any value is an object, it is not frozen. Use `deepFreeze` for recursive protection.
- **Expecting a strict-mode throw in sloppy mode.** The throw only fires when the assignment runs in strict-mode code. Classic scripts and older CJS modules run sloppy — a failing write simply no-ops with no error.
- **Freezing a class instance expecting prototype methods to be frozen.** `Object.freeze` touches own properties only. Methods live on `ClassName.prototype`, not on the instance. They remain mutable unless you explicitly freeze the prototype (or use `deepFreeze` with `freezePrototypeChain: true`).

## Type signature

```ts
function freezeShallow<T>(val: T): T extends object ? Readonly<T> : T
```

The return type is `Readonly<T>` for object inputs (top-level properties become read-only in the type system) and `T` unchanged for primitives. Note that `Readonly<T>` is shallow in TypeScript's type system just as the freeze itself is shallow at runtime.

## See also

- [`deepFreeze`](/freeze/deep-freeze) — recursive freeze with circular-ref safety
- [`immutableView`](/view/immutable-view) — Proxy-based mutation block without freezing
- [`Object.freeze` (MDN)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze) — the native primitive this wraps
