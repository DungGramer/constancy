import { describe, it, expect } from 'vitest';
import { freezeShallow as constancy, deepFreeze } from '../src/index';

describe('cached builtins - tamper resistance', () => {
  it('constancy() works after Object.freeze is overridden', () => {
    const originalFreeze = Object.freeze;
    try {
      // Simulate attacker overriding Object.freeze after import
      (Object as any).freeze = (x: any) => x;

      const obj = constancy({ a: 1 });
      // Should still be frozen because constancy uses cached _freeze
      expect(() => { (obj as any).a = 2; }).toThrow(TypeError);
    } finally {
      Object.freeze = originalFreeze;
    }
  });

  it('deepFreeze() works after Object.freeze is overridden', () => {
    const originalFreeze = Object.freeze;
    try {
      (Object as any).freeze = (x: any) => x;

      const obj = { nested: { val: 1 } };
      deepFreeze(obj);
      // Verify nested is frozen via assignment test
      expect(() => { (obj as any).nested.val = 2; }).toThrow(TypeError);
    } finally {
      Object.freeze = originalFreeze;
    }
  });

  it('deepFreeze() works after Reflect.ownKeys is overridden', () => {
    const originalOwnKeys = Reflect.ownKeys;
    try {
      // Attacker tries to hide keys from deepFreeze
      (Reflect as any).ownKeys = () => [];

      const obj = { nested: { val: 1 } };
      deepFreeze(obj);
      // Should still freeze nested because cached _ownKeys is used
      expect(() => { (obj as any).nested.val = 2; }).toThrow(TypeError);
    } finally {
      Reflect.ownKeys = originalOwnKeys;
    }
  });
});
