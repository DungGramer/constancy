/**
 * Red-team bypass PoCs for Layer 0 (freezeShallow / deepFreeze).
 * Each passing test below means the library currently ALLOWS the bypass.
 * See docs/security-audit.md for ID → severity mapping.
 */
import { describe, it, expect } from 'vitest';
import { deepFreeze, freezeShallow, isDeepFrozen } from '../../src/index';

describe('Layer 0 — freeze bypasses', () => {
  it('BYPASS F1: prototype chain not traversed — poison class prototype after freeze', () => {
    class Box {
      value = 1;
      greet(): string { return 'hi'; }
    }
    const instance = new Box();
    deepFreeze(instance);

    // Own prop `value` frozen
    expect(() => { (instance as any).value = 2; }).toThrow();

    // BYPASS: prototype method still mutable — deepFreeze does not walk proto chain
    Box.prototype.greet = function () { return 'PWNED'; };
    expect(instance.greet()).toBe('PWNED');
  });

  it('documented F2: Map internal slots remain mutable after deepFreeze', () => {
    const m = new Map<string, number>([['k', 1]]);
    deepFreeze(m);
    // Object-level frozen but [[MapData]] is not
    m.set('k', 999);
    expect(m.get('k')).toBe(999);
  });

  it('documented F2b: Set internal slots remain mutable after deepFreeze', () => {
    const s = new Set<number>([1]);
    deepFreeze(s);
    s.add(2);
    expect(s.has(2)).toBe(true);
  });

  it('documented F3: TypedArray byte data mutable after deepFreeze', () => {
    const container = { buf: new Uint8Array([1, 2, 3]) };
    deepFreeze(container);
    container.buf[0] = 99;
    expect(container.buf[0]).toBe(99);
  });

  it('BYPASS F4: accessor properties skipped — getter returns fresh mutable object', () => {
    const obj = {
      get leak(): { mut: boolean } { return { mut: true }; },
    };
    deepFreeze(obj);

    // BYPASS: getter return value is a *new* object each call, never frozen
    const r = obj.leak;
    r.mut = false;
    expect(r.mut).toBe(false);

    // And isDeepFrozen cannot detect the leak (I1)
    expect(isDeepFrozen(obj)).toBe(true);
  });

  it('BYPASS F5: well-known symbol method on polluted prototype subverts iteration', () => {
    const obj = deepFreeze([1, 2, 3]);
    const original = (Array.prototype as any)[Symbol.iterator];
    let collected: unknown[] = [];
    try {
      (Array.prototype as any)[Symbol.iterator] = function* () { yield 'HIJACKED'; };
      // Manual collection — avoid any vitest helper that relies on array iteration while poisoned
      for (const v of obj) collected.push(v);
    } finally {
      (Array.prototype as any)[Symbol.iterator] = original;
    }
    // Assertions run AFTER restoration so vitest internals are healthy
    expect(collected.length).toBe(1);
    expect(collected[0]).toBe('HIJACKED');
  });

  it('BYPASS F8: private class fields bypass freeze invariant', () => {
    class Secret {
      #data = { leak: true };
      peek(): { leak: boolean } { return this.#data; }
      poke(v: boolean): void { this.#data.leak = v; }
    }
    const s = new Secret();
    deepFreeze(s);
    // BYPASS: #data lives in per-instance private slot; freeze doesn't touch it
    s.poke(false);
    expect(s.peek().leak).toBe(false);
  });

  it('F9: revocable Proxy frozen, then revoked → post-freeze access throws (DoS surface)', () => {
    const { proxy, revoke } = Proxy.revocable({ a: 1 }, {});
    expect(() => deepFreeze(proxy as unknown as object)).not.toThrow();
    revoke();
    // Access now throws — callers relying on `const x = deepFreeze(...)` to be safely readable fail
    expect(() => (proxy as any).a).toThrow();
  });

  it('F7: Error.prepareStackTrace is global — freezing Error instance does not protect stack tooling', () => {
    const err = new Error('boom');
    freezeShallow(err);
    // Global hook unaffected; attacker controls stringification of all future error traces
    const original = (Error as any).prepareStackTrace;
    try {
      (Error as any).prepareStackTrace = () => 'forged-stack';
      const captured = new Error('after').stack;
      expect(captured).toBe('forged-stack');
    } finally {
      (Error as any).prepareStackTrace = original;
    }
  });
});
