---
title: checkRuntimeIntegrity
description: Compares 17 critical JS builtins against their cached copies and fingerprints Object.prototype own-keys to detect post-import tampering.
lastReviewed: 2026-04-17
sourceLocale: en
translationStatus: synced
---

# checkRuntimeIntegrity

## What it does

`checkRuntimeIntegrity` performs two classes of detection:

**1. Builtin identity checks (17 checks — audit I2)**

At import time, `cached-builtins.ts` captures references to 17 critical global functions into module-level constants (`_freeze`, `_isFrozen`, `_Proxy`, `_reflectGet`, etc.). `checkRuntimeIntegrity` compares the current value of each global slot against the cached copy. Any mismatch is reported as compromised. The 17 checked builtins are:

`Object.freeze`, `Object.isFrozen`, `Object.getOwnPropertyDescriptor`, `Object.defineProperty`, `Object.create`, `Reflect.ownKeys`, `ArrayBuffer.isView`, `Proxy`, `Reflect` (presence check), `structuredClone`, `JSON.stringify`, `Array.isArray`, `Reflect.get`, `Reflect.has`, `Reflect.getOwnPropertyDescriptor`, `Reflect.getPrototypeOf`, `Reflect.isExtensible`.

**2. `Object.prototype` key-set fingerprint (audit I5)**

At import time, `cached-builtins.ts` also records the complete list of own keys on `Object.prototype`, sorted with a fixed `en-US` locale comparator, as a string fingerprint. At call time, `checkRuntimeIntegrity` recomputes the fingerprint from the live `Object.prototype` and compares it to the captured value. Any injected property — such as `Object.prototype._leak = 'x'` — changes the fingerprint and is reported as `"Object.prototype"` in the compromised list.

The function returns a frozen `IntegrityResult` object. Calling it after an attack has been cleaned up will report `intact: true` — it detects the current state, not historical state (I6).

## When to use

- Run once at application startup, before any user-supplied or third-party code executes, to establish a baseline integrity snapshot.
- Before a critical operation (key derivation, signing, freezing sensitive state) that relies on the correctness of `Object.freeze`, `Reflect.*`, or `Proxy`.
- As part of a health-check endpoint or diagnostic report in long-running server processes.
- In security-sensitive tests that need to verify the test environment is clean before exercising library behavior.

## When not to use

- As a real-time intrusion detection system. The function compares against a snapshot taken at module-load time. If the attack happened before import (preload poisoning), the cached copies already reflect the tampered values, and `checkRuntimeIntegrity` will report `intact: true` falsely (I6 / preload limitation).
- As a substitute for a Content Security Policy, sandboxing, or process isolation. This is a detection utility, not a prevention mechanism.
- For detecting prototype-method poisoning on non-Object prototypes. Checks for `Map.prototype`, `Set.prototype`, `Array.prototype.push`, etc. are not included (BYPASS I3/I4 — documented known limitation).

## Guarantees

- Returns a frozen `IntegrityResult` with `intact: boolean` and `compromised: readonly string[]`.
- `intact` is `true` if and only if all 17 identity checks pass and the `Object.prototype` fingerprint matches.
- `compromised` contains the name of each check that failed: one or more of the 17 builtin names plus `"Object.prototype"` for a fingerprint mismatch.
- The result object itself is frozen — the caller cannot modify `intact` or `compromised`.
- `compromised` is frozen — the array cannot be pushed to or re-indexed.
- Detects `Object.prototype` key-set pollution injected after module load (I5).

## Limitations

- **Cannot detect pre-import poisoning.** Builtins are cached at module-load time. If an attacker overrides `Object.freeze` before `import 'constancy'` runs (e.g. via a Node.js `--require` preload hook), the cached reference is already the tampered version. `checkRuntimeIntegrity` then considers it intact (I6).
- **Restore trick defeats it (BYPASS I6).** An attacker who poisons a builtin, triggers a library operation, then restores the original before calling `checkRuntimeIntegrity` will see `intact: true`. The check is point-in-time, not historical.
- **`Map.prototype`, `Set.prototype`, `Array.prototype` methods not covered (BYPASS I3/I4).** Poisoning `Map.prototype.get` or `Array.prototype.push` is not detected. Extending coverage to every prototype method used by the library is a future improvement.
- **Best-effort, not cryptographic.** A determined attacker with early execution privileges can substitute builtins in a way that is structurally indistinguishable from the originals. This function targets accidental and opportunistic post-import poisoning scenarios.
- **`structuredClone` check is conditional.** If `structuredClone` is not defined in the runtime at module load, the check is skipped. Environments that add it later are not covered.

