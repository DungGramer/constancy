---
title: Protect app config at boot
description: Harden a plain config object against mutation and prototype pollution, then verify integrity at startup.
lastReviewed: 2026-04-17
sourceLocale: en
translationStatus: synced
---

# Protect app config at boot

## The problem

You load a JSON config once at application startup and pass it across modules. Any module that receives a reference could accidentally mutate it. A library bug or injected dependency could also poison `Object.prototype`, making inherited keys appear on the config. You need the config to be immutable, tamper-resistant, and verifiably intact before any business logic runs.

## Requirements

- Config must be plain data — no class instances, no `Date`, no `Map`/`Set`.
- Mutations must throw, including nested property writes.
- `Object.prototype` pollution must not bleed into config key lookups.
- A startup check must detect if critical JS builtins have been replaced after import.

## Approach

`secureSnapshot` wraps a plain object with null-prototype + getter-only non-configurable descriptors — stronger than `snapshot`, which still exposes `value`-field descriptors that can be read via `Object.getOwnPropertyDescriptor` (X1). After hardening the config, call `checkRuntimeIntegrity` to detect post-import replacement of `Object.freeze`, `Reflect.*`, or `Proxy`, and pollution of `Object.prototype` own-keys (audit I2, I5). Optionally wrap in `tamperEvident` if you need a fingerprint for server-side comparison or later `assertIntact()` calls.

## Implementation

```ts
import {
  secureSnapshot,
  checkRuntimeIntegrity,
} from 'constancy';

// --- boot.ts ---

// 1. Verify critical builtins are intact (I2, I5)
const integrity = checkRuntimeIntegrity();
if (!integrity.intact) {
  throw new Error(`Runtime integrity compromised: ${integrity.compromised}`);
}

// 2. Load and harden config — must be plain data, no accessors (X1)
const rawConfig = JSON.parse(process.env.APP_CONFIG ?? '{}') as {
  db: { host: string; port: number };
  flags: Record<string, boolean>;
};

export const config = secureSnapshot(rawConfig);
// config.db.host          → 'prod-db'
// config.db.host = 'hack' → TypeError (getter-only, no setter)
// config.injected         → undefined (null prototype — S1 equivalent)
```

## Tradeoffs

- `secureSnapshot` throws for any non-plain nested value (Date, Array, Map, class instance) — the entire call aborts on the first violation (X2). Pre-validate or flatten values before calling.
- Accessor properties (`get foo()`) on the source throw in v3.0.1+ (X1 regression fix). Resolve getters to plain values before passing.
- `checkRuntimeIntegrity` cannot detect pre-import poisoning — if an attacker replaced `Object.freeze` before `import 'constancy'`, the cached reference is already tampered (I6 limitation).
- No circular reference support in `secureSnapshot` — a circular plain-object graph overflows the stack.

## Alternatives considered

- **`snapshot`** — null-prototype + deep freeze but exposes `value` descriptors. An attacker with late-execution access can read the raw value via `Object.getOwnPropertyDescriptor`. `secureSnapshot` closes this with getter-only descriptors. Rejected because the config scenario benefits from the stronger descriptor hardening.
- **`deepFreeze`** — freezes in place without null-prototype. Prototype pollution can still leak through the chain. Rejected because config should survive a polluted `Object.prototype`.

## Related APIs

- [`secureSnapshot`](/snapshot/secure-snapshot)
- [`checkRuntimeIntegrity`](/verification/check-runtime-integrity)
- [`tamperEvident`](/snapshot/tamper-evident)
- [`snapshot`](/snapshot/snapshot)
