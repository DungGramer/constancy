/**
 * Red-team bypass PoCs for Layer 1.5 (immutableMapView / immutableSetView / ImmutableMap / ImmutableSet).
 */
import { describe, it, expect } from 'vitest';
import { immutableMapView, immutableSetView } from '../../src/index';

describe('Layer 1.5 — immutable collection view bypasses', () => {
  it('BYPASS C1: values are unfrozen between construction and first read', () => {
    const inner = { n: 1 };
    const source = new Map<string, { n: number }>([['k', inner]]);
    const view = immutableMapView(source);
    // Before any `.get/.values/.entries/.forEach` call, the internal #map stores the cloned
    // object UNFROZEN. No external hook exists to reach it without triggering freeze, so this
    // test documents the invariant window rather than exploits it.
    expect(Object.isFrozen(view)).toBe(false); // wrapper itself is not frozen
    // Accessing via get() freezes on read — idempotent and safe thereafter
    const got = view.get('k')!;
    expect(Object.isFrozen(got)).toBe(true);
  });

  it('BYPASS C3: partial iteration leaves remaining objects unfrozen', () => {
    const a = { n: 1 };
    const b = { n: 2 };
    const view = immutableMapView(new Map([['a', a], ['b', b]]));
    const iter = view.values();
    const first = iter.next().value!;
    // `first` has been frozen by generator, but subsequent entries not touched
    expect(Object.isFrozen(first)).toBe(true);
    // Abort iteration; next entry (internal clone of `b`) never gets deep-frozen
    // (no external reference to verify, but coverage gap is real — hostile GC/WeakRef
    // escape would see the raw clone)
    expect(view.size).toBe(2);
  });

  it('BYPASS C4: DataCloneError at construction — hostile payload = DoS', () => {
    const bad = new Map<string, unknown>([['k', () => 1]]); // functions not structuredClone-able
    expect(() => immutableMapView(bad)).toThrow();
  });

  it('documented C2: has() uses reference identity — originals deliberately not findable', () => {
    const original = { id: 1 };
    const view = immutableSetView(new Set([original]));
    // Clone at construction → identity changed
    expect(view.has(original)).toBe(false);
  });

  it('C5 fix: ImmutableMap/Set prototypes are frozen — prototype pollution blocked', () => {
    const mapView = immutableMapView(new Map([['k', 1]]));
    const setView = immutableSetView(new Set([1]));
    const mapProto = Object.getPrototypeOf(mapView);
    const setProto = Object.getPrototypeOf(setView);
    expect(Object.isFrozen(mapProto)).toBe(true);
    expect(Object.isFrozen(setProto)).toBe(true);
    expect(() => { mapProto.get = function () { return 'HIJACKED'; }; }).toThrow(TypeError);
    expect(() => { setProto.has = function () { return false; }; }).toThrow(TypeError);
  });
});
