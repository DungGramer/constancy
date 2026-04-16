import { describe, it, expect } from 'vitest';
import { immutableView as immutable, isImmutableView as isImmutable, assertImmutableView } from '../src/index';

describe('immutable - mutation blocking', () => {
  it('throws on property set', () => {
    const obj = immutable({ a: 1 });
    expect(() => { (obj as any).a = 2; }).toThrow(TypeError);
  });

  it('throws on property delete', () => {
    const obj = immutable({ a: 1 });
    expect(() => { delete (obj as any).a; }).toThrow(TypeError);
  });

  it('throws on defineProperty', () => {
    const obj = immutable({ a: 1 });
    expect(() => {
      Object.defineProperty(obj, 'b', { value: 2 });
    }).toThrow(TypeError);
  });

  it('throws on setPrototypeOf', () => {
    const obj = immutable({ a: 1 });
    expect(() => {
      Object.setPrototypeOf(obj, {});
    }).toThrow(TypeError);
  });

  it('throws on nested property set', () => {
    const obj = immutable({ nested: { val: 1 } });
    expect(() => { (obj as any).nested.val = 2; }).toThrow(TypeError);
  });

  it('throws on deeply nested property delete', () => {
    const obj = immutable({ a: { b: { c: 1 } } });
    expect(() => { delete (obj as any).a.b.c; }).toThrow(TypeError);
  });
});

describe('immutable - collection mutation blocking', () => {
  it('blocks Map.set()', () => {
    const obj = immutable(new Map([['k', 'v']]));
    expect(() => (obj as any).set('k', 'x')).toThrow(TypeError);
  });

  it('blocks Map.delete()', () => {
    const obj = immutable(new Map([['k', 'v']]));
    expect(() => (obj as any).delete('k')).toThrow(TypeError);
  });

  it('blocks Map.clear()', () => {
    const obj = immutable(new Map([['k', 'v']]));
    expect(() => (obj as any).clear()).toThrow(TypeError);
  });

  it('allows Map.get()', () => {
    const obj = immutable(new Map([['k', 'v']]));
    expect(obj.get('k')).toBe('v');
  });

  it('blocks Set.add()', () => {
    const obj = immutable(new Set([1, 2]));
    expect(() => (obj as any).add(3)).toThrow(TypeError);
  });

  it('blocks Set.delete()', () => {
    const obj = immutable(new Set([1, 2]));
    expect(() => (obj as any).delete(1)).toThrow(TypeError);
  });

  it('allows Set.has()', () => {
    const obj = immutable(new Set([1, 2]));
    expect(obj.has(1)).toBe(true);
  });
});

describe('immutable - Date mutation blocking', () => {
  it('blocks setFullYear/setMonth/setDate/setHours/setMinutes/setSeconds/setTime', () => {
    const date = immutable(new Date('2026-01-15T10:30:00Z'));
    expect(() => (date as any).setFullYear(2099)).toThrow(TypeError);
    expect(() => (date as any).setMonth(11)).toThrow(TypeError);
    expect(() => (date as any).setDate(31)).toThrow(TypeError);
    expect(() => (date as any).setHours(23)).toThrow(TypeError);
    expect(() => (date as any).setMinutes(59)).toThrow(TypeError);
    expect(() => (date as any).setSeconds(59)).toThrow(TypeError);
    expect(() => (date as any).setTime(0)).toThrow(TypeError);
    expect(() => (date as any).setMilliseconds(999)).toThrow(TypeError);
  });

  it('blocks UTC setters', () => {
    const date = immutable(new Date('2026-01-15T10:30:00Z'));
    expect(() => (date as any).setUTCFullYear(2099)).toThrow(TypeError);
    expect(() => (date as any).setUTCMonth(11)).toThrow(TypeError);
    expect(() => (date as any).setUTCDate(31)).toThrow(TypeError);
    expect(() => (date as any).setUTCHours(23)).toThrow(TypeError);
    expect(() => (date as any).setUTCMinutes(59)).toThrow(TypeError);
    expect(() => (date as any).setUTCSeconds(59)).toThrow(TypeError);
    expect(() => (date as any).setUTCMilliseconds(999)).toThrow(TypeError);
  });

  it('allows read methods', () => {
    const date = immutable(new Date('2026-01-15T10:30:00Z'));
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(0);
    expect(date.toISOString()).toBe('2026-01-15T10:30:00.000Z');
  });

  it('blocks Date mutation on nested objects', () => {
    const obj = immutable({ expiry: new Date('2026-12-31') });
    expect(() => (obj.expiry as any).setFullYear(2099)).toThrow(TypeError);
    expect(obj.expiry.getFullYear()).toBe(2026);
  });
});

