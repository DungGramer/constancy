/**
 * P5: ES module namespace import frozen by spec — regression test for re-export integrity.
 */
import { describe, it, expect } from 'vitest';
import * as constancy from '../../src/index';

describe('Cross-cutting — module namespace integrity', () => {
  it('P5 regression: namespace object is frozen — cannot replace exported function', () => {
    expect(() => {
      (constancy as any).deepFreeze = () => 'HACK';
    }).toThrow(TypeError);
    expect(typeof constancy.deepFreeze).toBe('function');
  });

  it('P5 regression: all expected exports present', () => {
    const required = [
      'freezeShallow', 'deepFreeze',
      'immutableView', 'isImmutableView', 'assertImmutableView',
      'immutableMapView', 'immutableSetView',
      'snapshot', 'lock', 'secureSnapshot', 'tamperEvident',
      'vault',
      'isDeepFrozen', 'assertDeepFrozen', 'checkRuntimeIntegrity',
    ];
    for (const name of required) {
      expect(typeof (constancy as any)[name]).toBe('function');
    }
  });
});
