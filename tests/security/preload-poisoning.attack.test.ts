/**
 * Cross-cutting preload / supply-chain bypasses.
 * Simulates an attacker poisoning globals BEFORE a module re-import (e.g., via NODE_OPTIONS=--require).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Cross-cutting — preload poisoning', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('P2 fix: structuredClone preload poison detected at import (self-test throws)', async () => {
    const originalSC = globalThis.structuredClone;
    (globalThis as any).structuredClone = (v: unknown) => ({ poisoned: true, original: v });
    try {
      await expect(import('../../src/index')).rejects.toThrow(/structuredClone is compromised/);
    } finally {
      (globalThis as any).structuredClone = originalSC;
    }
  });

  it('P3 fix: JSON.stringify preload poison detected at import (self-test throws)', async () => {
    const originalJSON = JSON.stringify;
    (JSON as any).stringify = () => '"FORGED"';
    try {
      await expect(import('../../src/index')).rejects.toThrow(/JSON\.stringify is compromised/);
    } finally {
      (JSON as any).stringify = originalJSON;
    }
  });

  it('P3 runtime: tamperEvident uses cached JSON.stringify — post-import poison ignored', async () => {
    const mod = await import('../../src/index');
    const v = mod.tamperEvident({ x: 1 });
    const originalJSON = JSON.stringify;
    (JSON as any).stringify = () => '"FORGED"';
    try {
      // verify() recomputes via cached _jsonStringify, not poisoned JSON.stringify
      expect(v.verify()).toBe(true);
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

  it('P1 fix: self-test now exercises all cached builtins (Object.freeze, JSON.stringify, Reflect.ownKeys, getOwnPropertyDescriptor, Array.isArray, structuredClone)', async () => {
    // Regression: preload poison of any cached builtin trips the self-test.
    const original = Object.getOwnPropertyDescriptor;
    (Object as any).getOwnPropertyDescriptor = () => undefined;
    try {
      await expect(import('../../src/index')).rejects.toThrow(/Object\.getOwnPropertyDescriptor is compromised/);
    } finally {
      (Object as any).getOwnPropertyDescriptor = original;
    }
  });
});