describe('immutable - WeakMap/WeakSet mutation blocking', () => {
  it('blocks WeakMap.set()', () => {
    const key = {};
    const wm = immutable(new WeakMap([[key, 'val']]));
    expect(() => (wm as any).set({}, 'hack')).toThrow(TypeError);
  });

  it('blocks WeakMap.delete()', () => {
    const key = {};
    const wm = immutable(new WeakMap([[key, 'val']]));
    expect(() => (wm as any).delete(key)).toThrow(TypeError);
  });

  it('allows WeakMap.get() and has()', () => {
    const key = {};
    const wm = immutable(new WeakMap([[key, 'val']]));
    expect(wm.get(key)).toBe('val');
    expect(wm.has(key)).toBe(true);
  });

  it('blocks WeakSet.add()', () => {
    const ws = immutable(new WeakSet([{}]));
    expect(() => (ws as any).add({})).toThrow(TypeError);
  });

  it('blocks WeakSet.delete()', () => {
    const key = {};
    const ws = immutable(new WeakSet([key]));
    expect(() => (ws as any).delete(key)).toThrow(TypeError);
  });

  it('allows WeakSet.has()', () => {
    const key = {};
    const ws = immutable(new WeakSet([key]));
    expect(ws.has(key)).toBe(true);
  });
});

describe('immutable - array mutation blocking', () => {
  it('blocks push/pop/shift/unshift/splice/sort/reverse', () => {
    const arr = immutable([3, 1, 2]);
    expect(() => (arr as any).push(4)).toThrow(TypeError);
    expect(() => (arr as any).pop()).toThrow(TypeError);
    expect(() => (arr as any).shift()).toThrow(TypeError);
    expect(() => (arr as any).unshift(0)).toThrow(TypeError);
    expect(() => (arr as any).splice(0, 1)).toThrow(TypeError);
    expect(() => (arr as any).sort()).toThrow(TypeError);
    expect(() => (arr as any).reverse()).toThrow(TypeError);
  });

  it('allows index read and length', () => {
    const arr = immutable([1, 2, 3]);
    expect(arr[0]).toBe(1);
    expect(arr.length).toBe(3);
  });

  it('allows for...of iteration', () => {
    const arr = immutable([1, 2, 3]);
    const result: number[] = [];
    for (const val of arr) result.push(val);
    expect(result).toEqual([1, 2, 3]);
  });
});

describe('immutable - edge cases', () => {
  it('handles circular references', () => {
    const obj: Record<string, unknown> = { a: 1 };
    obj['self'] = obj;
    expect(() => immutable(obj)).not.toThrow();
    const frozen = immutable(obj);
    expect(() => { (frozen as any).a = 2; }).toThrow(TypeError);
  });

  it('JSON.stringify works', () => {
    const obj = immutable({ a: 1, b: [2, 3] });
    expect(JSON.stringify(obj)).toBe('{"a":1,"b":[2,3]}');
  });

  it('Object.keys works', () => {
    const obj = immutable({ a: 1, b: 2 });
    expect(Object.keys(obj)).toEqual(['a', 'b']);
  });

  it('returns primitives unchanged', () => {
    expect(immutable(42)).toBe(42);
    expect(immutable('str')).toBe('str');
    expect(immutable(null)).toBe(null);
    expect(immutable(undefined)).toBe(undefined);
    expect(immutable(true)).toBe(true);
  });
});

describe('isImmutable', () => {
  it('returns true for immutable proxy', () => {
    expect(isImmutable(immutable({ a: 1 }))).toBe(true);
  });

  it('returns false for plain objects', () => {
    expect(isImmutable({ a: 1 })).toBe(false);
  });

  it('returns false for frozen objects', () => {
    expect(isImmutable(Object.freeze({ a: 1 }))).toBe(false);
  });

  it('returns false for primitives', () => {
    expect(isImmutable(42)).toBe(false);
    expect(isImmutable(null)).toBe(false);
    expect(isImmutable(undefined)).toBe(false);
  });
});

describe('getOwnPropertyDescriptor bypass protection', () => {
  it('should wrap descriptor values in proxy', () => {
    const obj = { nested: { count: 0 } };
    const view = immutable(obj);
    const desc = Object.getOwnPropertyDescriptor(view, 'nested')!;
    expect(() => { (desc.value as any).count = 999; }).toThrow(TypeError);
  });

  it('should not wrap frozen descriptor values (Proxy invariant)', () => {
    const obj = Object.freeze({ nested: Object.freeze({ count: 0 }) });
    const view = immutable(obj);
    const desc = Object.getOwnPropertyDescriptor(view, 'nested')!;
    // Must return exact value for non-configurable+non-writable (invariant)
    expect(desc.value).toBe(obj.nested);
  });
});

