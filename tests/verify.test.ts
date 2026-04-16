import { describe, it, expect } from 'vitest';
import { deepFreeze, snapshot, isDeepFrozen, assertDeepFrozen } from '../src/index';

describe('isDeepFrozen', () => {
  it('returns true for deeply frozen objects', () => {
    const obj = deepFreeze({ a: { b: 1 } });
    expect(isDeepFrozen(obj)).toBe(true);
  });

  it('returns false for shallow-only frozen objects', () => {
    const obj = Object.freeze({ nested: { val: 1 } });
    expect(isDeepFrozen(obj)).toBe(false);
  });

  it('returns false for unfrozen objects', () => {
    expect(isDeepFrozen({ a: 1 })).toBe(false);
  });

  it('returns true for primitives', () => {
    expect(isDeepFrozen(null)).toBe(true);
    expect(isDeepFrozen(undefined)).toBe(true);
    expect(isDeepFrozen(42)).toBe(true);
    expect(isDeepFrozen('str')).toBe(true);
    expect(isDeepFrozen(true)).toBe(true);
  });

  it('handles circular references', () => {
    const obj: Record<string, unknown> = { a: 1 };
    obj['self'] = obj;
    deepFreeze(obj);
    expect(isDeepFrozen(obj)).toBe(true);
  });

  it('returns false for unfrozen nested in circular graph', () => {
    const a: Record<string, unknown> = { name: 'a' };
    const b: Record<string, unknown> = { name: 'b' };
    a['ref'] = b;
    b['ref'] = a;
    Object.freeze(a); // Only freeze a, not b
    expect(isDeepFrozen(a)).toBe(false);
  });
});

describe('assertDeepFrozen', () => {
  it('passes for deepFreeze\'d objects', () => {
    expect(() => assertDeepFrozen(deepFreeze({ a: 1 }))).not.toThrow();
  });

  it('passes for snapshot() objects', () => {
    expect(() => assertDeepFrozen(snapshot({ a: 1 }))).not.toThrow();
  });

  it('throws TypeError for plain objects', () => {
    expect(() => assertDeepFrozen({ a: 1 })).toThrow(TypeError);
    expect(() => assertDeepFrozen({ a: 1 })).toThrow('Object is not deep frozen');
  });

  it('throws for shallow-frozen with mutable nested', () => {
    const obj = Object.freeze({ nested: { val: 1 } });
    expect(() => assertDeepFrozen(obj)).toThrow(TypeError);
  });

  it('includes label in error message', () => {
    expect(() => assertDeepFrozen({ a: 1 }, 'config')).toThrow('config: Object is not deep frozen');
  });

  it('passes for primitives', () => {
    expect(() => assertDeepFrozen(42)).not.toThrow();
    expect(() => assertDeepFrozen(null)).not.toThrow();
    expect(() => assertDeepFrozen('str')).not.toThrow();
  });
});
