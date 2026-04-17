---
title: Limitations
description: Honest constraints of the constancy API — know these before shipping to production.
lastReviewed: 2026-04-17
sourceLocale: en
translationStatus: synced
---

# Limitations

## Map/Set internal slots are not frozen by `deepFreeze`

`Object.freeze` on a `Map` or `Set` freezes the object shell — no new own properties — but the internal slot (the actual map/set data) is accessed through methods that live on the prototype, not as own properties. After `deepFreeze(map)`, calling `map.set(k, v)` or `map.add(v)` succeeds silently (F2, documented).

```typescript
import { deepFreeze } from 'constancy';

const m = deepFreeze(new Map([['a', 1]]));
m.set('b', 2);  // WORKS — internal slot not frozen
m.get('b');     // 2
```

**Workaround**: use `immutableView(map)` to proxy-block all mutator methods.

## `structuredClone` domain — non-cloneable values throw

`snapshot`, `vault`, and `secureSnapshot` all use `structuredClone` internally. Values that are not in the structured clone algorithm's domain throw at call time (S3, U1):

- Functions
- DOM nodes
- Identity Symbols (symbols registered with `Symbol.for` work, bare `Symbol()` do not)
- Class instances with non-serializable internal state (e.g., `WeakMap`, `WeakSet`, `Promise`)
- `undefined` in non-array positions is preserved by `structuredClone` but may differ from `JSON` behavior

```typescript
import { snapshot } from 'constancy';

snapshot({ fn: () => {} });       // throws DataCloneError
snapshot({ node: document.body }) // throws DataCloneError
snapshot(Symbol('x'));            // throws DataCloneError
```

`deepFreeze` and `immutableView` do NOT clone — they are unaffected by this limit.

## `tamperEvident` is NOT cryptographic {#tamperevident-is-not-cryptographic}

The `tamperEvident` fingerprint uses a **64-bit djb2+sdbm hash** (T1). This detects:

- Accidental mutation (bugs, unintended state drift)
- Prototype pollution (if the structural layout changes)
- In-process data corruption

This does NOT protect against:

- Adversarial hash attacks — a determined attacker with control over the input can craft a collision in ~2^16 attempts
- Pre-import poisoning — if `JSON.stringify` was overridden before the module loaded, the hash may be computed over attacker-controlled output
- Replay attacks — there is no secret key, no nonce, no timestamp in the hash
- Out-of-process attacks — network MITM, file replacement, DevTools CDP

For cryptographic integrity guarantees, hash the data server-side with HMAC-SHA256 and verify the signature on the server.

```typescript
// tamperEvident: good for detecting bugs, NOT for security boundaries
const vault = tamperEvident({ plan: 'free', seats: 1 });
vault.verify();       // true if structurally intact
vault.assertIntact(); // throws on mismatch

// DO NOT use fingerprint alone as a security gate
// DO validate entitlements server-side on every privileged request
```

## `immutableView` is a VIEW, not a snapshot

If you retain the original reference, mutations through it are visible through the view — and are not prevented:

```typescript
import { immutableView } from 'constancy';

const raw = { count: 0 };
const view = immutableView(raw);

raw.count = 99;  // WORKS — original not protected
view.count;      // 99 — view reflects mutation (V8, documented)
```

This is by design. The view only blocks mutations through the proxy reference. See [VIEW vs SNAPSHOT](/guide/mental-models#view-vs-snapshot).

## `secureSnapshot` — plain objects only

`secureSnapshot` throws `TypeError` on any input that is not a plain object graph:

- Objects with accessor properties (`get`/`set` descriptors) — throws (X1 fix; previous versions silently dropped them)
- Symbols without a string description — throws
- Non-plain nested objects (Date, Map, Array, class instances) — throws
- Functions — throws

```typescript
import { secureSnapshot } from 'constancy';

secureSnapshot({ get x() { return 1; } });  // TypeError: accessor property
secureSnapshot({ arr: [1, 2, 3] });         // TypeError: non-plain nested
```

`deepFreeze` and `snapshot` handle arrays and class instances.

## Runtime support

- **Node.js**: ≥ 20 required (uses `structuredClone`, ES2022 features)
- **Browsers**: ES2022+ (Chrome 94+, Firefox 93+, Safari 16+, Edge 94+)
- **TypeScript**: any version with `"lib": ["ES2022"]` or later in tsconfig

No polyfills are provided. If your environment lacks `structuredClone`, `snapshot`, `vault`, and `secureSnapshot` will throw at call time.

## `checkRuntimeIntegrity` is best-effort, post-import only

`checkRuntimeIntegrity` verifies that 17 known builtins (`Object.freeze`, `Reflect.get`, `Array.prototype.push`, etc.) still match the references captured at module load time. It also checks the `Object.prototype` key-set fingerprint (I2/I5 fix in v3.0.1).

Limitations:

- **Cannot detect pre-import poisoning**: if a malicious script ran before `constancy` loaded and overrode `Object.freeze`, the cached reference is already the poisoned one (I6)
- **Best called at startup**: the longer you wait, the more attack surface has elapsed
- **Does not scan all possible attack surfaces**: it covers the 17 builtins constancy itself uses; other builtins used by your app are not checked

```typescript
import { checkRuntimeIntegrity } from 'constancy';

// Call this as early as possible in your app startup:
const { intact, compromised } = checkRuntimeIntegrity();
if (!intact) {
  console.error('Compromised:', compromised);
  // fail safely — do not proceed with sensitive operations
}
```

## TypedArray byte data is mutable after `deepFreeze`

`Object.freeze` acts on the TypedArray object shell (own properties), not on the underlying `ArrayBuffer` data. After `deepFreeze`, index-based element access still allows mutations (F3, documented):

```typescript
import { deepFreeze } from 'constancy';

const arr = new Uint8Array([1, 2, 3]);
deepFreeze(arr);
arr[0] = 99;  // WORKS — byte data not frozen
arr[0];       // 99
```

There is no API in constancy that freezes TypedArray element data. Constancy skips `Object.freeze` on TypedArrays entirely to avoid a native runtime throw (`Object.freeze` on a non-empty TypedArray throws in strict mode).
