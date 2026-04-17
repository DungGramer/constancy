import {
  _freeze, _isFrozen,
  _getOwnPropertyDescriptor, _defineProperty,
  _create, _ownKeys, _isView, _Proxy,
  _structuredClone, _jsonStringify, _isArray,
  _reflectGet, _reflectHas, _reflectGetOwnPropertyDescriptor,
  _reflectGetPrototypeOf, _reflectIsExtensible,
  _objectPrototypeKeysFingerprint,
  _fingerprintSort,
} from './cached-builtins';

declare function structuredClone<T>(value: T): T;

export interface IntegrityResult {
  readonly intact: boolean;
  readonly compromised: readonly string[];
}

// Table-driven builtin checks — keeps checkRuntimeIntegrity() below SonarCloud's
// cognitive-complexity threshold (audit I2/I5).
const BUILTIN_CHECKS: readonly [string, () => boolean][] = [
  ['Object.freeze', () => Object.freeze !== _freeze],
  ['Object.isFrozen', () => Object.isFrozen !== _isFrozen],
  ['Object.getOwnPropertyDescriptor', () => Object.getOwnPropertyDescriptor !== _getOwnPropertyDescriptor],
  ['Object.defineProperty', () => Object.defineProperty !== _defineProperty],
  ['Object.create', () => Object.create !== _create],
  ['Reflect.ownKeys', () => Reflect.ownKeys !== _ownKeys],
  ['ArrayBuffer.isView', () => ArrayBuffer.isView !== _isView],
  ['Proxy', () => Proxy !== _Proxy],
  ['Reflect', () => typeof Reflect !== 'object' || Reflect === null],
  ['structuredClone', () => typeof structuredClone === 'function' && structuredClone !== _structuredClone],
  ['JSON.stringify', () => JSON.stringify !== _jsonStringify],
  ['Array.isArray', () => Array.isArray !== _isArray],
  ['Reflect.get', () => Reflect.get !== _reflectGet],
  ['Reflect.has', () => Reflect.has !== _reflectHas],
  ['Reflect.getOwnPropertyDescriptor', () => Reflect.getOwnPropertyDescriptor !== _reflectGetOwnPropertyDescriptor],
  ['Reflect.getPrototypeOf', () => Reflect.getPrototypeOf !== _reflectGetPrototypeOf],
  ['Reflect.isExtensible', () => Reflect.isExtensible !== _reflectIsExtensible],
];

function computeObjectPrototypeFingerprint(): string {
  const keys = _ownKeys(Object.prototype);
  const normalized = keys.map(k =>
    typeof k === 'symbol' ? k.description ?? 'sym' : String(k)
  ).sort(_fingerprintSort);
  return keys.length + ':' + normalized.join(',');
}

/**
 * Check if critical JS builtins have been tampered with since module load.
 * Compares current global references to the cached copies captured at import time.
 *
 * Use at app startup or before critical operations to detect
 * prototype override attacks (e.g. `Object.freeze = x => x`).
 *
 * @returns Frozen result with `intact` flag and list of compromised builtins
 */
export function checkRuntimeIntegrity(): IntegrityResult {
  const compromised: string[] = BUILTIN_CHECKS
    .filter(([, check]) => check())
    .map(([name]) => name);

  if (computeObjectPrototypeFingerprint() !== _objectPrototypeKeysFingerprint) {
    compromised.push('Object.prototype');
  }

  return _freeze({ intact: compromised.length === 0, compromised: _freeze(compromised) });
}
