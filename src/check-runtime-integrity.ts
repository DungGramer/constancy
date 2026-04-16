import { _freeze, _isFrozen } from './cached-builtins';

export interface IntegrityResult {
  readonly intact: boolean;
  readonly compromised: readonly string[];
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
  const compromised: string[] = [];

  if (Object.freeze !== _freeze) compromised.push('Object.freeze');
  if (Object.isFrozen !== _isFrozen) compromised.push('Object.isFrozen');
  if (typeof Proxy !== 'function') compromised.push('Proxy');
  if (typeof Reflect !== 'object' || Reflect === null) compromised.push('Reflect');

  return _freeze({ intact: compromised.length === 0, compromised: _freeze(compromised) });
}
