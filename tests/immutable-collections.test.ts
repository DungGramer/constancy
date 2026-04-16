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
