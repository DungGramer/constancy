---
title: Type Exports
description: TypeScript type definitions exported from constancy — signatures, descriptions, and usage examples.
lastReviewed: 2026-04-17
sourceLocale: en
translationStatus: synced
---

# Type Exports

All types listed here are re-exported from the package root and available via:

```ts
import type { DeepReadonly, Vault, /* ... */ } from 'constancy';
```

---

## `DeepReadonly<T>`

```ts
export type DeepReadonly<T> =
  T extends Primitive ? T :
  T extends Array<infer U> ? ReadonlyArray<DeepReadonly<U>> :
  T extends Map<infer K, infer V> ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>> :
  T extends Set<infer U> ? ReadonlySet<DeepReadonly<U>> :
  T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } :
  T;
```

Recursively marks every property `readonly`, handling plain objects, arrays, `Map`, `Set`, and arbitrarily nested structures. Primitives pass through unchanged.

```ts
import type { DeepReadonly } from 'constancy';

type Config = { server: { port: number; host: string } };
const cfg: DeepReadonly<Config> = { server: { port: 3000, host: 'localhost' } };
// cfg.server.port = 4000; // TypeError — readonly at compile time
```

---

## `ImmutableViewOptions`

```ts
export interface ImmutableViewOptions {
  readonly blockToJSON?: boolean;
}
```

Options accepted by [`immutableView()`](/view/immutable-view). The `blockToJSON` flag suppresses the target's `toJSON()` method through the Proxy so that `JSON.stringify(view)` serializes through the Proxy's own traps rather than calling a potentially attacker-supplied `toJSON`. Defaults to `false` for backwards compatibility.

```ts
import { immutableView } from 'constancy';

const view = immutableView(data, { blockToJSON: true });
// JSON.stringify(view) now uses Proxy ownKeys/getOwnPropertyDescriptor traps
```

---

## `DeepFreezeOptions`

```ts
export interface DeepFreezeOptions {
  readonly freezePrototypeChain?: boolean;
}
```

Options accepted by [`deepFreeze()`](/freeze/deep-freeze). When `freezePrototypeChain` is `true`, every prototype reachable from the frozen value is also frozen, blocking post-freeze prototype poisoning (audit vector F1). Defaults to `false` to preserve backwards compatibility.

```ts
import { deepFreeze } from 'constancy';

class Box { value = 42; }
const b = deepFreeze(new Box(), { freezePrototypeChain: true });
// Box.prototype.greet = () => 'evil'; // TypeError — prototype is frozen
```

---

## `Vault<T>`

```ts
export interface Vault<T> {
  readonly get: () => DeepReadonly<T>;
}
```

Return type of [`vault()`](/isolation/vault). A sealed container whose stored value never leaks a mutable reference — every `get()` call returns a fresh frozen deep copy. The original object reference is severed at creation time.

```ts
import { vault } from 'constancy';

const v = vault({ x: 1, nested: { y: 2 } });
const a = v.get(); // frozen copy
const b = v.get(); // different frozen copy — a !== b
```

---

## `TamperEvidentVault<T>`

```ts
export interface TamperEvidentVault<T> {
  readonly get: () => DeepReadonly<T>;
  readonly verify: () => boolean;
  readonly assertIntact: () => void;
  readonly fingerprint: string;
}
```

Return type of [`tamperEvident()`](/snapshot/tamper-evident). Extends the basic vault pattern with a structural fingerprint: `verify()` recomputes the 64-bit djb2+sdbm hash on every call and returns `false` if anything has changed; `assertIntact()` throws a `TypeError` on mismatch. The `fingerprint` string (base-36) can be stored and compared across serialization boundaries.

```ts
import { tamperEvident } from 'constancy';

const te = tamperEvident({ id: 1, name: 'Alice' });
te.verify();       // true
te.fingerprint;    // e.g. "0k9zf3m1r4p2a"
te.assertIntact(); // no-op when intact
```

---

## `IntegrityResult`

```ts
export interface IntegrityResult {
  readonly intact: boolean;
  readonly compromised: readonly string[];
}
```

Return type of [`checkRuntimeIntegrity()`](/verification/check-runtime-integrity). `intact` is `true` when no monitored builtins have been replaced since module load. `compromised` lists the names of any that have been replaced (e.g. `"Object.freeze"`, `"Proxy"`, `"Object.prototype"`). The result object itself is frozen.

```ts
import { checkRuntimeIntegrity } from 'constancy';

const result = checkRuntimeIntegrity();
if (!result.intact) {
  console.error('Tampered builtins:', result.compromised);
}
```

---

## See also

| Type | Used by |
|---|---|
| `DeepReadonly<T>` | [`immutableView()`](/view/immutable-view), [`deepFreeze()`](/freeze/deep-freeze), [`vault()`](/isolation/vault), [`tamperEvident()`](/snapshot/tamper-evident) |
| `ImmutableViewOptions` | [`immutableView()`](/view/immutable-view) |
| `DeepFreezeOptions` | [`deepFreeze()`](/freeze/deep-freeze) |
| `Vault<T>` | [`vault()`](/isolation/vault) |
| `TamperEvidentVault<T>` | [`tamperEvident()`](/snapshot/tamper-evident) |
| `IntegrityResult` | [`checkRuntimeIntegrity()`](/verification/check-runtime-integrity) |