## Example

**Happy-path startup check:**

```ts
import { checkRuntimeIntegrity } from 'constancy';

const result = checkRuntimeIntegrity();

if (!result.intact) {
  console.error('Runtime integrity check failed:', result.compromised);
  process.exit(1);
}

// Safe to proceed
```

**Detecting `Object.freeze` override (audit I2):**

```ts
import { checkRuntimeIntegrity } from 'constancy';

// Attacker replaces Object.freeze with a no-op after import
(Object as any).freeze = (x: unknown) => x;

const result = checkRuntimeIntegrity();
console.log(result.intact);      // false
console.log(result.compromised); // ['Object.freeze']

// Restore
Object.freeze = /* original */;
```

**Detecting `Object.prototype` pollution (audit I5):**

```ts
import { checkRuntimeIntegrity } from 'constancy';

// Attacker injects a key into Object.prototype
Object.defineProperty(Object.prototype, '_secret', {
  configurable: true,
  get() { return 'LEAK'; },
});

const result = checkRuntimeIntegrity();
console.log(result.intact);      // false
console.log(result.compromised); // ['Object.prototype']

// Cleanup
delete (Object.prototype as any)._secret;
```

**Multiple compromised entries:**

```ts
import { checkRuntimeIntegrity } from 'constancy';

const origFreeze = Object.freeze;
const origProxy  = globalThis.Proxy;

(Object as any).freeze = (x: unknown) => x;
(globalThis as any).Proxy = class {};

const result = checkRuntimeIntegrity();
console.log(result.compromised);
// ['Object.freeze', 'Proxy'] — order matches BUILTIN_CHECKS table order

Object.freeze = origFreeze;
globalThis.Proxy = origProxy;
```

**Inspecting result shape:**

```ts
import { checkRuntimeIntegrity, type IntegrityResult } from 'constancy';

const result: IntegrityResult = checkRuntimeIntegrity();
// result is frozen:
Object.isFrozen(result);            // true
Object.isFrozen(result.compromised); // true
// result.intact: boolean
// result.compromised: readonly string[]
```

## Comparison with related APIs

| | `checkRuntimeIntegrity` | `isDeepFrozen` | `isImmutableView` |
|---|---|---|---|
| **Purpose** | Detect post-import builtin tampering | Check data-graph freeze status | Check Proxy provenance |
| **Mechanism** | Identity comparison + fingerprint | `Object.isFrozen` traversal | Module-private WeakSet |
| **Returns** | `IntegrityResult` | `boolean` | `boolean` |
| **Detects** | Poisoned globals, proto pollution | Unfrozen nodes | Non-view Proxies / plain objects |
| **Throws?** | Never | Never | Never |
| **Pre-import attacks?** | No — cached values used | N/A | N/A |

## Common mistakes

- **"I called it after restoring the builtin — it says `intact: true`."** The check is point-in-time (BYPASS I6). An attacker who poisons, operates, then restores before the check will not be detected.
- **"I expected `Map.prototype.get` poisoning to show up."** Prototype method checks beyond `Object.prototype` key-set fingerprinting are not implemented (BYPASS I3/I4). The check covers only the 17 builtins listed above plus the `Object.prototype` key fingerprint.
- **"I expected `intact: true` after importing in a preload-poisoned process."** If builtins were replaced before `import 'constancy'`, the cached copies were captured from the tampered environment. The function cannot distinguish the original from the replacement (preload limitation).
- **"I see `Reflect` in `compromised` — does that mean all Reflect methods are gone?"** The `'Reflect'` entry covers only the `typeof Reflect !== 'object' || Reflect === null` check — the Reflect namespace being missing or replaced entirely. Individual Reflect methods are checked separately.

## Type signature

```ts
export interface IntegrityResult {
  readonly intact: boolean;
  readonly compromised: readonly string[];
}

function checkRuntimeIntegrity(): IntegrityResult
```

The returned `IntegrityResult` object is itself frozen at runtime (both `intact` and `compromised` are non-writable). The `IntegrityResult` interface can be imported from `constancy` for TypeScript consumers.

## See also

- [`isDeepFrozen`](/verification/is-deep-frozen) — verify data-graph freeze status
- [`assertDeepFrozen`](/verification/assert-deep-frozen) — throw if the graph is not fully frozen
- [`isImmutableView`](/verification/is-immutable-view) — check Proxy provenance
- [Security Guide](/guide/security) — broader threat model and layered defense strategy
- [Security Audit reference — I-series](/reference/security-audit) — full audit findings for verification layer (I1–I6)
