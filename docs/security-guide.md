# Security Guide

## Security Model

Constancy protects data integrity at the **JavaScript execution level**. It prevents script-level mutations via Object.freeze, Proxy traps, closures, and structural hashing.

**Constancy does NOT protect against:**
- Browser DevTools protocol attacks (debugger scope editing, CDP)
- Chrome extensions with page access
- Network-level interception (MITM)
- Local file overrides in DevTools Sources panel
- Any attack that operates below the JS engine

## Defense Levels

| Level | API | What It Blocks |
|-------|-----|---------------|
| 0 | `freezeShallow()` / `deepFreeze()` | Property writes (strict mode only) |
| 1 | `immutableView()` | All mutations via Proxy (always throws, any mode) |
| 1.5 | `snapshot()` / `lock()` | Reference extraction via cloning |
| 2 | `vault()` | Reference extraction (closure isolation, copy-on-read) |
| 2.5 | `secureSnapshot()` | Descriptor manipulation (getter-only, non-configurable, null proto) |
| 3 | `tamperEvident()` | Detects internal corruption (structural hash verification) |

## Browser F12 Attack Matrix

| Attack | Script-Level? | Constancy Blocks? |
|--------|--------------|-------------------|
| Console `obj.x = y` | Yes | **Yes** (L1+) |
| `Object.defineProperty` | Yes | **Yes** (L1+) |
| `eval()` / `Function()` | Yes | **Yes** (same as console) |
| Prototype pollution | Yes | **Yes** (own prop + null proto at L3) |
| `Object.freeze` override | Yes | **Yes** (cached builtins) |
| Module export replacement | Yes | **Partial** (ESM frozen by spec) |
| Debugger scope panel edit | No (protocol) | **No** |
| CDP Runtime.evaluate | No (protocol) | **No** |
| Chrome extension scripts | No (privileged) | **No** |
| Local file override | No (network) | **No** |
| Network MITM | No (transport) | **No** |

## What You Must Do (App Developer Responsibilities)

### 1. Server-Side Validation (CRITICAL)
**Never trust client-side state for security decisions.** Always validate on the server.
```
// BAD: Trust client
if (user.isVip) grantAccess();

// GOOD: Validate on server
const user = await fetchUserFromDB(userId);
if (user.isVip) grantAccess();
```

### 2. Subresource Integrity (SRI)
Prevent script file replacement:
```html
<script src="constancy.min.js"
  integrity="sha384-<hash>"
  crossorigin="anonymous"></script>
```

### 3. Content Security Policy (CSP)
Block eval and inline scripts:
```
Content-Security-Policy: script-src 'self'; object-src 'none'
```

### 4. HTTPS + HSTS
Prevent network interception:
```
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

### 5. Runtime Integrity Check
Detect builtin tampering at startup:
```typescript
import { checkRuntimeIntegrity } from 'constancy';

const { intact, compromised } = checkRuntimeIntegrity();
if (!intact) {
  console.error('Compromised environment:', compromised);
  // Fail safely — don't proceed with sensitive operations
}
```

## Best Practice: Protecting Server Data with Constancy

### The Problem: Mutation Before Freeze
```typescript
// ❌ VULNERABLE: Gap between fetch and freeze
const data = await fetch('/api/user').then(r => r.json());
// Hacker can modify `data` HERE via F12 console before freeze
data.isVip = true;  // ← Hacker intercepts
const user = immutable(data);  // Freezes the HACKED value
```

### Pattern 1: Freeze Immediately in Fetch Wrapper
```typescript
import { immutableView } from 'constancy';

// ✅ SAFE: Freeze inside the async function — no gap
async function fetchUser(): Promise<DeepReadonly<User>> {
  const res = await fetch('/api/user');
  return immutableView(await res.json());  // Frozen instantly, no intermediate variable
}

const user = await fetchUser();
user.isVip; // false — cannot be intercepted between fetch and freeze
```

### Pattern 2: Vault for Maximum Isolation
```typescript
import { vault } from 'constancy';

// ✅ SAFEST: Deep clone + closure — original reference severed
async function fetchUserVault() {
  const res = await fetch('/api/user');
  return vault(await res.json());  // Cloned into closure, reference severed
}

const user = await fetchUserVault();
user.get().isVip; // false — every get() returns a new frozen copy
```

### Pattern 3: Secure Snapshot for Critical Permissions
```typescript
import { secureSnapshot } from 'constancy';

// ✅ HARDENED: Null proto + getter-only + non-configurable
async function fetchPermissions() {
  const res = await fetch('/api/permissions');
  return secureSnapshot(await res.json());  // No value property, no prototype, permanent
}

const perms = await fetchPermissions();
perms.isVip;                                    // false (getter)
perms.isVip = true;                             // TypeError
Object.defineProperty(perms, 'isVip', {value: true}); // TypeError
```

### Pattern 4: Tamper-Evident for Audit Trail
```typescript
import { tamperEvident } from 'constancy';

// ✅ AUDITABLE: Vault + hash fingerprint
async function fetchConfig() {
  const res = await fetch('/api/config');
  return tamperEvident(await res.json());
}

const config = await fetchConfig();
config.get().maxRetries;  // 3
config.verify();          // true — integrity intact
config.fingerprint;       // "a3k9h2" — use for server-side comparison
```

### Pattern 5: Integrity Check at App Startup
```typescript
import { checkRuntimeIntegrity, immutableView } from 'constancy';

// ✅ DETECT COMPROMISED ENVIRONMENT: Check before any API calls
async function initApp() {
  const { intact, compromised } = checkRuntimeIntegrity();
  if (!intact) {
    reportSecurityIncident(compromised);
    return;  // Don't proceed
  }

  const user = immutableView(await fetch('/api/user').then(r => r.json()));
  // Safe to proceed
}
```

### Key Rules
1. **Never store API response in a mutable variable first** — freeze inline
2. **Use `vault()` or `secureSnapshot()` for permissions/tokens** — not just `immutableView()`
3. **Always validate on server** — client-side freeze is defense-in-depth, not security boundary
4. **Check integrity at startup** — detect tampered environments before making API calls
5. **Use HTTPS + SRI + CSP** — prevent network interception and script replacement

## Choosing the Right Defense Level

| Use Case | Recommended Level |
|----------|------------------|
| Config objects, UI state | L0 (`deepFreeze`) |
| User permissions, feature flags | L1 (`immutableView`) |
| Data that must not reflect original changes | L1.5 (`snapshot`) |
| API keys, tokens (client-side) | L2 (`vault`) |
| Security-critical state | L2.5 (`secureSnapshot`) |
| Audit trail, compliance data | L3 (`tamperEvident`) |

## Bottom Line

> Constancy makes JavaScript immutability as strong as the language allows. But **real security lives on the server.** Client-side protection is defense-in-depth, not a security boundary.
