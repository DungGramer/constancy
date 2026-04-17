---
title: lock
description: Alias of snapshot() kept for backward compatibility (pre-v3 name). Deep clone + deep freeze with null-prototype severance.
lastReviewed: 2026-04-17
sourceLocale: en
translationStatus: synced
---

# lock

## What it does

Alias of [`snapshot()`](/snapshot/snapshot) kept for backward compatibility (pre-v3 name). `lock` and `snapshot` share the same implementation at runtime — `export const lock = snapshot`.

## When to use

Use `snapshot` for new code. Use `lock` only when migrating code that already calls `lock()` and you want to defer the rename.

## When not to use

Same restrictions as [`snapshot`](/snapshot/snapshot). Do not use for non-cloneable values (functions, Symbols, DOM nodes).

## Guarantees

Identical to `snapshot`: deep clone via `structuredClone`, null-prototype severance on plain objects (S1), full `deepFreeze` on the clone, and `DeepReadonly<T>` return type.

## Limitations

Same as [`snapshot`](/snapshot/snapshot#limitations).

## Example

```ts
import { lock } from 'constancy';

const state = { count: 0 };
const frozen = lock(state);

state.count++;         // original mutated
frozen.count;          // 0 — snapshot unaffected
frozen.count = 1;      // TypeError — frozen
```

## Comparison with related APIs

`lock` is `snapshot` — see [snapshot — Comparison](/snapshot/snapshot#comparison-with-related-apis).

## Common mistakes

Using `lock` in new code creates unnecessary confusion with the v3 `snapshot` name. Prefer `snapshot` in all new code.

## Type signature

```ts
const lock: <T>(value: T) => DeepReadonly<T>
```

## See also

- [`snapshot`](/snapshot/snapshot) — canonical name; identical implementation
- [Migration guide](/migration/deprecated-aliases) — rename guide for pre-v3 code
