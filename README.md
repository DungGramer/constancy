# Constancy
<!-- CI verified -->

[![npm version](https://img.shields.io/npm/v/constancy.svg)](https://www.npmjs.com/package/constancy)
[![npm downloads](https://img.shields.io/npm/dm/constancy.svg)](https://www.npmjs.com/package/constancy)
[![CI](https://img.shields.io/github/actions/workflow/status/DungGramer/constancy/ci.yml?label=CI)](https://github.com/DungGramer/constancy/actions/workflows/ci.yml)
[![CodeQL](https://img.shields.io/github/actions/workflow/status/DungGramer/constancy/codeql.yml?label=CodeQL)](https://github.com/DungGramer/constancy/actions/workflows/codeql.yml)
[![OSV Scanner](https://img.shields.io/github/actions/workflow/status/DungGramer/constancy/osv-scanner.yml?label=OSV)](https://github.com/DungGramer/constancy/actions/workflows/osv-scanner.yml)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/DungGramer/constancy/badge)](https://scorecard.dev/viewer/?uri=github.com/DungGramer/constancy)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=DungGramer_constancy&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=DungGramer_constancy)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=DungGramer_constancy&metric=coverage)](https://sonarcloud.io/summary/new_code?id=DungGramer_constancy)
[![license](https://img.shields.io/npm/l/constancy.svg)](https://github.com/DungGramer/constancy/blob/master/LICENSE)

> Lightweight, zero-dependency TypeScript library for deep immutability with multi-level defense against tampering. Freeze, immutable views, snapshots, vaults, and structural hashing.

## Critical Distinction: VIEW vs SNAPSHOT

**This is the most important concept in constancy.**

| API | Model | Data frozen? | Reference severed? | Use |
|-----|-------|-------------|-------------------|----|
| **`immutableView()`** | **VIEW** — Proxy blocks mutations through this reference | No — original still mutable | No — if you keep original ref, you can mutate | When you want to prevent access through this specific reference |
| **`snapshot()`** | **SNAPSHOT** — Clone + freeze creates true immutability | Yes — data itself is frozen | Yes — clone is independent | When you need true data immutability |

**Example:**
```typescript
const original = { count: 0 };

// immutableView() is a VIEW — blocks mutations through proxy, but original still mutable
const view = immutableView(original);
view.count = 1;        // TypeError: object is immutable
original.count = 1;    // Works! original is still mutable

// snapshot() is a SNAPSHOT — independent frozen clone
const snapshot = snapshot(original);
snapshot.count = 1;    // TypeError: frozen
original.count = 1;    // Doesn't affect snapshot
```

**Choose `immutableView()` for:** Runtime mutation prevention when you control the original reference.
**Choose `snapshot()` for:** True data immutability, or when untrusted code could retain the original reference.

## Installation

```bash
npm install constancy
# or
yarn add constancy
# or
pnpm add constancy
```

Requires Node.js >= 18.

## Quick Start

```typescript
import { freezeShallow, deepFreeze, immutableView, snapshot, vault, tamperEvident } from 'constancy';

// Freeze: Shallow freeze
const config = freezeShallow({ host: 'localhost', port: 3000 });
config.port = 8080; // Ignored (non-strict), throws in strict mode

// Freeze: Deep freeze — recursive
const state = deepFreeze({ user: { name: 'Alice', roles: ['admin'] } });
state.user.roles.push('user'); // Throws in strict mode

// View: Immutable proxy — throws, but original still mutable if retained
const data = immutableView({ count: 0, items: [] });
data.count = 1; // TypeError: object is immutable
// ⚠️ Original reference is still mutable if you kept it!

// Snapshot: snapshot() — clone + freeze, true immutability
const locked = snapshot({ count: 0, items: [] });
locked.count = 1; // TypeError: frozen
// Original unaffected, reference severed

// Isolation: Vault — closure isolation + copy-on-read
const secret = vault({ apiKey: 'sk-123456' });
const copy = secret.get(); // Fresh frozen copy each call
secret.get() === secret.get(); // false — always new copy

// Snapshot: Tamper-evident — hash verification vault
const protected = tamperEvident({ version: '1.0.0', data: [1, 2, 3] });
protected.assertIntact(); // Throws if hash mismatch
const fingerprint = protected.fingerprint; // Original hash
```

## API Reference

### Freeze (In-Place)

#### `freezeShallow<T>(val: T)` — Shallow Freeze

Freezes only top-level properties using native `Object.freeze()`.

```typescript
const obj = freezeShallow({ a: 1, b: { c: 2 } });
obj.a = 2;      // Ignored
obj.b.c = 3;    // Works — nested not frozen
```

#### `deepFreeze<T>(val: T)` — Recursive Freeze

Recursively freezes all nested objects. Handles circular refs, Symbol keys, TypedArrays, and accessor descriptors.

```typescript
const obj = deepFreeze({ nested: { count: 0 }, tags: ['a'] });
obj.nested.count = 1; // Ignored
obj.tags.push('b');   // Ignored
```

### View (Proxy, No Clone)

#### `immutableView<T>(obj: T)` — Proxy-Based VIEW

Wraps object in a Proxy that throws `TypeError` on ANY mutation through this reference. Does NOT freeze or clone the original.

**This is a VIEW, not a snapshot.** Original is still mutable if you retain the reference. Use `snapshot()` for true immutability.

```typescript
const data = immutableView({ items: [], config: { theme: 'dark' } });
data.items.push(1);              // TypeError: object is immutable
data.config.theme = 'light';     // TypeError: object is immutable

const m = immutableView(new Map([['a', 1]]));
m.set('b', 2);                   // TypeError: Cannot set: object is immutable
m.get('a');                      // Works — read access allowed
```

#### `isImmutableView<T>(val: any)` — Check Immutable View

Returns `true` if value is an immutable proxy.

```typescript
isImmutableView(immutableView({}));  // true
isImmutableView({});                 // false
isImmutableView(deepFreeze({}));     // false
```

#### `assertImmutableView<T>(val: T)` — Assert Immutable View

Throws if value is not an immutable proxy.

```typescript
assertImmutableView(immutableView({}));  // OK
assertImmutableView({});                 // TypeError
```

#### `immutableMapView<K, V>(map: Map<K, V>)` — Read-Only Map

Wraps Map in a Proxy. All mutator methods throw.

```typescript
const m = immutableMapView(new Map([['a', 1], ['b', 2]]));
m.get('a');  // 1
m.set('c', 3); // TypeError
m.delete('a'); // TypeError
```

#### `immutableSetView<T>(set: Set<T>)` — Read-Only Set

Wraps Set in a Proxy. All mutator methods throw.

```typescript
const s = immutableSetView(new Set([1, 2, 3]));
s.has(1);    // true
s.add(4);    // TypeError
s.delete(1); // TypeError
```

### Snapshot (Clone + Freeze)

#### `snapshot<T>(value: T)` — Clone + Deep Freeze

Creates a deep clone and recursively freezes every object. True immutability — original unaffected.

```typescript
const original = { user: { isVip: false } };
const snap = snapshot(original);

original.user.isVip = true;    // original mutated
snap.user.isVip;               // false — snapshot unaffected
snap.user.isVip = true;        // TypeError — frozen
```

#### `lock<T>(value: T)` — Alias for `snapshot()`

Alternate name for `snapshot()`. Both are identical.

```typescript
const snap = lock({ count: 0 });  // Same as snapshot()
```

#### `secureSnapshot<T>(obj: T)` — Hardened Snapshot

Vault with null prototype + getter-only descriptors. Max protection for critical data.

```typescript
const cfg = secureSnapshot({ db: { host: 'localhost', port: 5432 } });
cfg.db.host;                              // 'localhost'
cfg.db.host = 'evil';                     // TypeError (strict)
Object.defineProperty(cfg, 'db', {value: null}); // TypeError — non-configurable
```

#### `tamperEvident<T>(val: T)` — Hash-Verified Snapshot

Stores value in vault + computes djb2 structural hash. Detects any internal corruption.

```typescript
const protected = tamperEvident({ version: '1.0', data: [1, 2, 3] });
const fingerprint = protected.fingerprint; // Original hash (base-36)

// Safe access with automatic verification
const copy = protected.get(); // Fresh frozen copy

// Detect corruption
protected.verify();           // true if intact
protected.assertIntact();     // Throws TypeError if corrupted
```

### Isolation (Closure + Copy-on-Read)

#### `vault<T>(val: T)` — Copy-on-Read Vault

Stores a value in a sealed closure. Each `get()` call returns a fresh frozen copy. Reference extraction impossible.

```typescript
const secret = vault({ password: 'xyz', tokens: ['token1'] });
const copy1 = secret.get();
const copy2 = secret.get();
copy1 === copy2; // false — new copy each time
copy1.tokens.push('token2'); // Copy mutated, vault unchanged
secret.get().tokens; // ['token1'] — original preserved
```

### Verification

#### `isDeepFrozen<T>(val: T)` — Check if Deep Frozen

Verifies object and all nested objects are frozen.

```typescript
const obj = deepFreeze({ nested: { count: 0 } });
isDeepFrozen(obj);                          // true
isDeepFrozen(freezeShallow({}));            // false (shallow only)
const partial = { nested: deepFreeze({}) };
isDeepFrozen(partial);                      // false (root not frozen)
```

#### `assertDeepFrozen<T>(val: T)` — Assert Deep Frozen

Throws if value is not deeply frozen.

```typescript
assertDeepFrozen(deepFreeze({}));  // OK
assertDeepFrozen({});              // TypeError
```

#### `checkRuntimeIntegrity()` — Detect Post-Import Tampering

Verifies that Object.freeze and other builtins haven't been overridden post-import.

```typescript
const { intact, compromised } = checkRuntimeIntegrity();
if (!intact) console.error('Environment compromised:', compromised);
```

### Types

#### `DeepReadonly<T>`
Recursively readonly type for objects, arrays, Maps, Sets.

#### `Freezable`
Union type: `object | Function`.

#### `Vault<T>`
Interface for vault values: `{ readonly get: () => DeepReadonly<T> }`.

#### `TamperProofVault<T>`
Interface for tamper-proof vaults: `{ readonly get, verify, assertIntact, fingerprint }`.

## Security: Defense Levels

| Level | API | Type | Mechanism | Original Mutable? | Use Case |
|-------|-----|------|-----------|-------------------|----------|
| 0 | `freezeShallow()` | Freeze | Shallow `Object.freeze()` | If nested | Top-level freeze only |
| 0 | `deepFreeze()` | Freeze | Recursive freeze + cached builtins | Only with retained ref | Full graph immutability |
| **1** | **`immutableView()`** | **View** | **Proxy traps** | **Yes, if you keep original** | **Runtime mutation blocking** |
| 1.5 | **`snapshot()`** | **Snapshot** | **Clone + deep freeze** | **No — independent copy** | **True immutability** |
| 1.5 | `immutableMapView/SetView()` | View | Proxy mutator blocking | If you keep original | Collection safety |
| 2 | `vault()` | Snapshot | Closure isolation + copy-on-read | No — sealed | Absolute reference isolation |
| 2.5 | `secureSnapshot()` | Snapshot | Null proto + getter-only + non-configurable | No — sealed | Prototype pollution defense |
| 3 | `tamperEvident()` | Snapshot | Vault + djb2 hash verification | No — sealed | Data tampering detection |

### Attack Vectors Defended

- ✅ `Object.freeze` override → cached builtins captured at module load
- ✅ Prototype pollution → null proto in `secureSnapshot()`, own-property precedence
- ✅ Internal slot mutations → Proxy method blocking in `immutableView()`
- ✅ Array mutations → blocked via Proxy in `immutableView()`
- ✅ Property descriptor manipulation → non-configurable in `secureSnapshot()`
- ✅ Reference extraction → vault copy isolation in `vault()` / `tamperEvident()`
- ✅ Data tampering → hash verification in `tamperEvident()`
- ✅ Silent mutations → Proxy throws in strict + non-strict in `immutableView()`

## TypeScript Usage

```typescript
import { freezeShallow, deepFreeze, immutableView, snapshot, vault, tamperEvident } from 'constancy';
import type { DeepReadonly, Vault, TamperProofVault } from 'constancy';
```

CommonJS:

```javascript
const { freezeShallow, deepFreeze, immutableView, snapshot, vault, tamperEvident } = require('constancy');
```

## Development

```bash
npm run build       # ESM + CJS bundles
npm test            # Run tests (169 tests)
npm run test:watch  # Watch mode
npm run test:coverage # Coverage report (96.46% stmts, 92.59% branch)
npm run typecheck   # Type check
```

## Why Constancy?

- **Zero dependencies** — no supply chain risk
- **Tiny** — ESM 5.3KB, CJS 5.9KB
- **Type-safe** — `Readonly<T>`, `DeepReadonly<T>`, conditional types
- **Layered security** — 5 categories (freeze, view, snapshot, isolation, verification)
- **Dual format** — ESM + CJS with conditional exports
- **Comprehensive** — 169 tests, 96.46% coverage
- **Tamper-resistant** — cached builtins protect against post-import attacks
- **Clear mental model** — VIEW (`immutableView()`) vs SNAPSHOT (`snapshot()`) distinction

## License

[MIT](./LICENSE) — DungGramer
