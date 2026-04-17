/**
 * Cached references to built-in methods.
 * Captured at module load time to prevent post-import tampering.
 *
 * If an attacker overrides Object.freeze AFTER constancy is imported,
 * the library still uses the original native implementation.
 */

export const _freeze = Object.freeze;
export const _isFrozen = Object.isFrozen;
export const _getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
export const _defineProperty = Object.defineProperty;
export const _create = Object.create;
export const _ownKeys = Reflect.ownKeys;
export const _isView = ArrayBuffer.isView;
export const _Proxy = Proxy;

declare function structuredClone<T>(value: T): T;
export const _structuredClone = typeof structuredClone === 'function' ? structuredClone : undefined;
export const _jsonStringify = JSON.stringify;
export const _isArray = Array.isArray;

// Reflect.* used by immutable-view.ts Proxy handler — cached so post-import
// poison cannot subvert the view (audit V2/P4).
export const _reflectGet = Reflect.get;
export const _reflectHas = Reflect.has;
export const _reflectGetOwnPropertyDescriptor = Reflect.getOwnPropertyDescriptor;
export const _reflectGetPrototypeOf = Reflect.getPrototypeOf;
export const _reflectIsExtensible = Reflect.isExtensible;

// Object.prototype own-keys fingerprint — captured at module load.
// Used by checkRuntimeIntegrity to detect prototype pollution injections
// such as `Object.prototype._leak = 'x'` (audit I5).
export const _objectPrototypeKeysFingerprint = _ownKeys(Object.prototype).length + ':' +
  _ownKeys(Object.prototype).map(k => typeof k === 'symbol' ? k.description ?? 'sym' : String(k)).sort().join(',');

// Self-test: verify cached builtins work correctly at import time.
// If builtins were tampered before import, this throws immediately.
// Covers every captured binding actually used by the library (audit P1).
const _selfTest = _freeze({ a: 1 });
if (!_isFrozen(_selfTest)) {
  throw new Error('constancy: Object.freeze or Object.isFrozen is compromised — cannot guarantee immutability');
}
if (_jsonStringify({ a: 1 }) !== '{"a":1}') {
  throw new Error('constancy: JSON.stringify is compromised — cannot guarantee fingerprint integrity');
}
if (_ownKeys(_selfTest).join(',') !== 'a') {
  throw new Error('constancy: Reflect.ownKeys is compromised — cannot guarantee traversal integrity');
}
if (_getOwnPropertyDescriptor(_selfTest, 'a')?.value !== 1) {
  throw new Error('constancy: Object.getOwnPropertyDescriptor is compromised');
}
if (_isArray([]) !== true) {
  throw new Error('constancy: Array.isArray is compromised');
}
if (typeof _structuredClone === 'function') {
  const _probe = _structuredClone({ a: 1 });
  if (_probe.a !== 1) {
    throw new Error('constancy: structuredClone is compromised');
  }
}
