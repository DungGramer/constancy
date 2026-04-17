/**
 * Red-team bypass PoCs for Layer 4 (verification & checkRuntimeIntegrity).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { isDeepFrozen, deepFreeze, checkRuntimeIntegrity } from '../../src/index';

describe('Layer 4 — verification & runtime integrity bypasses', () => {
  afterEach(() => {
    // no cross-test state to reset (each test undoes its own poison)
  });

  it('BYPASS I1: isDeepFrozen false positive when accessor returns mutable object', () => {
    const obj = deepFreeze({
      get leak(): { mut: boolean } { return { mut: true }; },
    });
    // BYPASS: isDeepFrozen only checks data descriptors, not getter returns
    expect(isDeepFrozen(obj)).toBe(true);
    const leaked = obj.leak;
    leaked.mut = false;
    expect(leaked.mut).toBe(false);
  });

  it('BYPASS I2: checkRuntimeIntegrity does NOT cover Reflect.get', () => {
    // Poisoning Reflect.get breaks vitest internals mid-test; instead we just assert
    // the cached builtins list does NOT include these Reflect methods.
    const result = checkRuntimeIntegrity();
    // Current build returns intact — our integrity checker never looks at Reflect.get etc.
    expect(result.intact).toBe(true);
    expect(result.compromised).not.toContain('Reflect.get');
    expect(result.compromised).not.toContain('Reflect.set');
    expect(result.compromised).not.toContain('Reflect.has');
  });

  it('BYPASS I2b: checkRuntimeIntegrity does NOT cover Reflect.getOwnPropertyDescriptor', () => {
    const result = checkRuntimeIntegrity();
    expect(result.compromised).not.toContain('Reflect.getOwnPropertyDescriptor');
    expect(result.compromised).not.toContain('Reflect.getPrototypeOf');
    expect(result.compromised).not.toContain('Reflect.isExtensible');
  });

  it('BYPASS I3: Map.prototype poisoning undetected', () => {
    const original = Map.prototype.get;
    try {
      Map.prototype.get = function () { return 'HIJACK'; };
      const result = checkRuntimeIntegrity();
      expect(result.intact).toBe(true);
      expect(result.compromised.length).toBe(0);
    } finally {
      Map.prototype.get = original;
    }
  });

  it('BYPASS I4: Array.prototype.push poisoning undetected', () => {
    const original = Array.prototype.push;
    try {
      Array.prototype.push = function () { return 0; };
      expect(checkRuntimeIntegrity().intact).toBe(true);
    } finally {
      Array.prototype.push = original;
    }
  });

  it('BYPASS I5: Object.prototype getter injection undetected', () => {
    try {
      Object.defineProperty(Object.prototype, '_leak', {
        configurable: true,
        get() { return 'LEAK'; },
      });
      // No hook in checkRuntimeIntegrity to notice proto pollution
      expect(checkRuntimeIntegrity().intact).toBe(true);
      expect(({} as any)._leak).toBe('LEAK');
    } finally {
      delete (Object.prototype as any)._leak;
    }
  });

  it('BYPASS I6: poison → use library → restore — subsequent integrity check lies', () => {
    // Snapshot current state
    const original = Object.freeze;
    (Object as any).freeze = (x: unknown) => x; // NO-OP poison
    // Library call would now fail to actually freeze; restore before check
    (Object as any).freeze = original;
    expect(checkRuntimeIntegrity().intact).toBe(true); // false negative after the fact
  });
});
