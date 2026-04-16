import { describe, it, expect } from 'vitest';
import { tamperEvident as tamperProof } from '../src/index';

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
