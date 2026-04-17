---
layout: home
title: Constancy
description: Zero-dependency immutability toolkit — freeze, view, snapshot, vault, and integrity verification for JavaScript and TypeScript.
lastReviewed: 2026-04-17
sourceLocale: en
translationStatus: synced
hero:
  name: Constancy
  text: Immutability primitives for JavaScript
  tagline: From freeze to isolated snapshots — 7 defense levels, zero dependencies, TypeScript-first.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: API Reference
      link: /reference/api-overview
    - theme: alt
      text: Choose the Right Model
      link: /guide/choose-the-right-model
features:
  - title: Freeze
    icon: "🧊"
    details: In-place freeze with freezeShallow and deepFreeze. No clone, no overhead.
    link: /freeze/freeze-shallow
  - title: View
    icon: "👁"
    details: Proxy-based read-only view that throws on any mutation through that reference.
    link: /view/immutable-view
  - title: Snapshot
    icon: "📸"
    details: Clone + deep freeze for true data immutability. Original is unaffected.
    link: /snapshot/snapshot
  - title: Isolation
    icon: "🔒"
    details: Closure isolation with vault — copy-on-read, reference leak impossible.
    link: /isolation/vault
  - title: Verification
    icon: "✅"
    details: Detect builtin tampering at runtime with checkRuntimeIntegrity.
    link: /verification/check-runtime-integrity
---

## Choose the right tool

| Need | Use |
|------|-----|
| Freeze existing object in place | `freezeShallow`, `deepFreeze` |
| Prevent mutation via one reference | `immutableView` |
| Create immutable data copy | `snapshot` |
| Prevent any mutable reference leak | `vault` |
| Harden plain config object | `secureSnapshot` |
| Add integrity fingerprint | `tamperEvident` |
| Verify immutability at runtime | `isDeepFrozen`, `assertDeepFrozen` |
| Detect builtin tampering | `checkRuntimeIntegrity` |

Not sure which to pick? See [Choose the Right Model](/guide/choose-the-right-model) for a decision flowchart and comparison matrix.

## Why constancy?

Most "freeze" libraries stop at `Object.freeze`. Constancy gives you 7 levels of protection — from shallow freeze to tamper-evident vaults with hash verification — and defends against prototype pollution, builtin override attacks, and reference extraction. Zero dependencies, SLSA 3 provenance, fuzz-tested, 228+ tests at 98% coverage.
