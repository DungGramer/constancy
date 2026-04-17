/**
 * Red-team bypass PoCs for Layer 2.5 (secureSnapshot).
 */
import { describe, it, expect } from 'vitest';
import { secureSnapshot } from '../../src/index';

describe('Layer 2.5 — secureSnapshot bypasses', () => {
  it('BYPASS X1: accessor-only properties SILENTLY DROPPED (data loss)', () => {
    const input = {
      get important(): number { return 42; },
      plain: 1,
    };
    const sec = secureSnapshot(input) as Record<string, unknown>;
    // BYPASS: `important` is silently removed from the output — caller cannot tell
    expect(sec.important).toBeUndefined();
    expect(sec.plain).toBe(1);
  });

  it('BYPASS X2: nested non-plain type aborts entire call (DoS on hostile payload)', () => {
    const input = { safe: 1, evil: new Date() };
    expect(() => secureSnapshot(input)).toThrow(/plain objects/);
  });

  it('X3 regression: stored reference NOT directly reachable via descriptor.get', () => {
    const sec = secureSnapshot({ nested: { x: 1 } });
    const desc = Object.getOwnPropertyDescriptor(sec, 'nested')!;
    const raw = desc.get!.call(sec);
    // `raw` is the already-secured inner object — assigning throws (null proto, non-configurable)
    expect(() => { (raw as any).x = 999; }).toThrow();
  });

  it('X4 regression: Symbol keys are preserved with non-configurable getters', () => {
    const sym = Symbol('secret');
    const sec = secureSnapshot({ [sym]: 'value', plain: 1 });
    expect((sec as any)[sym]).toBe('value');
    expect(() => {
      Object.defineProperty(sec, sym, { value: 'HACK', configurable: true });
    }).toThrow();
  });

  it('regression: null prototype at root — Object.prototype pollution cannot reach', () => {
    (Object.prototype as any).leak = 'BAD';
    try {
      const sec = secureSnapshot({ plain: 1 }) as Record<string, unknown>;
      expect(sec.leak).toBeUndefined(); // null-proto defeats chain lookup
    } finally {
      delete (Object.prototype as any).leak;
    }
  });
});
