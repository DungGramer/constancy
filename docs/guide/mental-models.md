---
title: Mental Models
description: Deep dive into VIEW vs SNAPSHOT vs VAULT, freeze semantics, and shallow vs deep — the distinctions that matter.
lastReviewed: 2026-04-17
sourceLocale: en
translationStatus: synced
---

# Mental Models

## VIEW vs SNAPSHOT {#view-vs-snapshot}

This is the #1 confusion in constancy. The README leads with it for a reason.

| Property | `immutableView` (VIEW) | `snapshot` (SNAPSHOT) |
|----------|------------------------|----------------------|
| Clones data? | No — same object | Yes — `structuredClone` |
| Freezes original? | No | Yes (the clone) |
| Original still mutable? | **Yes** | No |
| Reflects subsequent mutations? | **Yes** | No — independent |
| Severs reference? | No | Yes |

Side-by-side example showing the critical difference:

```typescript
import { immutableView, snapshot } from 'constancy';

const raw = { isVip: false };

// --- VIEW ---
const view = immutableView(raw);
view.isVip = true;   // TypeError — blocked through proxy
raw.isVip = true;    // WORKS — original not protected
view.isVip;          // true — view reflects the mutation!

// --- SNAPSHOT ---
const snap = snapshot(raw);
snap.isVip = true;   // TypeError — data is frozen
raw.isVip = true;    // original mutated — doesn't affect snap
snap.isVip;          // false — snapshot is independent
```

**Use `immutableView` when:**
- You control all references to the underlying object
- You want runtime throws on accidental mutation at one call site
- Zero clone cost is important (high-frequency objects)
- You understand that retaining the original ref bypasses protection

**Use `snapshot` when:**
- Untrusted code might retain the original reference
- You need the frozen value to remain stable across time
- You're snapshotting state before an operation (Redux, undo/redo)
- Identity/reference equality doesn't need to be preserved

## Freeze vs Seal vs Non-extensible {#freeze-semantics}

JavaScript has three levels of object lock-down:

| Operation | New props? | Delete props? | Modify values? | `Object.isFrozen` |
|-----------|-----------|--------------|----------------|-------------------|
| `Object.preventExtensions` | No | Yes | Yes | No |
| `Object.seal` | No | No | Yes | No |
| `Object.freeze` | No | No | No | Yes |

`freezeShallow` calls `Object.freeze` on the top-level object only. Nested objects remain unfrozen:

```typescript
import { freezeShallow } from 'constancy';

const obj = freezeShallow({ a: 1, b: { c: 2 } });
obj.a = 99;    // ignored (silently in sloppy mode, throws in strict)
obj.b.c = 99;  // WORKS — nested object not frozen
```

`deepFreeze` recurses through the entire graph, freezing every nested object:

```typescript
import { deepFreeze } from 'constancy';

const obj = deepFreeze({ a: 1, b: { c: 2 }, tags: ['x'] });
obj.b.c = 99;      // TypeError
obj.tags.push('y'); // TypeError
```

What constancy adds on top of native `Object.freeze`:
- **Cycle safety**: WeakSet tracks visited objects, no infinite recursion
- **Symbol key coverage**: `Reflect.ownKeys` includes symbol-keyed properties
- **Cached builtins**: `_freeze` is captured at module load time — post-import `Object.freeze` override attacks fail
- **TypedArray safety**: skips freeze on TypedArray elements (native throw prevention)
- **Prototype chain option**: `deepFreeze(val, { freezePrototypeChain: true })` freezes the prototype chain to defend against post-freeze method poisoning (F1)

**Use `freezeShallow` when:**
- Object is flat (no nested mutable values)
- You only need to prevent top-level reassignment

**Use `deepFreeze` when:**
- Object has nested properties you want frozen
- You need full graph immutability without a clone

## Shallow vs Deep {#shallow-vs-deep}

The canonical `Object.freeze` gotcha:

```typescript
const obj = Object.freeze({ user: { name: 'Alice' } });
obj.user = null;        // ignored
obj.user.name = 'Bob';  // WORKS — nested not frozen
```

`deepFreeze` closes this gap. But it has its own limits:

- **Map/Set internal slots**: `Object.freeze` on a `Map` or `Set` prevents adding new own properties, but the internal slot (the actual map/set data) is still accessible through methods. `deepFreeze(map)` does NOT prevent `map.set(k, v)`. Use `immutableView` for Map/Set method blocking (audit vector F2, documented).
- **TypedArray byte data**: `deepFreeze` freezes the TypedArray object shell (no new own props), but the underlying byte buffer is raw memory. `uint8[0] = 99` still works after `deepFreeze(uint8)` (F3, documented).
- **Accessor descriptors**: `deepFreeze` skips accessor properties (`get`/`set`) to avoid unintended side effects. Each getter call returns a fresh (possibly mutable) object.

**Use `deepFreeze` when:**
- Your object contains nested plain objects and arrays
- You want the cheapest form of deep immutability (no clone)

**Do NOT rely on `deepFreeze` for:**
- Map/Set data immutability — use `immutableView(map)` instead
- TypedArray element immutability — no current API covers this

## VAULT vs SNAPSHOT {#vault-vs-snapshot}

Both sever the original reference. The key difference is what happens when a caller mutates the returned value:

```typescript
import { snapshot, vault } from 'constancy';

const data = { items: [1, 2, 3] };

// --- SNAPSHOT ---
const snap = snapshot(data);
snap.items.push(4);  // TypeError — frozen

// --- VAULT ---
const v = vault(data);
const copy1 = v.get();   // fresh frozen copy
const copy2 = v.get();   // another fresh frozen copy
copy1 === copy2;         // false — always new object

// vault copy IS frozen
copy1.items.push(4);     // TypeError
// but vault state unchanged regardless
v.get().items;           // [1, 2, 3]
```

`snapshot` gives you one frozen object forever. `vault` gives you a new frozen copy per access — useful when you need to hand the same "protected value" to many consumers without letting them share a reference.

**Use `snapshot` when:**
- You want one stable frozen object to compare/inspect
- Reference equality matters (same object identity across accesses)

**Use `vault` when:**
- Reference extraction must be impossible
- You're storing secrets or tokens
- You explicitly want callers to receive independent copies (no aliasing)
