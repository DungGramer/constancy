/**
 * Red-team bypass PoCs for Layer 1.5 (snapshot / lock).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { snapshot, lock } from '../../src/index';

describe('Layer 1.5 — snapshot/lock bypasses', () => {
  afterEach(() => {
    // Clean up any prototype pollution from tests
    delete (Object.prototype as any).pwned;
  });

  it('BYPASS S1: prototype pollution survives snapshot — clone preserves Object.prototype lookup', () => {
    (Object.prototype as any).pwned = 'GLOBAL';
    const snap = snapshot({ safe: 1 }) as Record<string, unknown>;
    // BYPASS: structuredClone produces plain object whose prototype chain still hits the polluted Object.prototype
    expect(snap.pwned).toBe('GLOBAL');
  });

  it('BYPASS S1b: lock() inherits polluted prototype as well (same underlying clone)', () => {
    (Object.prototype as any).pwned = 'VIA-LOCK';
    const locked = lock({ safe: 1 }) as Record<string, unknown>;
    expect(locked.pwned).toBe('VIA-LOCK');
  });

  it('documented S3: non-cloneable values throw — hostile payload causes DoS', () => {
    expect(() => snapshot({ fn: () => 1 })).toThrow(TypeError);
    expect(() => snapshot({ sym: Symbol('x') })).toThrow(TypeError);
  });

  it('BYPASS S4: snapshot(new Date()) preserves Date.prototype — poison affects snapshot', () => {
    const snap = snapshot(new Date(0));
    const originalGetTime = Date.prototype.getTime;
    try {
      Date.prototype.getTime = function () { return 999_999; };
      expect(snap.getTime()).toBe(999_999);
    } finally {
      Date.prototype.getTime = originalGetTime;
    }
  });
});
