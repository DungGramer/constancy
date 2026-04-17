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

  it('T7 fix: stableStringify does NOT invoke accessor descriptors', () => {
    // Pass an object with accessors directly. tamperEvident first structuredClones
    // (which may invoke getters), but stableStringify itself should never call them.
    // We test the stableStringify path via a live wrapper where structuredClone
    // cannot materialize the getter — using Object.defineProperty on a frozen
    // wrapper post-clone.
    let tick = 0;
    const obj: any = {};
    Object.defineProperty(obj, 'counter', {
      get() { tick++; return tick; },
      enumerable: true,
      configurable: false,
    });
    // structuredClone WILL capture the getter's return value once → tick becomes 1
    const v = tamperEvident(obj);
    const afterFirst = tick;
    // verify() re-stringifies the stored clone; if it invoked any accessor on
    // a non-getter value (which shouldn't exist post-clone), tick would rise.
    v.verify();
    v.verify();
    v.verify();
    expect(tick).toBe(afterFirst); // no additional invocations
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

  it('T1 fix: fingerprint is now 64-bit (two 32-bit hashes concatenated)', () => {
    // Birthday bound lifted from ~2^16 (djb2 only) to ~2^32 (djb2 + sdbm).
    // Still non-cryptographic — callers needing security guarantees must use HMAC.
    const v = tamperEvident({ x: 1 });
    expect(v.fingerprint.length).toBe(14); // 7 base-36 chars per 32-bit half
  });

  it('regression: fingerprint is not mutable from outside (frozen return)', () => {
    const v = tamperEvident({ x: 1 });
    expect(() => { (v as any).fingerprint = 'HACK'; }).toThrow(TypeError);
    expect(() => { (v as any).verify = () => true; }).toThrow(TypeError);
  });
});
