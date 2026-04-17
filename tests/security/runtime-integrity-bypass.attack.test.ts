/**
 * Red-team bypass PoCs for Layer 4 (verification & checkRuntimeIntegrity).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { isDeepFrozen, deepFreeze, checkRuntimeIntegrity } from '../../src/index';

describe('Layer 4 — verification & runtime integrity bypasses', () => {
  afterEach(() => {
    // no cross-test state to reset (each test undoes its own poison)
  });

  it('I1 fix: isDeepFrozen returns false when an accessor is present', () => {
    const obj = deepFreeze({
      get leak(): { mut: boolean } { return { mut: true }; },
    });
    // Fix: accessor descriptors cannot be proven deep-frozen → return false
    expect(isDeepFrozen(obj)).toBe(false);
    // Leak still possible in the underlying object — but caller is now warned
    const leaked = obj.leak;
    leaked.mut = false;
    expect(leaked.mut).toBe(false);
  });

  it('I2 fix: Reflect.has poisoning detected', () => {
    const original = Reflect.has;
    let result: { intact: boolean; compromised: readonly string[] };
    (Reflect as any).has = () => false;
    try {
      result = checkRuntimeIntegrity();
    } finally {
      (Reflect as any).has = original;
    }
    // Assert AFTER restoration — expect() uses Reflect.has internally
    expect(result.intact).toBe(false);
    expect(result.compromised).toContain('Reflect.has');
  });

  it('I2b fix: Reflect.getOwnPropertyDescriptor / getPrototypeOf / isExtensible all covered', () => {
    const originals = {
      gopd: Reflect.getOwnPropertyDescriptor,
      gpo: Reflect.getPrototypeOf,
      ie: Reflect.isExtensible,
    };
    let result: { intact: boolean; compromised: readonly string[] };
    (Reflect as any).getOwnPropertyDescriptor = () => undefined;
    (Reflect as any).getPrototypeOf = () => null;
    (Reflect as any).isExtensible = () => false;
    try {
      result = checkRuntimeIntegrity();
    } finally {
      (Reflect as any).getOwnPropertyDescriptor = originals.gopd;
      (Reflect as any).getPrototypeOf = originals.gpo;
      (Reflect as any).isExtensible = originals.ie;
    }
    expect(result.compromised).toContain('Reflect.getOwnPropertyDescriptor');
    expect(result.compromised).toContain('Reflect.getPrototypeOf');
    expect(result.compromised).toContain('Reflect.isExtensible');
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

  it('I5 fix: Object.prototype pollution detected via own-keys fingerprint', () => {
    try {
      Object.defineProperty(Object.prototype, '_leak', {
        configurable: true,
        get() { return 'LEAK'; },
      });
      const result = checkRuntimeIntegrity();
      expect(result.intact).toBe(false);
      expect(result.compromised).toContain('Object.prototype');
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
