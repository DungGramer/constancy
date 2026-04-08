/**
 * Check if value is freezable (object or function, not null/undefined).
 */
export function isFreezable(val: unknown): val is object | Function {
  if (val === null || val === undefined) return false;
  const t = typeof val;
  return t === 'object' || t === 'function';
}

/**
 * Get all own property keys including Symbols.
 * Uses Reflect.ownKeys() for complete coverage.
 */
export function getOwnKeys(obj: object): (string | symbol)[] {
  return Reflect.ownKeys(obj);
}
