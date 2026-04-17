/**
 * Red-team bypass PoCs for Layer 2 (vault).
 */
import { describe, it, expect } from 'vitest';
import { vault } from '../../src/index';

describe('Layer 2 — vault bypasses', () => {
  it('BYPASS U1: non-cloneable payload throws at construction (DoS)', () => {
    expect(() => vault({ fn: () => 1 })).toThrow(TypeError);
    expect(() => vault({ s: Symbol('x') })).toThrow(TypeError);
  });

  it('BYPASS U2: every .get() returns a fresh clone — repeat cost is not amortized', () => {
    const v = vault({ big: Array.from({ length: 30 }, (_, i) => ({ i })) });
    const a = v.get();
    const b = v.get();
    // Confirms repeat allocation — attacker loop amplifies heap churn linearly
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });

  it('U4 regression: v.get.call(otherThis) cannot leak stored — arrow fn binds via closure', () => {
    const v = vault({ secret: 'kept' });
    const stolen = (v.get as any).call({ stolen: true });
    expect((stolen as any).secret).toBe('kept');
    expect((stolen as any).stolen).toBeUndefined();
  });

  it('U regression: vault object itself is frozen — .get cannot be swapped', () => {
    const v = vault({ x: 1 });
    expect(() => { (v as any).get = () => ({ x: 'HACK' }); }).toThrow(TypeError);
  });
});
