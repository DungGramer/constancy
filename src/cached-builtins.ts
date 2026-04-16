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

// Self-test: verify cached builtins work correctly at import time.
// If builtins were tampered before import, this throws immediately.
const _selfTest = _freeze({});
if (!_isFrozen(_selfTest)) {
  throw new Error('constancy: Object.freeze or Object.isFrozen is compromised — cannot guarantee immutability');
}
