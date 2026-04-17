---
title: Release Notes
description: Version-by-version highlights with links to full changelog
lastReviewed: 2026-04-17
sourceLocale: en
translationStatus: synced
---

# Release Notes

Version highlights are listed below in reverse-chronological order. For the full commit-level log see the [Changelog](/release-notes/changelog) or the [GitHub Releases](https://github.com/DungGramer/constancy/releases) page.

---

## v3.0.1 — 2026-04-17

**Security hardening: 12 audit vectors closed, 100% backward compatible.**

- Closed 12 security audit vectors across all API layers (F1, F4/I1, V1, V3, V5, S1, X1, T1/T7, T2/T3/T4, P2/P3, I2/I5)
- New opt-in flag `freezePrototypeChain: true` on `deepFreeze()` defends against post-freeze prototype poisoning (F1)
- New opt-in flag `blockToJSON: true` on `immutableView()` prevents `JSON.stringify` from invoking the target's `toJSON()` (V5)
- `stableStringify()` upgraded to 64-bit fingerprint (djb2+sdbm); now reaches into Map/Set/Date/RegExp internal slots (T1/T7, T2/T3/T4)
- `checkRuntimeIntegrity()` expanded to verify `Reflect.get/has/getOwnPropertyDescriptor/getPrototypeOf/isExtensible` and `Object.prototype` key-set fingerprint (I2/I5)
- +50 security regression tests; total suite: 228+ passing

All new parameters default to `false`; no existing call sites affected.

[GitHub release](https://github.com/DungGramer/constancy/releases/tag/v3.0.1)

---

## v3.0.0 — 2026-04-16

**Rewrite: semantic API + SLSA 3 provenance.**

- Complete API rename for semantic clarity — all old names removed, no backward-compat aliases (see [migration guide](/migration/from-v2-to-v3))
- Minimum Node.js raised to **≥ 20**
- SLSA 3 provenance attestation published to npm
- Jazzer.js fuzz testing integrated into CI
- Five explicit mental models: **Freeze / View / Snapshot / Isolation / Verification**
- 169 tests, ~95% statement coverage at release

[GitHub release](https://github.com/DungGramer/constancy/releases/tag/v3.0.0) · [Migration guide](/migration/from-v2-to-v3)

---

## v2.0.0 — 2026-04-08

**Cached builtins + collection views.**

- `Object.freeze`, `Reflect.ownKeys`, and other builtins cached at module load for post-import tamper resistance
- `immutableMap()` and `immutableSet()` added as read-only collection wrappers
- Full TypeScript rewrite (strict mode); dual ESM + CJS build via tsup
- Breaking: minimum Node.js raised to **≥ 18**; ESM-first package; root `index.js` removed

[GitHub release](https://github.com/DungGramer/constancy/releases/tag/v2.0.0)

---

## v1.x — Archive

Stable shallow-freeze releases with Object.freeze polyfill and Jest test suite.

[All v1.x releases on GitHub](https://github.com/DungGramer/constancy/releases?q=v1&expanded=true)
