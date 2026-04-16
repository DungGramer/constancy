import { isFreezable } from './utils';

type CreateProxy = <T extends object>(obj: T) => T;

/** Wrap a single value through createProxy if it is freezable */
function wrapValue<T>(val: T, createProxy: CreateProxy): T {
  return isFreezable(val) ? (createProxy(val as unknown as object) as unknown as T) : val;
}

/** Wrap a raw iterator so each yielded value passes through createProxy */
function* wrapIterator<T>(iter: Iterator<T>, createProxy: CreateProxy): Generator<T> {
  let step = iter.next();
  while (!step.done) {
    yield wrapValue(step.value, createProxy);
    step = iter.next();
  }
}

/** Wrap a raw entries iterator — entry is [K, V]; only V is wrapped */
function* wrapEntriesIterator<K, V>(
  iter: Iterator<[K, V]>,
  createProxy: CreateProxy,
): Generator<[K, V]> {
  let step = iter.next();
  while (!step.done) {
    const [k, v] = step.value;
    yield [k, wrapValue(v, createProxy)] as [K, V];
    step = iter.next();
  }
}

/**
 * If `prop` is a value-returning Map method that needs wrapping, return a
 * wrapped version bound to `target`. Returns `null` for other methods.
 */
export function wrapMapMethod<K, V>(
  target: Map<K, V>,
  prop: string | symbol,
  createProxy: CreateProxy,
): ((...args: unknown[]) => unknown) | null {
  if (prop === 'get') {
    return (key: unknown) => {
      const val = target.get(key as K);
      return val === undefined ? val : wrapValue(val, createProxy);
    };
  }

  if (prop === 'values') {
    return () => {
      const iter = target.values();
      return wrapIterator(iter, createProxy);
    };
  }

  if (prop === 'entries' || prop === Symbol.iterator) {
    return () => {
      const iter = target.entries();
      return wrapEntriesIterator(iter, createProxy);
    };
  }

  if (prop === 'forEach') {
    return (cb: unknown, thisArg?: unknown) => {
      target.forEach((v, k, m) => {
        (cb as (v: V, k: K, m: Map<K, V>) => void).call(
          thisArg,
          wrapValue(v, createProxy),
          k,
          m,
        );
      });
    };
  }

  return null;
}

/**
 * If `prop` is a value-returning Set method that needs wrapping, return a
 * wrapped version bound to `target`. Returns `null` for other methods.
 */
export function wrapSetMethod<T>(
  target: Set<T>,
  prop: string | symbol,
  createProxy: CreateProxy,
): ((...args: unknown[]) => unknown) | null {
  if (prop === 'values' || prop === 'keys' || prop === Symbol.iterator) {
    return () => {
      const iter = target.values();
      return wrapIterator(iter, createProxy);
    };
  }

  if (prop === 'entries') {
    return () => {
      // Set entries are [v, v] pairs
      const iter = target.entries();
      return (function* () {
        let step = iter.next();
        while (!step.done) {
          const wrapped = wrapValue(step.value[0], createProxy);
          yield [wrapped, wrapped] as [T, T];
          step = iter.next();
        }
      })();
    };
  }

  if (prop === 'forEach') {
    return (cb: unknown, thisArg?: unknown) => {
      target.forEach((v, _v2, s) => {
        (cb as (v: T, v2: T, s: Set<T>) => void).call(
          thisArg,
          wrapValue(v, createProxy),
          wrapValue(v, createProxy),
          s,
        );
      });
    };
  }

  return null;
}
