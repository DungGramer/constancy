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

  it('S1 fix: prototype pollution DOES NOT survive snapshot — null prototype applied to plain objects', () => {
    (Object.prototype as any).pwned = 'GLOBAL';
    const snap = snapshot({ safe: 1 }) as Record<string, unknown>;
    // Fix: nullifyPlainPrototypes severs Object.prototype from plain-object nodes
    expect(snap.pwned).toBeUndefined();
    expect(Object.getPrototypeOf(snap)).toBeNull();
  });

  it('S1b fix: lock() (alias) also sheds Object.prototype', () => {
    (Object.prototype as any).pwned = 'VIA-LOCK';
    const locked = lock({ safe: 1, nested: { inner: 2 } }) as Record<string, any>;
    expect(locked.pwned).toBeUndefined();
    expect(locked.nested.pwned).toBeUndefined();
    expect(Object.getPrototypeOf(locked.nested)).toBeNull();
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
