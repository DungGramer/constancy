/**
 * Immutable wrappers for Map and Set that expose only read operations,
 * blocking all mutation methods at the type level.
 */

/**
 * A read-only wrapper around a `Map` that implements `ReadonlyMap`.
 * Mutation methods (`set`, `delete`, `clear`) are simply absent.
 */
export class ImmutableMap<K, V> implements ReadonlyMap<K, V> {
  readonly #map: Map<K, V>;

  constructor(source: Map<K, V>) {
    this.#map = new Map(source); // Defensive copy — caller can't mutate via original
  }

  get size(): number {
    return this.#map.size;
  }

  get(key: K): V | undefined {
    return this.#map.get(key);
  }

  has(key: K): boolean {
    return this.#map.has(key);
  }

  keys(): MapIterator<K> {
    return this.#map.keys();
  }

  values(): MapIterator<V> {
    return this.#map.values();
  }

  entries(): MapIterator<[K, V]> {
    return this.#map.entries();
  }

  forEach(callbackfn: (value: V, key: K, map: ReadonlyMap<K, V>) => void): void {
    this.#map.forEach((value, key) => callbackfn(value, key, this));
  }

  [Symbol.iterator](): MapIterator<[K, V]> {
    return this.#map[Symbol.iterator]();
  }

  get [Symbol.toStringTag](): string {
    return 'ImmutableMap';
  }
}

/**
 * A read-only wrapper around a `Set` that implements `ReadonlySet`.
 * Mutation methods (`add`, `delete`, `clear`) are simply absent.
 */
export class ImmutableSet<T> implements ReadonlySet<T> {
  readonly #set: Set<T>;

  constructor(source: Set<T>) {
    this.#set = new Set(source); // Defensive copy — caller can't mutate via original
  }

  get size(): number {
    return this.#set.size;
  }

  has(value: T): boolean {
    return this.#set.has(value);
  }

  keys(): SetIterator<T> {
    return this.#set.keys();
  }

  values(): SetIterator<T> {
    return this.#set.values();
  }

  entries(): SetIterator<[T, T]> {
    return this.#set.entries();
  }

  forEach(callbackfn: (value: T, value2: T, set: ReadonlySet<T>) => void): void {
    this.#set.forEach((value) => callbackfn(value, value, this));
  }

  [Symbol.iterator](): SetIterator<T> {
    return this.#set[Symbol.iterator]();
  }

  get [Symbol.toStringTag](): string {
    return 'ImmutableSet';
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
