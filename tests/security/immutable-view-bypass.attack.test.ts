/**
 * Red-team bypass PoCs for Layer 1 (immutableView + collection wraps).
 */
import { describe, it, expect } from 'vitest';
import { immutableView } from '../../src/index';

describe('Layer 1 — immutableView bypasses', () => {
  it('V1 fix: apply trap blocks wrapped function from mutating a mutable receiver', () => {
    function evil(this: { hacked: boolean }): void { this.hacked = true; }
    const view = immutableView(evil);
    const target = { hacked: false };
    expect(() => (view as typeof evil).call(target)).toThrow(/apply function with a mutable receiver/);
    expect(target.hacked).toBe(false);
  });

  it('V1b fix: construct trap blocks `new view(...)` on wrapped constructors', () => {
    class Box { value = 0; }
    const view = immutableView(Box);
    expect(() => new (view as typeof Box)()).toThrow(/construct from immutable view/);
  });

  it('V3 fix: custom subclass method on Map view is now blocked (deny-by-default)', () => {
    class EvilMap<K, V> extends Map<K, V> {
      sneakSet(k: K, v: V): void { this.set(k, v); }
    }
    const m = new EvilMap<string, number>([['k', 1]]);
    const view = immutableView(m);

    expect(() => (view as any).set('k', 2)).toThrow(TypeError);
    // Fix: sneakSet is not in the read-method allow-list → blocked
    expect(() => (view as any).sneakSet('k', 999)).toThrow(/invoke subclass method "sneakSet"/);
    expect(m.get('k')).toBe(1); // original unchanged
  });

  it('V3b fix: custom subclass method on Set view is now blocked', () => {
    class EvilSet<T> extends Set<T> {
      sneakAdd(v: T): void { this.add(v); }
    }
    const s = new EvilSet<number>([1]);
    const view = immutableView(s);
    expect(() => (view as any).add(2)).toThrow(TypeError);
    expect(() => (view as any).sneakAdd(2)).toThrow(/invoke subclass method "sneakAdd"/);
    expect(s.has(2)).toBe(false);
  });

  it('V5 default: custom toJSON() is still honored (documented limitation)', () => {
    const obj = {
      safe: 1,
      toJSON(): unknown { return { safe: 'FORGED', secret: 'EXFIL' }; },
    };
    const view = immutableView(obj);
    // Default behavior preserved for compat — JSON.stringify invokes target.toJSON
    expect(JSON.stringify(view)).toBe('{"safe":"FORGED","secret":"EXFIL"}');
  });

  it('V5 fix: opt-in blockToJSON suppresses the target toJSON and uses Proxy-observed serialization', () => {
    const obj = {
      safe: 1,
      toJSON(): unknown { return { safe: 'FORGED', secret: 'EXFIL' }; },
    };
    const view = immutableView(obj, { blockToJSON: true });
    // toJSON hidden by the get trap → default serialization walks own enumerable props.
    // toJSON itself is a function → JSON.stringify drops it. Output reflects the real data.
    const out = JSON.parse(JSON.stringify(view));
    expect(out).toEqual({ safe: 1 });
    expect(out.secret).toBeUndefined();
  });

  it('documented V8: view is a VIEW — original reference still mutable', () => {
    const original = { count: 0 };
    const view = immutableView(original);
    expect(() => { (view as any).count = 9; }).toThrow();
    // Documented — README: retained original can mutate
    original.count = 9;
    expect((view as typeof original).count).toBe(9);
  });

  it('V2 fix: handler uses cached Reflect.* — in-test poison does NOT subvert view', () => {
    const originalReflectGet = Reflect.get;
    const obj = { secret: 'safe' };
    const view = immutableView(obj);
    let observed: unknown;
    (Reflect as any).get = (t: any, k: any) =>
      k === 'secret' ? 'POISONED' : (originalReflectGet as any)(t, k);
    try {
      observed = (view as typeof obj).secret;
    } finally {
      (Reflect as any).get = originalReflectGet;
    }
    // Fix: view reads via cached _reflectGet, ignoring post-import poison
    expect(observed).toBe('safe');
  });

  it('BYPASS V4: Symbol-keyed mutator names skipped — future-proofing gap', () => {
    const sym = Symbol.for('futureMutator');
    class Fake {
      [sym](): void { /* would mutate in a hypothetical future spec */ }
    }
    const view = immutableView(new Fake());
    // getBlockedMutator only inspects string keys (line 48) — Symbol method returned as-is
    expect(typeof (view as any)[sym]).toBe('function');
    // Not a real exploit today (no built-in Symbol-named mutators), but defense hole if ever added
  });

  it('V7: wrapIterator yields wrapped values but iterator object itself is mutable', () => {
    const m = new Map<string, { n: number }>([['k', { n: 1 }]]);
    const view = immutableView(m) as Map<string, { n: number }>;
    const iter = view.values();
    // Attacker can overwrite iter.next with a forger — iterator protocol not protected
    const forged = { value: { n: 9999 } as any, done: false };
    (iter as any).next = () => forged;
    const first = iter.next().value;
    expect(first.n).toBe(9999);
  });
});