describe('Map/Set value wrapping in immutableView', () => {
  it('should wrap Map.get() return values', () => {
    const m = new Map([['key', { secret: true }]]);
    const view = immutable(m);
    const val = view.get('key')!;
    expect(() => { (val as any).secret = false; }).toThrow(TypeError);
  });

  it('should wrap Map iterator values', () => {
    const m = new Map([['k', { x: 1 }]]);
    const view = immutable(m);
    for (const [, v] of view) {
      expect(() => { (v as any).x = 2; }).toThrow(TypeError);
    }
  });

  it('should wrap Map.values()', () => {
    const m = new Map([['k', { x: 1 }]]);
    const view = immutable(m);
    for (const v of view.values()) {
      expect(() => { (v as any).x = 2; }).toThrow(TypeError);
    }
  });

  it('should wrap Map.forEach() values', () => {
    const m = new Map([['k', { x: 1 }]]);
    const view = immutable(m);
    view.forEach((v) => {
      expect(() => { (v as any).x = 2; }).toThrow(TypeError);
    });
  });

  it('should wrap Set iterator values', () => {
    const s = new Set([{ x: 1 }]);
    const view = immutable(s);
    for (const v of view) {
      expect(() => { (v as any).x = 2; }).toThrow(TypeError);
    }
  });

  it('should wrap Set.forEach() values', () => {
    const s = new Set([{ x: 1 }]);
    const view = immutable(s);
    view.forEach((v) => {
      expect(() => { (v as any).x = 2; }).toThrow(TypeError);
    });
  });

  it('should still block Map mutation methods', () => {
    const m = new Map([['k', 'v']]);
    const view = immutable(m);
    expect(() => (view as any).set('k', 'new')).toThrow(TypeError);
    expect(() => (view as any).delete('k')).toThrow(TypeError);
    expect(() => (view as any).clear()).toThrow(TypeError);
  });
});

describe('getPrototypeOf bypass protection', () => {
  it('should wrap prototype in proxy', () => {
    const proto = { admin: false };
    const obj = Object.create(proto);
    obj.name = 'Alice';
    const view = immutable(obj);
    const viewProto = Object.getPrototypeOf(view);
    expect(() => { viewProto.admin = true; }).toThrow(TypeError);
  });
});

describe('immutable - proxy trap coverage', () => {
  it('throws on Object.preventExtensions', () => {
    const view = immutable({ a: 1 });
    expect(() => Object.preventExtensions(view)).toThrow(TypeError);
  });

  it('"in" operator works (has trap)', () => {
    const view = immutable({ a: 1, b: undefined });
    expect('a' in view).toBe(true);
    expect('b' in view).toBe(true);
    expect('c' in view).toBe(false);
  });

  it('Object.isExtensible works (isExtensible trap)', () => {
    const view = immutable({ a: 1 });
    expect(Object.isExtensible(view)).toBe(true);
  });

  it('Map.has works through proxy (wrapMapMethod returns null)', () => {
    const m = new Map([['k', 'v']]);
    const view = immutable(m);
    expect(view.has('k')).toBe(true);
    expect(view.has('missing')).toBe(false);
  });

  it('Map.size works through proxy', () => {
    const m = new Map([['a', 1], ['b', 2]]);
    const view = immutable(m);
    expect(view.size).toBe(2);
  });

  it('Set.entries() wraps values in proxy', () => {
    const s = new Set([{ x: 1 }, { x: 2 }]);
    const view = immutable(s);
    for (const [v1, v2] of view.entries()) {
      expect(v1).toBe(v2);
      expect(() => { (v1 as any).x = 99; }).toThrow(TypeError);
    }
  });
});

describe('assertImmutableView', () => {
  it('should not throw for immutable view proxy', () => {
    const view = immutable({ a: 1 });
    expect(() => assertImmutableView(view)).not.toThrow();
  });

  it('should throw TypeError for plain object', () => {
    expect(() => assertImmutableView({ a: 1 })).toThrow(TypeError);
    expect(() => assertImmutableView({ a: 1 })).toThrow('Not an immutable view');
  });

  it('should throw TypeError for frozen object', () => {
    expect(() => assertImmutableView(Object.freeze({ a: 1 }))).toThrow(TypeError);
  });

  it('should throw TypeError for primitives', () => {
    expect(() => assertImmutableView(42)).toThrow(TypeError);
    expect(() => assertImmutableView('str')).toThrow(TypeError);
    expect(() => assertImmutableView(null)).toThrow(TypeError);
  });

  it('should include label in error message', () => {
    expect(() => assertImmutableView({}, 'config')).toThrow('config: Not an immutable view');
  });
});
