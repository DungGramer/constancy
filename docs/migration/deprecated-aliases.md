---
title: Deprecated Aliases — v2.x to v3.0
description: Complete rename table for every API changed in v3.0 and a codemod snippet for bulk migration.
lastReviewed: 2026-04-17
sourceLocale: en
translationStatus: synced
---

# Deprecated Aliases

v3.0 renamed every API for semantic clarity. No backward-compat aliases were kept except `lock` (alias of `snapshot`). Use the table below to rename your call sites before upgrading.

## Rename Table

| Old (v2.x) | New (v3.0+) | Since | Removal |
|---|---|---|---|
| `constancy()` | `freezeShallow()` | 3.0.0 | removed — no alias |
| `immutable()` | `immutableView()` | 3.0.0 | removed |
| `isImmutable()` | `isImmutableView()` | 3.0.0 | removed |
| `immutableMap()` | `immutableMapView()` | 3.0.0 | removed |
| `immutableSet()` | `immutableSetView()` | 3.0.0 | removed |
| `lock()` | `snapshot()` | 3.0.0 | **alias kept indefinitely** |
| `secure()` | `secureSnapshot()` | 3.0.0 | removed |
| `tamperProof()` | `tamperEvident()` | 3.0.0 | removed |
| `assertImmutable()` | `assertDeepFrozen()` | 3.0.0 | removed |
| `checkIntegrity()` | `checkRuntimeIntegrity()` | 3.0.0 | removed |
| `TamperProofVault` | `TamperEvidentVault` | 3.0.0 | removed |

## Bulk Rename (Codemod)

The script below performs whole-word substitution across all TypeScript and JavaScript source files tracked by git.

```bash
# Backup first
git stash

# Run in project root
for pair in \
  "constancy freezeShallow" \
  "immutable immutableView" \
  "isImmutable isImmutableView" \
  "secure secureSnapshot" \
  "tamperProof tamperEvident" \
  "assertImmutable assertDeepFrozen" \
  "checkIntegrity checkRuntimeIntegrity" \
  "TamperProofVault TamperEvidentVault"; do
  old="${pair% *}"; new="${pair#* }"
  # TS/JS source
  git grep -l "\\b${old}\\b" -- "*.ts" "*.tsx" "*.js" "*.jsx" \
    | xargs sed -i "s/\\b${old}\\b/${new}/g"
done
```

> **Warning:** Whole-word boundary matters — `immutable` matches inside longer names (`immutableView`, `immutableMap`). The regex pattern above handles this, but review the diff carefully before committing. Run `git diff` and check for unintended replacements, especially in strings and comments.

After running the codemod, pop your stash and verify:

```bash
git diff
# Confirm changes look correct, then:
git stash pop
```
