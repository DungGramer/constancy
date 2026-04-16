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
