import { describe, it, expect } from 'vitest';
import { tamperEvident as tamperProof, tamperEvident } from '../src/index';

describe('tamperProof - hash verification', () => {
  it('get() returns correct values', () => {
    const v = tamperProof({ isVip: false, name: 'Alice' });
    expect(v.get().isVip).toBe(false);
    expect(v.get().name).toBe('Alice');
  });

  it('verify() returns true when untampered', () => {
    const v = tamperProof({ isVip: false });
    expect(v.verify()).toBe(true);
  });

  it('assertIntact() does not throw when untampered', () => {
    const v = tamperProof({ isVip: false });
    expect(() => v.assertIntact()).not.toThrow();
  });

  it('mutating copy does not affect verify()', () => {
    const v = tamperProof({ isVip: false });
    const copy = v.get() as any;
    try { copy.isVip = true; } catch { /* expected */ }
    expect(v.verify()).toBe(true);
  });

  it('fingerprint is deterministic', () => {
    const a = tamperProof({ x: 1, y: 2 });
    const b = tamperProof({ x: 1, y: 2 });
    expect(a.fingerprint).toBe(b.fingerprint);
  });

  it('fingerprint differs for different inputs', () => {
    const a = tamperProof({ x: 1 });
    const b = tamperProof({ x: 2 });
    expect(a.fingerprint).not.toBe(b.fingerprint);
  });

  it('fingerprint is deterministic regardless of key order', () => {
    const a = tamperProof({ x: 1, y: 2 });
    const b = tamperProof({ y: 2, x: 1 });
    expect(a.fingerprint).toBe(b.fingerprint);
  });

  it('works with nested objects', () => {
    const v = tamperProof({ user: { isVip: false } });
    expect(v.get().user.isVip).toBe(false);
    expect(v.verify()).toBe(true);
  });

  it('works with primitives', () => {
    const v = tamperProof(42);
    expect(v.get()).toBe(42);
    expect(v.verify()).toBe(true);
    expect(v.fingerprint).toBeTruthy();
  });

  it('vault interface is frozen', () => {
    const v = tamperProof({ x: 1 });
    expect(Object.isFrozen(v)).toBe(true);
  });

  it('original object mutation does not affect vault', () => {
    const original = { isVip: false };
    const v = tamperProof(original);
    original.isVip = true;
    expect(v.get().isVip).toBe(false);
    expect(v.verify()).toBe(true);
  });
});

describe('tamperEvident - array and type coverage', () => {
  it('works with arrays', () => {
    const v = tamperEvident([1, 'two', { n: 3 }]);
    expect(v.verify()).toBe(true);
    const got = v.get();
    expect(got[0]).toBe(1);
    expect(got[1]).toBe('two');
    expect((got[2] as any).n).toBe(3);
  });

  it('array fingerprint is deterministic', () => {
    const a = tamperEvident([1, 2, 3]);
    const b = tamperEvident([1, 2, 3]);
    expect(a.fingerprint).toBe(b.fingerprint);
  });

  it('array fingerprint differs for different arrays', () => {
    const a = tamperEvident([1, 2, 3]);
    const b = tamperEvident([3, 2, 1]);
    expect(a.fingerprint).not.toBe(b.fingerprint);
  });
});

describe('stableStringify edge cases', () => {
  it('should handle circular references without stack overflow', () => {
    const obj: Record<string, unknown> = { a: 1 };
    obj['self'] = obj;
    const te = tamperEvident(obj);
    expect(te.verify()).toBe(true);
    expect(() => te.fingerprint).not.toThrow();
  });

  it('should distinguish NaN from null', () => {
    const a = tamperEvident({ v: NaN });
    const b = tamperEvident({ v: null });
    expect(a.fingerprint).not.toBe(b.fingerprint);
  });

  it('should distinguish Infinity from null', () => {
    const a = tamperEvident({ v: Infinity });
    const b = tamperEvident({ v: null });
    expect(a.fingerprint).not.toBe(b.fingerprint);
  });

  it('should distinguish -Infinity from Infinity', () => {
    const a = tamperEvident({ v: Infinity });
    const b = tamperEvident({ v: -Infinity });
    expect(a.fingerprint).not.toBe(b.fingerprint);
  });

  it('should distinguish undefined from string "undefined"', () => {
    const a = tamperEvident({ v: undefined });
    const b = tamperEvident({ v: 'undefined' });
    expect(a.fingerprint).not.toBe(b.fingerprint);
  });

  it('should not collide symbol keys with crafted string keys', () => {
    const sym = Symbol('id');
    const a = tamperEvident({ [sym]: 1 });
    // Test both old-style prefix and new-style crafted keys
    const b = tamperEvident({ '\0S:Symbol(id)': 1 });
    const c = tamperEvident({ '\0\0sym:Symbol(id)': 1 });
    const d = tamperEvident({ 'Symbol(id)': 1 });
    expect(a.fingerprint).not.toBe(b.fingerprint);
    expect(a.fingerprint).not.toBe(c.fingerprint);
    expect(a.fingerprint).not.toBe(d.fingerprint);
  });
});
