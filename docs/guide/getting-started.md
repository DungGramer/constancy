---
title: Getting Started
description: Install constancy and learn freeze, view, and snapshot in under 5 minutes.
lastReviewed: 2026-04-17
sourceLocale: en
translationStatus: synced
---

# Getting Started

## Install

```bash
npm install constancy
```

Requirements: Node.js ≥ 20. Zero dependencies. Ships as ESM + CommonJS.

```typescript
// ESM
import { deepFreeze, immutableView, snapshot } from 'constancy';

// CommonJS
const { deepFreeze, immutableView, snapshot } = require('constancy');
```

## Your first freeze

`deepFreeze` recursively freezes an object in place. No clone — same reference, now immutable.

```typescript
import { deepFreeze } from 'constancy';

const config = deepFreeze({
  host: 'localhost',
  db: { port: 5432, name: 'mydb' },
});

config.host = 'evil';        // TypeError: Cannot assign to read only property
config.db.port = 9999;       // TypeError: Cannot assign to read only property
```

The object and all nested objects are frozen. The original reference is returned.

## Try a view

`immutableView` wraps an object in a Proxy. Any mutation attempt through the proxy throws — but the original reference stays mutable.

```typescript
import { immutableView } from 'constancy';

const original = { count: 0 };
const view = immutableView(original);

view.count = 1;     // TypeError: object is immutable
original.count = 1; // Works — original is still mutable
view.count;         // 1 — view reflects the mutation
```

Use `immutableView` when you control the original and want mutation prevention at a specific call site. If untrusted code could retain the original reference, use `snapshot` instead.

## Try a snapshot

`snapshot` clones the object then deep-freezes the clone. The original is untouched; the snapshot is independent.

```typescript
import { snapshot } from 'constancy';

const original = { user: { isVip: false } };
const snap = snapshot(original);

original.user.isVip = true;  // original mutated
snap.user.isVip;             // false — snapshot is independent
snap.user.isVip = true;      // TypeError: frozen
```

The clone uses `structuredClone` internally. Non-cloneable values (functions, DOM nodes, identity Symbols) throw at snapshot time.

## Next steps

- [Choose the Right Model](/guide/choose-the-right-model) — decision flowchart + comparison matrix for all 7 APIs
- [API Overview](/reference/api-overview) — indexed reference for all 17 public exports
- [Mental Models](/guide/mental-models) — depth on VIEW vs SNAPSHOT vs VAULT
- [Limitations](/guide/limitations) — honest constraints before you ship
