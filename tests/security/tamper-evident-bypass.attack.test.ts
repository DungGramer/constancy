/**
 * Red-team bypass PoCs for Layer 3 (tamperEvident).
 * djb2 is a non-cryptographic hash; stableStringify covers only own keys.
 */
import { describe, it, expect } from 'vitest';
import { tamperEvident } from '../../src/index';

describe('Layer 3 — tamperEvident bypasses', () => {
  it('T2 fix: different Maps produce different fingerprints (internal slot reached)', () => {
    const a = tamperEvident(new Map([['k', 'v']]));
    const b = tamperEvident(new Map<string, string>());
    const c = tamperEvident(new Map([['other', 'payload']]));
    expect(a.fingerprint).not.toBe(b.fingerprint);
    expect(a.fingerprint).not.toBe(c.fingerprint);
    expect(b.fingerprint).not.toBe(c.fingerprint);
  });

  it('T3 fix: different Sets produce different fingerprints', () => {
    const a = tamperEvident(new Set([1, 2, 3]));
    const b = tamperEvident(new Set<number>());
    const c = tamperEvident(new Set([1, 2, 3, 4]));
    expect(a.fingerprint).not.toBe(b.fingerprint);
    expect(a.fingerprint).not.toBe(c.fingerprint);
  });

  it('T4 fix: different Date values produce different fingerprints', () => {
    const a = tamperEvident(new Date(0));
    const b = tamperEvident(new Date(9_999_999));
    expect(a.fingerprint).not.toBe(b.fingerprint);
  });

  it('BYPASS T5: Symbols with identical descriptions produce identical hash entries', () => {
    const a = tamperEvident({ [Symbol('x')]: 'A' });
    const b = tamperEvident({ [Symbol('x')]: 'A' });
    // distinct symbol identities but stableStringify uses .toString() → "Symbol(x)"
    expect(a.fingerprint).toBe(b.fingerprint);
  });

  it('T7 clarification: getters on the INPUT are invoked once by structuredClone', () => {
    let tick = 0;
    const obj = { get counter(): number { return ++tick; } };
    tamperEvident(obj as any);
    // structuredClone snapshots the getter's return value (tick becomes 1) and stores it
    // as a plain data property — later verify() reads the captured value, not the live getter.
    // This means T7 (runtime drift) does NOT fire on the STORED copy.
    // BUT: any caller passing attacker-supplied input with side-effectful getters DOES trigger
    // those side effects during tamperEvident() construction — resource-exhaustion / logging
    // amplification surface for hostile input.
    expect(tick).toBeGreaterThanOrEqual(1);
  });

  it('regression T8: array holes are distinguishable from explicit undefined in current build', () => {
    const dense = tamperEvident([undefined, undefined, undefined]);
    const sparse = tamperEvident(Array(3)); // three holes
    // Current lib uses Array.prototype.map which SKIPS holes — holes stringify as ',,'
    // while explicit undefined stringifies as 'undefined,undefined,undefined'. Different hash.
    // This test locks in the current correct behavior so a future refactor can't break it.
    expect(dense.fingerprint).not.toBe(sparse.fingerprint);
  });

  it('BYPASS T9: different cycle depths collapse to same placeholder', () => {
    const a: any = {}; a.self = a;
    const b: any = { level: { level: {} } }; b.level.level.level = b;
    const va = tamperEvident(a);
    const vb = tamperEvident(b);
    // Both serialize the recursive edge as "[Circular]" — placeholder collision possible
    // This does not PROVE collision for these two specific objects but demonstrates the
    // class of attack: carefully-crafted cycle structures can be made to collide.
    expect(typeof va.fingerprint).toBe('string');
    expect(typeof vb.fingerprint).toBe('string');
  });

  it('T1 demonstration: djb2 is 32-bit — birthday attack feasible in O(2^16) payloads', () => {
    // Not running the full 65k search here (CI-expensive). Assert hash space bound only.
    const v = tamperEvident({ x: 1 });
    const raw = parseInt(v.fingerprint, 36);
    expect(raw).toBeLessThanOrEqual(0xffffffff);
  });

  it('regression: fingerprint is not mutable from outside (frozen return)', () => {
    const v = tamperEvident({ x: 1 });
    expect(() => { (v as any).fingerprint = 'HACK'; }).toThrow(TypeError);
    expect(() => { (v as any).verify = () => true; }).toThrow(TypeError);
  });
});
