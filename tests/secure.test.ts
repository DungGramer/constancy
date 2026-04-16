import { describe, it, expect } from 'vitest';
import { secureSnapshot as secure } from '../src/index';

describe('secure - getter-only + non-configurable', () => {
  it('properties readable via getter', () => {
    const obj = secure({ isVip: false, name: 'Alice' });
    expect(obj.isVip).toBe(false);
    expect(obj.name).toBe('Alice');
  });

  it('assignment throws in strict mode', () => {
    const obj = secure({ isVip: false });
    expect(() => { (obj as any).isVip = true; }).toThrow(TypeError);
    expect(obj.isVip).toBe(false);
  });

  it('Object.defineProperty throws (non-configurable)', () => {
    const obj = secure({ isVip: false });
    expect(() => {
      Object.defineProperty(obj, 'isVip', { value: true });
    }).toThrow(TypeError);
  });

  it('descriptor shows get but no value', () => {
    const obj = secure({ isVip: false });
    const desc = Object.getOwnPropertyDescriptor(obj, 'isVip');
    expect(desc).toBeDefined();
    expect(desc!.get).toBeInstanceOf(Function);
    expect('value' in desc!).toBe(false);
    expect(desc!.configurable).toBe(false);
  });

  it('nested objects also secured', () => {
    const obj = secure({ user: { isVip: false } });
    expect(obj.user.isVip).toBe(false);
    expect(() => { (obj.user as any).isVip = true; }).toThrow(TypeError);
    const desc = Object.getOwnPropertyDescriptor(obj.user, 'isVip');
    expect(desc!.configurable).toBe(false);
    expect('value' in desc!).toBe(false);
  });

  it('Object.keys works', () => {
    const obj = secure({ a: 1, b: 2 });
    expect(Object.keys(obj).sort((a, b) => a.localeCompare(b))).toEqual(['a', 'b']);
  });

  it('JSON.stringify works', () => {
    const obj = secure({ a: 1, b: 'hello' });
    expect(JSON.stringify(obj)).toBe('{"a":1,"b":"hello"}');
  });

  it('prototype pollution does not affect (null prototype)', () => {
    const original = (Object.prototype as any).hacked;
    try {
      (Object.prototype as any).hacked = true;
      const obj = secure({ isVip: false });
      // null prototype means no inherited properties
      expect((obj as any).hacked).toBeUndefined();
    } finally {
      if (original === undefined) {
        delete (Object.prototype as any).hacked;
      } else {
        (Object.prototype as any).hacked = original;
      }
    }
  });

  it('Reflect.set returns false and value unchanged', () => {
    const obj = secure({ isVip: false });
    const result = Reflect.set(obj, 'isVip', true);
    expect(result).toBe(false);
    expect(obj.isVip).toBe(false);
  });
});
