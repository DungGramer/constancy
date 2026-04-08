import { describe, it, expect } from 'vitest';
import { constancy } from '../src/index';

describe('constancy - shallow freeze', () => {
  it('should have Object.freeze.length of 1', () => {
    // Object.freeze accepts exactly one argument
    expect(Object.freeze.length).toBe(1);
  });

  it('should freeze object properties', () => {
    // In strict mode (ESM), assigning to a frozen property throws TypeError
    const obj = { a: 1 };
    const frozen = constancy(obj);
    expect(() => { frozen.a = 2; }).toThrow(TypeError);
    expect(frozen.a).toBe(1);
  });

  it('should freeze array mutations', () => {
    // Frozen arrays throw TypeError on push in strict mode
    const arr = [1];
    const frozen = constancy(arr);
    expect(() => frozen.push(2)).toThrow();
    expect(frozen.length).toBe(1);
  });
});

describe('constancy - type preservation', () => {
  // Primitives and non-plain-object values must be returned unchanged

  it('null', () => expect(constancy(null)).toBe(null));
  it('undefined', () => expect(constancy(undefined)).toBe(undefined));
  it('string', () => expect(constancy('string')).toBe('string'));
  it('number', () => expect(constancy(1)).toBe(1));
  it('boolean', () => expect(constancy(true)).toBe(true));
  it('object', () => expect(constancy({})).toEqual({}));
  it('array', () => expect(constancy([])).toEqual([]));
  it('function', () => expect(constancy(() => {})).toBeInstanceOf(Function));
  it('regexp', () => expect(constancy(/regexp/)).toBeInstanceOf(RegExp));
  it('date', () => expect(constancy(new Date())).toBeInstanceOf(Date));
  it('error', () => expect(constancy(new Error())).toBeInstanceOf(Error));
  it('map', () => expect(constancy(new Map())).toBeInstanceOf(Map));
  it('set', () => expect(constancy(new Set())).toBeInstanceOf(Set));
  it('weakmap', () => expect(constancy(new WeakMap())).toBeInstanceOf(WeakMap));
  it('weakset', () => expect(constancy(new WeakSet())).toBeInstanceOf(WeakSet));
  it('promise', () => expect(constancy(Promise.resolve())).toBeInstanceOf(Promise));
});
