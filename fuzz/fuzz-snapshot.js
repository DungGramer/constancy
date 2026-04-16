/**
 * Fuzz target for snapshot — tests that arbitrary cloneable values
 * produce frozen deep copies without unexpected errors.
 */
import { snapshot, isDeepFrozen } from '../dist/index.js';

/**
 * @param {Uint8Array} data
 */
export function fuzz(data) {
  try {
    const str = new TextDecoder().decode(data);
    const val = JSON.parse(str);
    if (typeof val !== 'object' || val === null) return;
    const frozen = snapshot(val);
    if (!isDeepFrozen(frozen)) throw new Error('snapshot result is not deeply frozen');
  } catch (e) {
    if (e instanceof SyntaxError) return;
    if (e instanceof TypeError) return;
    throw e;
  }
}
