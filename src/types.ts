/** Primitive types that are inherently immutable */
type Primitive = string | number | boolean | bigint | symbol | undefined | null;

/**
 * Recursively marks all properties as readonly.
 * Handles objects, arrays, Maps, Sets, and nested structures.
 */
export type DeepReadonly<T> =
  T extends Primitive ? T :
  T extends Array<infer U> ? ReadonlyArray<DeepReadonly<U>> :
  T extends Map<infer K, infer V> ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>> :
  T extends Set<infer U> ? ReadonlySet<DeepReadonly<U>> :
  T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } :
  T;

/** Types that can be frozen by Object.freeze */
export type Freezable = object | Function;
