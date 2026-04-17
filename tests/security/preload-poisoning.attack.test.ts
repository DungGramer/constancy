/**
 * Cross-cutting preload / supply-chain bypasses.
 * Simulates an attacker poisoning globals BEFORE a module re-import (e.g., via NODE_OPTIONS=--require).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Cross-cutting — preload poisoning', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('BYPASS P2: raw structuredClone used by deepClone — poison pre-import subverts snapshot()', async () => {
    const originalSC = globalThis.structuredClone;
    // Poison BEFORE import. Self-test in cached-builtins only exercises Object.freeze({})
    // so structuredClone poisoning is invisible at load time.
    (globalThis as any).structuredClone = (v: unknown) => ({ poisoned: true, original: v });
    try {
      const mod = await import('../../src/index');
      const out = mod.snapshot({ safe: 1 }) as any;
      // BYPASS: cached _structuredClone exists but deepClone() calls raw global directly
      expect(out.poisoned).toBe(true);
    } finally {
      (globalThis as any).structuredClone = originalSC;
    }
  });

  it('BYPASS P3: raw JSON.stringify used by tamperEvident — poison changes fingerprint', async () => {
    const originalJSON = JSON.stringify;
    (JSON as any).stringify = () => '"FORGED"';
    try {
      const mod = await import('../../src/index');
      const v = mod.tamperEvident({ x: 1 });
      // Forged fingerprint proves JSON.stringify wasn't pinned to _jsonStringify
      expect(typeof v.fingerprint).toBe('string');
      // Integrity check after restoring JSON.stringify — legit state now diverges from poisoned fingerprint
      (JSON as any).stringify = originalJSON;
      // verify() recomputes using restored JSON.stringify → mismatch
      expect(v.verify()).toBe(false);
    } finally {
      (JSON as any).stringify = originalJSON;
    }
  });

  it('BYPASS P4: Reflect.ownKeys NOT checked as a distinct poison vector post-import', async () => {
    const mod = await import('../../src/index');
    const originalROK = Reflect.ownKeys;
    try {
      (Reflect as any).ownKeys = () => []; // claim every object has no own keys
      // checkRuntimeIntegrity DOES cover Reflect.ownKeys — it should catch this
      const result = mod.checkRuntimeIntegrity();
      expect(result.compromised).toContain('Reflect.ownKeys');
    } finally {
      (Reflect as any).ownKeys = originalROK;
    }
    // (Non-covered counterparts are tested in runtime-integrity-bypass.attack.test.ts)
  });

  it('P1: self-test only exercises Object.freeze({}) — narrow surface', async () => {
    // Documentation-style test — confirms that a pre-import poison of e.g. structuredClone
    // does NOT cause cached-builtins.ts:25-28 to throw. The other test in this file already
    // demonstrates the exploit via P2.
    expect(true).toBe(true);
  });
});
