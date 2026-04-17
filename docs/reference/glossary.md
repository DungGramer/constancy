---
title: Glossary
description: Definitions for the core terms used throughout the constancy documentation and source code.
lastReviewed: 2026-04-17
sourceLocale: en
translationStatus: synced
---

# Glossary

Terms are listed alphabetically. Each entry is the canonical definition used throughout the source code, tests, and documentation.

---

## Audit Vector

A named bypass pattern identified during red-team review, written as a category letter + number (e.g., V1, S1, T2, F1). Each audit vector has a corresponding regression test that must remain green. The names appear in JSDoc comments wherever the code specifically defends against that pattern.

---

## Cached Builtin

A module-level reference to a standard global such as `Object.freeze`, `Reflect.ownKeys`, or `JSON.stringify`, captured at import time before any user code runs. Because the reference is stored in a `const`, later monkey-patching of the global (`Object.freeze = x => x`) does not affect the cached copy. `checkRuntimeIntegrity()` detects when a live global no longer matches its cached counterpart.

---

## Deep Frozen

An object graph in which every reachable object satisfies `Object.isFrozen(obj) === true` and no own property is an accessor descriptor (getter/setter). Arrays, nested objects, and function properties are all included. TypedArrays and Map/Set internal slots are not covered by `Object.freeze`; see the [limitations section](/freeze/deep-freeze#known-limitations) for details.

---

## Fingerprint

A 64-bit structural hash produced by combining two independent non-cryptographic algorithms: djb2 (shift-and-add) and sdbm (multiply-and-XOR). The two 32-bit halves are concatenated as base-36 strings. The combined width raises the birthday bound to roughly 2^32 attempts before a collision is expected. This is a bug-detection and accidental-mutation-detection tool — it is **not** cryptographically secure and must not be used as a security proof against a motivated attacker.

---

## Mental Model

One of the five API categories that constancy organizes its exports into: **Freeze** (in-place mutation block), **View** (Proxy-wrapped reference), **Snapshot** (clone + freeze), **Isolation** (closure + copy-on-read), and **Verification** (runtime integrity check). Picking the right mental model for a use case is the first step in the [getting started guide](/guide/getting-started).

---

## Plain Object

An object whose `[[Prototype]]` is exactly `Object.prototype` or `null`. Plain objects have predictable key enumeration and no hidden internal slots. Contrast with class instances (which have a custom prototype chain) and built-in objects such as `Map` or `Date` (which carry internal slots that `Object.freeze` does not reach).

---

## Proxy Invariant

A constraint imposed by the ECMAScript specification (§10.5.8) on Proxy handler traps. Specifically: if a property on the target is both non-writable and non-configurable, the `get` trap must return the exact same value that is stored on the target — it cannot substitute a wrapped version. `immutableView()` detects frozen descriptors and returns the raw value in those cases to avoid a `TypeError` from the runtime invariant check.

---

## Snapshot

An independent frozen clone of a value produced at a point in time. Because it is a deep copy, subsequent mutations to the original object have no effect on the snapshot. Compare with **View**, which is a live reference to the original data, and **Vault**, which additionally hides the stored reference inside a closure.

---

## Vault

A closure-captured, frozen deep copy of a value where no reference to the internal state ever escapes. Every call to `get()` returns a **new** frozen copy, so callers can never retain a reference that reflects future internal changes. The original value passed to `vault()` is cloned and frozen immediately; the caller's reference to the original is not affected.

---

## View

A `Proxy`-wrapped reference to an existing object that intercepts and rejects all mutation operations (`set`, `deleteProperty`, `defineProperty`, `setPrototypeOf`, and collection mutator methods). The underlying object is not cloned or frozen — if the original owner retains the unwrapped reference they can still mutate the data. A view is a read-only lens, not a guarantee of immutability for the data itself.
