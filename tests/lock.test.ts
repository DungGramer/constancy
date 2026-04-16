import { describe, it, expect } from 'vitest';
import { snapshot, isDeepFrozen } from '../src/index';
const lock = snapshot; // alias for test readability

describe('lock - true snapshot immutability', () => {
  it('returns frozen deep clone', () => {
    const locked = lock({ a: 1, nested: { b: 2 } });
    expect(locked.a).toBe(1);
    expect(locked.nested.b).toBe(2);
    expect(Object.isFrozen(locked)).toBe(true);
    expect(Object.isFrozen(locked.nested)).toBe(true);
  });

  it('original mutation does not affect locked copy', () => {
    const raw = { isVip: false, user: { name: 'Alice' } };
    const locked = lock(raw);
    raw.isVip = true;
    raw.user.name = 'Hacker';
    expect(locked.isVip).toBe(false);
    expect(locked.user.name).toBe('Alice');
  });

  it('mutation on locked copy throws TypeError', () => {
    const locked = lock({ x: 1 });
    expect(() => { (locked as any).x = 2; }).toThrow(TypeError);
  });

  it('nested mutation throws TypeError', () => {
    const locked = lock({ a: { b: { c: 1 } } });
    expect(() => { (locked as any).a.b.c = 2; }).toThrow(TypeError);
  });

  it('locked !== original (different reference)', () => {
    const raw = { x: 1 };
    const locked = lock(raw);
    expect(locked).not.toBe(raw);
  });

  it('isDeepFrozen returns true for locked objects', () => {
    const locked = lock({ a: { b: 1 }, arr: [1, 2] });
    expect(isDeepFrozen(locked)).toBe(true);
  });

  it('primitives returned unchanged', () => {
    expect(lock(42)).toBe(42);
    expect(lock('str')).toBe('str');
    expect(lock(null)).toBe(null);
    expect(lock(undefined)).toBe(undefined);
    expect(lock(true)).toBe(true);
  });

  it('arrays are frozen', () => {
    const locked = lock([1, [2, 3]]);
    expect(() => (locked as any).push(4)).toThrow();
    expect(() => (locked[1] as any).push(4)).toThrow();
  });

  it('handles circular references without infinite loop', () => {
    const obj: Record<string, unknown> = { a: 1 };
    obj['self'] = obj;
    expect(() => lock(obj)).not.toThrow();
  });
});
