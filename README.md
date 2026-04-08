# Constancy

[![npm version](https://img.shields.io/npm/v/constancy.svg)](https://www.npmjs.com/package/constancy)
[![npm downloads](https://img.shields.io/npm/dm/constancy.svg)](https://www.npmjs.com/package/constancy)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)](https://www.typescriptlang.org/)
[![license](https://img.shields.io/npm/l/constancy.svg)](https://github.com/DungGramer/constancy/blob/master/LICENSE)
[![test](https://img.shields.io/github/actions/workflow/status/DungGramer/constancy/ci.yml?label=tests)](https://github.com/DungGramer/constancy/actions)

> Lightweight, zero-dependency TypeScript utility for making objects and arrays deeply immutable. Shallow and recursive freeze with full type safety.

## Installation

```bash
npm install constancy
# or
yarn add constancy
# or
pnpm add constancy
```

Requires Node.js >= 14.

## Quick Start

```typescript
import constancy, { deepFreeze } from 'constancy';

// Shallow freeze — top-level properties only
const config = constancy({ host: 'localhost', port: 3000 });
config.port = 8080; // Ignored (TypeError in strict mode)

// Deep freeze — all nested properties recursively
const state = deepFreeze({
  user: { name: 'Alice', roles: ['admin'] },
  settings: { theme: 'dark' },
});
state.user.name = 'Bob';       // Ignored
state.user.roles.push('user'); // Ignored
```

## API Reference

### `constancy<T>(val: T)`

Shallow-freezes an object or function using `Object.freeze()`. Primitives are returned unchanged.

**Returns:** `Readonly<T>` for objects/functions, `T` for primitives.

```typescript
import constancy from 'constancy';

constancy({ a: 1 });           // Readonly<{ a: number }>
constancy([1, 2, 3]);          // readonly number[]
constancy(() => 'hello');      // Frozen function (still callable)
constancy('text');             // 'text' — unchanged
constancy(42);                 // 42 — unchanged
constancy(null);               // null — unchanged
```

Nested objects are NOT frozen:

```typescript
const obj = constancy({ user: { name: 'Alice' } });
obj.user.name = 'Bob'; // Works — nested is not frozen
obj.user = {};          // Ignored — top-level is frozen
```

### `deepFreeze<T>(val: T)`

Recursively freezes a value and all reachable nested objects. Handles:
- Circular references (via WeakSet — already-visited nodes are skipped)
- Symbol-keyed properties (via `Reflect.ownKeys()`)
- TypedArrays (skipped — freezing non-empty TypedArrays throws natively)
- Accessor descriptors (`get`/`set`) — skipped to avoid unintended invocation

**Returns:** `DeepReadonly<T>` for objects, `T` for primitives.

```typescript
import { deepFreeze } from 'constancy';

const obj = deepFreeze({
  nested: { count: 0 },
  tags: ['a', 'b'],
});
obj.nested.count = 1; // Ignored
obj.tags.push('c');   // Ignored

// Circular references are safe
const node: any = { value: 1 };
node.self = node;
deepFreeze(node); // No infinite loop
```

### Types

#### `DeepReadonly<T>`

Recursively marks all properties as `readonly`. Handles objects, arrays, Maps, and Sets.

```typescript
import type { DeepReadonly } from 'constancy';

type Config = DeepReadonly<{
  db: { host: string; port: number };
  tags: string[];
}>;
// Config.db.host is readonly, Config.tags is ReadonlyArray<string>
```

#### `Freezable`

Union type of values that can be frozen: `object | Function`.

```typescript
import type { Freezable } from 'constancy';

function freeze(val: Freezable) {
  return Object.freeze(val);
}
```

## TypeScript Usage

Named and default imports are both supported:

```typescript
// Default import
import constancy from 'constancy';

// Named imports
import { constancy, deepFreeze } from 'constancy';
import type { DeepReadonly, Freezable } from 'constancy';
```

CommonJS:

```javascript
const { constancy, deepFreeze } = require('constancy');
```

## Migration from v1

### Breaking changes

| v1 | v2 |
|---|---|
| Node.js >= 10 | Node.js >= 14 required |
| CommonJS-first (`index.js`) | ESM-first (`"type": "module"`) |
| `Object.freeze` polyfill included | Removed — native in all supported environments |
| `import constancy from 'constancy'` | Same — default import still works |
| No `deepFreeze` | `deepFreeze()` added |
| No `DeepReadonly<T>` | Type exported |

### Import changes

v1 root entry (`index.js`, `index.d.ts`) is removed. Imports via the package name continue to work through the `exports` field:

```typescript
// Still works in v2
import constancy from 'constancy';
import { constancy, deepFreeze } from 'constancy';
```

Direct path imports (`from 'constancy/dist/...'`) are not supported.

## Development

```bash
# Build ESM + CJS bundles
npm run build

# Run tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# Type check
npm run typecheck
```

### Project structure

```
src/
├── index.ts        — barrel exports
├── constancy.ts    — shallow freeze
├── deep-freeze.ts  — recursive deep freeze
├── types.ts        — DeepReadonly<T>, Freezable
└── utils.ts        — isFreezable(), getOwnKeys()

tests/
├── constancy.test.ts     — 19 tests
└── deep-freeze.test.ts   — 11 tests

dist/               — built output (ESM + CJS + .d.ts)
```

## Why Constancy?

- **Zero dependencies** — no supply chain risk, no bloat
- **Tiny** — under 1KB minified + gzipped
- **Type-safe** — `Readonly<T>` and `DeepReadonly<T>` inferred automatically
- **Safe** — handles circular refs, Symbol keys, TypedArrays, getters
- **Dual format** — ESM + CJS with conditional exports
- **Well-tested** — 30 tests, ~97% coverage

## License

[MIT](./LICENSE) — DungGramer
