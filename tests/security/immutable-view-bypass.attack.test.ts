/**
 * Red-team bypass PoCs for Layer 1 (immutableView + collection wraps).
 */
import { describe, it, expect } from 'vitest';
import { immutableView } from '../../src/index';

describe('Layer 1 — immutableView bypasses', () => {
  it('BYPASS V1: no apply trap — wrapped function mutates caller-supplied receiver', () => {
    function evil(this: { hacked: boolean }): void { this.hacked = true; }
    const view = immutableView(evil);
    const target = { hacked: false };
    // BYPASS: Proxy handler lacks `apply` trap, so view.call() / view.apply() run unimpeded
    (view as typeof evil).call(target);
    expect(target.hacked).toBe(true);
  });

  it('BYPASS V1b: no construct trap — wrapped ctor produces real instance with real state', () => {
    class Box { value = 0; }
    const view = immutableView(Box);
    // BYPASS: `new view()` not intercepted; instance mutable
    const inst = new (view as typeof Box)();
    inst.value = 42;
    expect(inst.value).toBe(42);
  });

  it('BYPASS V3: custom method on Map subclass bypasses mutator list', () => {
    class EvilMap<K, V> extends Map<K, V> {
      sneakSet(k: K, v: V): void { this.set(k, v); }
    }
    const m = new EvilMap<string, number>([['k', 1]]);
    const view = immutableView(m);

    // `set` is blocked ...
    expect(() => (view as any).set('k', 2)).toThrow(TypeError);

    // BYPASS: `sneakSet` is not in MUTATOR_MAP; view.sneakSet is bound to target (line 87-88)
    // and invokes the real Map.prototype.set through `this=target`
    (view as any).sneakSet('k', 999);
    expect(m.get('k')).toBe(999);
  });

  it('BYPASS V3b: custom method on Set subclass bypasses mutator list', () => {
    class EvilSet<T> extends Set<T> {
      sneakAdd(v: T): void { this.add(v); }
    }
    const s = new EvilSet<number>([1]);
    const view = immutableView(s);
    expect(() => (view as any).add(2)).toThrow(TypeError);
    (view as any).sneakAdd(2);
    expect(s.has(2)).toBe(true);
  });

  it('BYPASS V5: custom toJSON() leaks a forged representation through JSON.stringify', () => {
    const obj = {
      safe: 1,
      toJSON(): unknown { return { safe: 'FORGED', secret: 'EXFIL' }; },
    };
    const view = immutableView(obj);
    // BYPASS: JSON path invokes target's toJSON; proxy observes nothing
    expect(JSON.stringify(view)).toBe('{"safe":"FORGED","secret":"EXFIL"}');
  });

  it('documented V8: view is a VIEW — original reference still mutable', () => {
    const original = { count: 0 };
    const view = immutableView(original);
    expect(() => { (view as any).count = 9; }).toThrow();
    // Documented — README: retained original can mutate
    original.count = 9;
    expect((view as typeof original).count).toBe(9);
  });

  it('V2 surface: handler uses raw Reflect.* — in-test poison subverts view', () => {
    const originalReflectGet = Reflect.get;
    const obj = { secret: 'safe' };
    const view = immutableView(obj);
    let observed: unknown;
    try {
      // Close over original so the poison replacement doesn't recurse
      (Reflect as any).get = (t: any, k: any) =>
        k === 'secret' ? 'POISONED' : (originalReflectGet as any)(t, k);
      observed = (view as typeof obj).secret;
    } finally {
      (Reflect as any).get = originalReflectGet;
    }
    expect(observed).toBe('POISONED');
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
