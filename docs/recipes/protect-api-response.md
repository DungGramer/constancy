---
title: Protect API response data from mutation
description: Wrap fetch results in an immutable view so callers cannot mutate shared response objects.
lastReviewed: 2026-04-17
sourceLocale: en
translationStatus: synced
---

# Protect API response data from mutation

## The problem

Your data-fetching layer returns JSON response objects that multiple UI components share through the same reference. A component that writes to the object — even accidentally — corrupts the data for every other consumer. Cloning on every fetch is expensive and unnecessary; you just need to prevent writes through the shared reference.

## Requirements

- Mutation attempts on the returned object must throw.
- No full deep clone on every fetch — latency and GC pressure matter.
- Re-fetching must produce a fresh, independently protected reference.
- Nested objects must also be protected, not just the top level.

## Approach

Return `immutableView(data)` directly from the fetch wrapper. `immutableView` wraps the value in a Proxy that intercepts all 13 mutation traps — set, delete, defineProperty, setPrototypeOf, preventExtensions, and all built-in collection mutators — without cloning the data (O(1) wrap cost). Nested objects are wrapped lazily on first property access, so protection is transitive at read time. Because the wrapper retains no mutable reference beyond the closure, callers cannot reach the original through the view.

**VIEW, not SNAPSHOT (V8)**: the fetch wrapper's internal reference remains mutable. If another path in the same module calls `data.x = ...` directly, the view reflects the change. The view only blocks mutation _through the proxy reference_.

## Implementation

```ts
import { immutableView } from 'constancy';

async function fetchUser(id: string) {
  const resp = await fetch(`/api/users/${id}`);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = await resp.json() as { id: string; name: string; role: string };
  return immutableView(data); // O(1) wrap — no clone
}

// Consumer:
const user = await fetchUser('u1');
console.log(user.name);     // reads fine
user.role = 'admin';        // TypeError: Cannot set property "role": object is immutable
```

## Tradeoffs

- The wrapper retains the original mutable reference. A second export or closure inside the same fetch module that holds `data` directly can still mutate it and the view will reflect those changes (V8). Ensure the original reference does not escape the fetch wrapper scope.
- `JSON.stringify(view)` calls the target's `toJSON()` before the Proxy get trap fires (V5). If the payload contains a forged `toJSON`, pass `{ blockToJSON: true }` to suppress it.
- Iterator objects returned from the view (e.g. `Object.keys(view)`) are not themselves protected — only values yielded through the standard access path are wrapped (V7 limitation).

## Alternatives considered

- **`snapshot`** — deep clones + freezes on every call. Fully independent copy that no reference can affect. Rejected here because clone cost is O(n) per fetch; `immutableView` gives the same write-protection at O(1). Use `snapshot` if the fetch wrapper might retain a mutable alias or if a third-party library could hold the raw response.
- **`deepFreeze`** — mutates the response object in place. Every caller that held the pre-freeze reference suddenly gets a frozen object, which can break any code expecting to work with the data before the freeze completes. Rejected because the wrapper should not affect objects it did not allocate.

## Related APIs

- [`immutableView`](/view/immutable-view)
- [`snapshot`](/snapshot/snapshot)
- [`vault`](/isolation/vault)
