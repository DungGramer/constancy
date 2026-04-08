import { describe, it, expect } from 'vitest';
import { deepFreeze } from '../src/index';

describe('deepFreeze - nested objects', () => {
  it('should freeze nested object properties', () => {
    // In strict mode (ESM), deep mutation throws TypeError at any nesting depth
    const obj = { a: { b: { c: 1 } } };
    deepFreeze(obj);
    expect(() => { obj.a.b.c = 2; }).toThrow(TypeError);
    expect(obj.a.b.c).toBe(1);
  });

  it('should freeze nested arrays', () => {
    // Nested array elements should also be frozen
    const obj = { arr: [1, [2, 3]] };
    deepFreeze(obj);
    expect(() => (obj.arr[1] as number[]).push(4)).toThrow();
  });

  it('should freeze mixed nested structures', () => {
    // Arrays containing objects must be deeply frozen; mutations throw in strict mode
    const obj = { a: [{ b: 1 }] };
    deepFreeze(obj);
    expect(() => { obj.a[0].b = 2; }).toThrow(TypeError);
    expect(obj.a[0].b).toBe(1);
  });
});

describe('deepFreeze - circular references', () => {
  it('should handle self-referencing object', () => {
    // WeakSet-based cycle detection must prevent infinite recursion
    const obj: Record<string, unknown> = { a: 1 };
    obj['self'] = obj;
    expect(() => deepFreeze(obj)).not.toThrow();
    expect(Object.isFrozen(obj)).toBe(true);
  });

  it('should handle mutual circular references', () => {
    // Two objects referencing each other must both end up frozen
    const a: Record<string, unknown> = { name: 'a' };
    const b: Record<string, unknown> = { name: 'b' };
    a['ref'] = b;
    b['ref'] = a;
    expect(() => deepFreeze(a)).not.toThrow();
    expect(Object.isFrozen(a)).toBe(true);
    expect(Object.isFrozen(b)).toBe(true);
  });
});

describe('deepFreeze - symbol keys', () => {
  it('should freeze symbol-keyed properties', () => {
    // Reflect.ownKeys covers Symbol properties; nested values must be frozen
    const sym = Symbol('key');
    const obj = { [sym]: { nested: 1 } };
    deepFreeze(obj);
    expect(Object.isFrozen(obj[sym])).toBe(true);
  });
});

describe('deepFreeze - edge cases', () => {
  it('should handle TypedArray without throwing', () => {
    // Object.freeze on non-empty TypedArrays throws in Node — deepFreeze skips
    // freezing the TypedArray itself but still freezes the containing object.
    const obj = { buf: new Uint8Array([1, 2, 3]) };
    expect(() => deepFreeze(obj)).not.toThrow();
    // The container object is frozen
    expect(Object.isFrozen(obj)).toBe(true);
    // The TypedArray is intentionally NOT frozen (skipped to avoid TypeError)
    expect(Object.isFrozen(obj.buf)).toBe(false);
  });

  it('should not invoke getters during freeze', () => {
    // Accessor descriptors (get/set) must be skipped to avoid side effects
    let called = false;
    const obj = {
      get x() {
        called = true;
        return {};
      },
    };
    deepFreeze(obj);
    expect(called).toBe(false);
  });

  it('should skip already-frozen subtrees efficiently', () => {
    // Already-frozen inner objects must not cause errors or re-processing
    const inner = Object.freeze({ a: 1 });
    const outer = { inner };
    deepFreeze(outer);
    expect(Object.isFrozen(outer)).toBe(true);
  });

  it('should return primitives unchanged', () => {
    // Non-freezable values pass through without error
    expect(deepFreeze(42)).toBe(42);
    expect(deepFreeze('str')).toBe('str');
    expect(deepFreeze(null)).toBe(null);
    expect(deepFreeze(undefined)).toBe(undefined);
  });

  it('should freeze function properties', () => {
    // Functions are freezable; their own properties must also be deep-frozen
    const fn = Object.assign(() => {}, { meta: { info: 1 } });
    deepFreeze(fn);
    expect(Object.isFrozen(fn)).toBe(true);
    expect(Object.isFrozen(fn.meta)).toBe(true);
  });
});
