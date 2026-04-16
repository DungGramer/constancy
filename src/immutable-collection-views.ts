/**
 * Immutable wrappers for Map and Set that expose only read operations,
 * blocking all mutation methods at the type level.
 *
 * Deep immutability: object values are deep-frozen on read (lazy). The
 * constructor uses structuredClone for object values so source references
 * remain independently mutable.
 *
 * Note: structuredClone cannot clone functions or Symbols — values containing
 * these will throw DataCloneError at construction, same as snapshot()/vault().
 */

import { freezeDeep, deepClone } from './freeze-deep-internal';
import { isFreezable } from './utils';

/**
 * A read-only wrapper around a `Map` that implements `ReadonlyMap`.
 * Mutation methods (`set`, `delete`, `clear`) are simply absent.
 * Object values are deep-cloned at construction and deep-frozen on first read.
 */
export class ImmutableMap<K, V> implements ReadonlyMap<K, V> {
  readonly #map: Map<K, V>;

  constructor(source: Map<K, V>) {
    // Clone object values so freezing our copy does not affect the source
    this.#map = new Map();
    for (const [k, v] of source) {
      this.#map.set(k, isFreezable(v) ? (deepClone(v) as V) : v);
    }
  }

  get size(): number {
    return this.#map.size;
  }

  get(key: K): V | undefined {
    const val = this.#map.get(key);
    // Lazy deep-freeze on access — idempotent, cheap on repeat reads
    if (val !== undefined && isFreezable(val)) {
      freezeDeep(val as object);
    }
    return val;
  }

  has(key: K): boolean {
    return this.#map.has(key);
  }

  keys(): MapIterator<K> {
    return this.#map.keys();
  }

  values(): IterableIterator<V> {
    return this.#frozenValues();
  }

  entries(): IterableIterator<[K, V]> {
    return this.#frozenEntries();
  }

  forEach(callbackfn: (value: V, key: K, map: ReadonlyMap<K, V>) => void): void {
    this.#map.forEach((value, key) => {
      if (isFreezable(value)) freezeDeep(value as object);
      callbackfn(value, key, this);
    });
  }

  [Symbol.iterator](): IterableIterator<[K, V]> {
    return this.#frozenEntries();
  }

  get [Symbol.toStringTag](): string {
    return 'ImmutableMap';
  }

  *#frozenValues(): Generator<V, void, unknown> {
    for (const val of this.#map.values()) {
      if (isFreezable(val)) freezeDeep(val as object);
      yield val;
    }
  }

  *#frozenEntries(): Generator<[K, V], void, unknown> {
    for (const [key, val] of this.#map.entries()) {
      if (isFreezable(val)) freezeDeep(val as object);
      yield [key, val];
    }
  }
}

/**
 * A read-only wrapper around a `Set` that implements `ReadonlySet`.
 * Mutation methods (`add`, `delete`, `clear`) are simply absent.
 * Object values are deep-cloned at construction and deep-frozen on first read.
 */
export class ImmutableSet<T> implements ReadonlySet<T> {
  readonly #set: Set<T>;

  constructor(source: Set<T>) {
    // Clone object values so freezing our copy does not affect the source
    this.#set = new Set();
    for (const v of source) {
      this.#set.add(isFreezable(v) ? (deepClone(v) as T) : v);
    }
  }

  get size(): number {
    return this.#set.size;
  }

  has(value: T): boolean {
    return this.#set.has(value);
  }

  keys(): IterableIterator<T> {
    return this.#frozenValues();
  }

  values(): IterableIterator<T> {
    return this.#frozenValues();
  }

  entries(): IterableIterator<[T, T]> {
    return this.#frozenEntries();
  }

  forEach(callbackfn: (value: T, value2: T, set: ReadonlySet<T>) => void): void {
    this.#set.forEach((value) => {
      if (isFreezable(value)) freezeDeep(value as object);
      callbackfn(value, value, this);
    });
  }

  [Symbol.iterator](): IterableIterator<T> {
    return this.#frozenValues();
  }

  get [Symbol.toStringTag](): string {
    return 'ImmutableSet';
  }

  *#frozenValues(): Generator<T, void, unknown> {
    for (const val of this.#set.values()) {
      if (isFreezable(val)) freezeDeep(val as object);
      yield val;
    }
  }

  *#frozenEntries(): Generator<[T, T], void, unknown> {
    for (const val of this.#set.values()) {
      if (isFreezable(val)) freezeDeep(val as object);
      yield [val, val];
    }
  }
}

/**
 * Wraps a `Map` in an `ImmutableMap`, returning a `ReadonlyMap` typed reference.
 * @param source - The mutable map to wrap
 */
export function immutableMapView<K, V>(source: Map<K, V>): ReadonlyMap<K, V> {
  return new ImmutableMap(source);
}

/**
 * Wraps a `Set` in an `ImmutableSet`, returning a `ReadonlySet` typed reference.
 * @param source - The mutable set to wrap
 */
export function immutableSetView<T>(source: Set<T>): ReadonlySet<T> {
  return new ImmutableSet(source);
}
