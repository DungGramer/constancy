import { describe, it, expect } from 'vitest';
import { vault } from '../src/index'; // name unchanged

describe('vault - closure isolation', () => {
  it('get() returns correct values', () => {
    const v = vault({ a: 1, b: 'hello' });
    expect(v.get().a).toBe(1);
    expect(v.get().b).toBe('hello');
  });

  it('get() returns frozen objects', () => {
    const v = vault({ x: 1 });
    expect(Object.isFrozen(v.get())).toBe(true);
  });

  it('mutating copy does not affect vault', () => {
    const v = vault({ isVip: false });
    const copy = v.get();
    expect(() => { (copy as any).isVip = true; }).toThrow(TypeError);
    expect(v.get().isVip).toBe(false);
  });

  it('get() returns different references (copy isolation)', () => {
    const v = vault({ x: 1 });
    expect(v.get()).not.toBe(v.get());
  });

  it('works with nested objects', () => {
    const v = vault({ user: { name: 'Alice', isVip: false } });
    const copy = v.get();
    expect(copy.user.name).toBe('Alice');
    expect(copy.user.isVip).toBe(false);
    expect(Object.isFrozen(copy.user)).toBe(true);
  });

  it('works with arrays', () => {
    const v = vault({ tags: ['a', 'b'] });
    const copy = v.get();
    expect(copy.tags).toEqual(['a', 'b']);
    expect(() => (copy.tags as any).push('c')).toThrow();
  });

  it('works with primitives', () => {
    expect(vault(42).get()).toBe(42);
    expect(vault('str').get()).toBe('str');
    expect(vault(null).get()).toBe(null);
    expect(vault(true).get()).toBe(true);
  });

  it('vault interface itself is frozen', () => {
    const v = vault({ x: 1 });
    expect(Object.isFrozen(v)).toBe(true);
    expect(() => { (v as any).hack = true; }).toThrow(TypeError);
  });

  it('original object mutation does not affect vault', () => {
    const original = { isVip: false };
    const v = vault(original);
    original.isVip = true; // mutate original
    expect(v.get().isVip).toBe(false); // vault unaffected
  });
});

describe('vault error handling', () => {
  it('should throw TypeError for objects containing functions', () => {
    expect(() => vault({ fn: () => {} })).toThrow(TypeError);
  });
});
