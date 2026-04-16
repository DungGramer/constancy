import { describe, it, expect } from 'vitest';
import { immutableMapView as immutableMap, immutableSetView as immutableSet } from '../src/index';

describe('immutableMap', () => {
  it('get/has/size work', () => {
    const m = immutableMap(new Map([['a', 1], ['b', 2]]));
    expect(m.get('a')).toBe(1);
    expect(m.has('a')).toBe(true);
    expect(m.has('z')).toBe(false);
    expect(m.size).toBe(2);
  });

  it('keys/values/entries return iterators', () => {
    const m = immutableMap(new Map([['a', 1]]));
    expect([...m.keys()]).toEqual(['a']);
    expect([...m.values()]).toEqual([1]);
    expect([...m.entries()]).toEqual([['a', 1]]);
  });

  it('forEach works', () => {
    const m = immutableMap(new Map([['a', 1], ['b', 2]]));
    const keys: string[] = [];
    m.forEach((_v, k) => keys.push(k));
    expect(keys).toEqual(['a', 'b']);
  });

  it('for...of iteration works', () => {
    const m = immutableMap(new Map([['a', 1]]));
    const entries: [string, number][] = [];
    for (const entry of m) entries.push(entry);
    expect(entries).toEqual([['a', 1]]);
  });

  it('Symbol.toStringTag is ImmutableMap', () => {
    const m = immutableMap(new Map());
    expect(Object.prototype.toString.call(m)).toBe('[object ImmutableMap]');
  });

  it('has no set/delete/clear methods', () => {
    const m = immutableMap(new Map([['a', 1]]));
    expect((m as any).set).toBeUndefined();
    expect((m as any).delete).toBeUndefined();
    expect((m as any).clear).toBeUndefined();
  });

  it('source mutation after wrapping does not affect wrapper', () => {
    const source = new Map([['k', 'original']]);
    const m = immutableMap(source);
    source.set('k', 'HACKED');
    expect(m.get('k')).toBe('original');
  });
});

describe('immutableMap nested immutability', () => {
  it('get() returns frozen nested objects — mutation throws TypeError', () => {
    const data = new Map([['user', { isVip: false, role: 'viewer' }]]);
    const view = immutableMap(data);
    const user = view.get('user')!;
    expect(() => { (user as any).isVip = true; }).toThrow(TypeError);
  });

  it('values() yields frozen objects', () => {
    const data = new Map([['k', { x: 1 }]]);
    const view = immutableMap(data);
    for (const val of view.values()) {
      expect(() => { (val as any).x = 2; }).toThrow(TypeError);
    }
  });

  it('entries() yields frozen objects', () => {
    const data = new Map([['k', { x: 1 }]]);
    const view = immutableMap(data);
    for (const [, val] of view.entries()) {
      expect(() => { (val as any).x = 2; }).toThrow(TypeError);
    }
  });

  it('forEach() provides frozen objects', () => {
    const data = new Map([['k', { x: 1 }]]);
    const view = immutableMap(data);
    view.forEach((val) => {
      expect(() => { (val as any).x = 2; }).toThrow(TypeError);
    });
  });

  it('source map object values remain mutable after wrapping', () => {
    const obj = { x: 1 };
    const data = new Map([['k', obj]]);
    immutableMap(data); // constructor clones — obj is not frozen
    obj.x = 42;
    expect(obj.x).toBe(42);
  });

  it('primitive values still work — no freeze attempt on primitives', () => {
    const data = new Map([['n', 42], ['s', 'hello'], ['b', true]] as [string, unknown][]);
    const view = immutableMap(data as Map<string, unknown>);
    expect(view.get('n')).toBe(42);
    expect(view.get('s')).toBe('hello');
    expect(view.get('b')).toBe(true);
    expect([...view.values()]).toEqual([42, 'hello', true]);
  });

  it('nested objects from for...of are frozen', () => {
    const data = new Map([['k', { x: 1 }]]);
    const view = immutableMap(data);
    for (const [, val] of view) {
      expect(() => { (val as any).x = 99; }).toThrow(TypeError);
    }
  });
});

describe('immutableSet', () => {
  it('has/size work', () => {
    const s = immutableSet(new Set([1, 2, 3]));
    expect(s.has(1)).toBe(true);
    expect(s.has(99)).toBe(false);
    expect(s.size).toBe(3);
  });

  it('keys/values/entries return iterators', () => {
    const s = immutableSet(new Set([1, 2]));
    expect([...s.keys()]).toEqual([1, 2]);
    expect([...s.values()]).toEqual([1, 2]);
    expect([...s.entries()]).toEqual([[1, 1], [2, 2]]);
  });

  it('forEach works', () => {
    const s = immutableSet(new Set([1, 2]));
    const vals: number[] = [];
    s.forEach((v) => vals.push(v));
    expect(vals).toEqual([1, 2]);
  });

  it('for...of iteration works', () => {
    const s = immutableSet(new Set([1, 2]));
    const vals: number[] = [];
    for (const v of s) vals.push(v);
    expect(vals).toEqual([1, 2]);
  });

  it('Symbol.toStringTag is ImmutableSet', () => {
    const s = immutableSet(new Set());
    expect(Object.prototype.toString.call(s)).toBe('[object ImmutableSet]');
  });

  it('has no add/delete/clear methods', () => {
    const s = immutableSet(new Set([1]));
    expect((s as any).add).toBeUndefined();
    expect((s as any).delete).toBeUndefined();
    expect((s as any).clear).toBeUndefined();
  });

  it('source mutation after wrapping does not affect wrapper', () => {
    const source = new Set([1, 2, 3]);
    const s = immutableSet(source);
    source.add(99);
    source.delete(1);
    expect(s.has(1)).toBe(true);
    expect(s.has(99)).toBe(false);
    expect(s.size).toBe(3);
  });
});

describe('immutableSet nested immutability', () => {
  it('values() yields frozen objects', () => {
    const obj = { x: 1 };
    const data = new Set([obj]);
    const view = immutableSet(data);
    for (const val of view.values()) {
      expect(() => { (val as any).x = 2; }).toThrow(TypeError);
    }
  });

  it('keys() yields frozen objects', () => {
    const data = new Set([{ x: 1 }]);
    const view = immutableSet(data);
    for (const val of view.keys()) {
      expect(() => { (val as any).x = 2; }).toThrow(TypeError);
    }
  });

  it('entries() yields frozen objects', () => {
    const data = new Set([{ x: 1 }]);
    const view = immutableSet(data);
    for (const [val] of view.entries()) {
      expect(() => { (val as any).x = 2; }).toThrow(TypeError);
    }
  });

  it('forEach() provides frozen objects', () => {
    const data = new Set([{ x: 1 }]);
    const view = immutableSet(data);
    view.forEach((val) => {
      expect(() => { (val as any).x = 2; }).toThrow(TypeError);
    });
  });

  it('source set object values remain mutable after wrapping', () => {
    const obj = { x: 1 };
    const data = new Set([obj]);
    immutableSet(data); // constructor clones — obj is not frozen
    obj.x = 42;
    expect(obj.x).toBe(42);
  });

  it('primitive values still work — no freeze attempt on primitives', () => {
    const data = new Set([1, 'hello', true]);
    const view = immutableSet(data);
    expect([...view.values()]).toEqual([1, 'hello', true]);
  });
});
