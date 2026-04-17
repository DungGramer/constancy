---
title: Expose a read-only Map or Set to callers
description: Use immutableMapView / immutableSetView to block .set(), .add(), and .delete() — not immutableView(map).
lastReviewed: 2026-04-17
sourceLocale: en
translationStatus: synced
---

# Expose a read-only Map or Set to callers

## The problem

Your cache module maintains an internal `Map<string, User>` and exposes it to callers. Any caller with a reference to the Map can call `.set()` or `.delete()` and corrupt the cache — even though the Map object itself might be frozen at the shell level. You need a type-safe, runtime-enforced read-only view of the Map that blocks all mutation, including subclass-based bypasses.

## Requirements

- `.set()`, `.delete()`, and `.clear()` must be absent — not just blocked, absent.
- TypeScript must reflect the constraint at compile time (`ReadonlyMap<K, V>`).
- Subclass methods that delegate to `.set()` internally must not reach the internal slots.
- Source isolation: changes to the internal Map after exposure must not affect the view.

## Approach

Use `immutableMapView` (or `immutableSetView` for `Set`) rather than `immutableView(map)`. Both dedicated helpers copy entries with `structuredClone` at construction time, so the returned view is a snapshot isolated from the source. Mutation methods (`set`, `delete`, `clear`) are simply absent from `ImmutableMap.prototype` — `(view as any).set` is `undefined` — which satisfies the TypeScript `ReadonlyMap<K, V>` return type at compile time and throws `TypeError` at runtime if called.

`immutableView(map)` is a Proxy over the original — it blocks `.set()` through a trap but still reflects live source changes (V8). It does not sever the reference. For a stable exported snapshot, the dedicated helpers are the right choice.

## Implementation

```ts
import { immutableMapView, immutableSetView } from 'constancy';

// Internal mutable state
const _userCache = new Map<string, { name: string; role: string }>();
const _permissionCache = new Set<string>();

// Public read-only accessors — snapshot at call time
export function getUserCache(): ReadonlyMap<string, { name: string; role: string }> {
  return immutableMapView(_userCache);
}

export function getPermissions(): ReadonlySet<string> {
  return immutableSetView(_permissionCache);
}

// Callers:
const users = getUserCache();
users.get('alice');       // { name: 'Alice', role: 'admin' }
(users as any).set('x'); // TypeError: undefined is not a function
```

## Tradeoffs

- `immutableMapView` uses `structuredClone` at construction — non-cloneable values (functions, DOM nodes, Symbols as values) throw `DataCloneError` at wrap time (C4). Pre-validate Map contents before exposing.
- The view is a snapshot. Callers who hold a reference to a previously-returned view see the Map state at the time they called `getUserCache()`, not the current state. Call the accessor again for a fresh snapshot.
- `has(originalObj)` returns `false` when the key was an object — the view holds a cloned reference, not the original (C2). Use primitive keys for reliable `has()` calls.
- Lazy freeze window (C1): values are cloned at construction but not frozen until first read. Code that bypasses the public API via private field access could mutate in this window — public API users are unaffected.

## Alternatives considered

- **`immutableView(map)`** — Proxy-based live view, no entry copy. Reflects source changes (V8 limitation). The V3 subclass-deny protection blocks `class Evil extends Map { sneakSet() { this.set(...) } }` only for types with internal slots, and still requires that all non-allow-listed function-typed properties are blocked. The dedicated helper sidesteps this entirely by making mutator methods absent rather than blocked. Rejected when source isolation is required.
- **`deepFreeze(map)`** — freezes the Map object shell (no new own properties), but `[[MapData]]` internal slots bypass `Object.freeze` entirely — `.set()` still works (F2). Rejected: does not block the slot mutators.

## Related APIs

- [`immutableMapView`](/view/immutable-map-view)
- [`immutableSetView`](/view/immutable-set-view)
- [`immutableView`](/view/immutable-view)
- [`deepFreeze`](/freeze/deep-freeze)
