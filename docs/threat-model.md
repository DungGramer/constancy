# Threat Model

## What Constancy Protects
- Script-level mutations (property assignment, defineProperty, delete, prototype manipulation)
- Collection mutations (Map/Set/Date/WeakMap/WeakSet method blocking via Proxy)
- Reference isolation (vault, lock — clone-based)
- Builtin tampering detection (cached references at import time)

## What Constancy Does NOT Protect
- DevTools protocol attacks (debugger scope editing, CDP)
- Pre-import builtin override (userscript before module loads)
- Network-level attacks (MITM, file replacement)
- Browser extensions with page access
- Original reference mutation when using `immutable()` (it's a view, not snapshot)

## API Capability Model

| API | Blocks mutation through ref? | Data truly frozen? | Severs original ref? | Detects tampering? |
|-----|-----------------------------|--------------------|---------------------|--------------------|
| `freezeShallow()` | Yes (strict mode) | No | No | No |
| `deepFreeze(val, {freezePrototypeChain?})` | Yes (strict mode) | Yes | No | No |
| `immutableView(val, {blockToJSON?})` | Yes (always throws) | **No — VIEW only** | No | No |
| `snapshot()` / `lock()` | Yes (frozen) | **Yes** (clone+freeze) | **Yes** (clone) | No |
| `vault()` | N/A (copy-on-read) | Yes (closure) | Yes (clone) | No |
| `secureSnapshot()` | Yes (getter-only) | Yes (closure store) | Yes (snapshot) | No |
| `tamperEvident()` | N/A (copy-on-read) | Yes (closure) | Yes (clone) | Yes (64-bit hash) |
| `checkRuntimeIntegrity()` | N/A | N/A | N/A | Yes (12 builtin checks) |

## The View vs Snapshot Distinction

### `immutableView()` = View
```typescript
const raw = { isVip: false };
const view = immutableView(raw);
view.isVip = true;   // TypeError — blocked through proxy
raw.isVip = true;    // WORKS — original not protected
view.isVip;          // true — view reflects original mutation
```
Use when: you control all references, want runtime throws on accidents.

### `snapshot()` / `lock()` = Snapshot
```typescript
const raw = { isVip: false };
const snap = snapshot(raw);  // or lock(raw) — same thing
raw.isVip = true;       // original mutated
snap.isVip;             // false — clone is independent
snap.isVip = true;      // TypeError — data is frozen
```
Use when: you need true data immutability, don't care about identity.

## Known Limitations
- **Proxy + freeze incompatible**: JS spec §10.5.8 requires get trap to return exact value for non-writable/non-configurable props. Cannot combine deep Proxy wrapping with Object.freeze on same object. TC39 will not relax this.
- **`immutableView()` is a view**: retaining original reference allows underlying data mutation
- **JSON clone fallback** (pre-Node 17): loses Date, Map, Set, functions, undefined
- **`tamperEvident()` hash**: covers string + Symbol keys; does not cover Map/Set internal data or circular refs

## Choosing the Right API
```
Prevent accidental mutation?          → deepFreeze() or freezeShallow()
Runtime throws on all mutation?       → immutableView() (view — don't retain original)
True data immutability + clone?       → snapshot() or lock() (snapshot)
Complete reference isolation?         → vault() (copy-on-read)
Maximum descriptor hardening?         → secureSnapshot() (getter-only, null proto)
Integrity verification?               → tamperEvident() (hash fingerprint)
Detect compromised environment?       → checkRuntimeIntegrity()
```
