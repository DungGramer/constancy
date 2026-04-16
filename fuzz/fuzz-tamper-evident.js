/**
 * Fuzz target for tamperEvident — tests that arbitrary values produce
 * consistent fingerprints and always verify as intact.
 */
import { tamperEvident } from '../dist/index.js';

/**
 * @param {Uint8Array} data
 */
export function fuzz(data) {
  try {
    const str = new TextDecoder().decode(data);
    const val = JSON.parse(str);
    const vault = tamperEvident(val);
    if (!vault.verify()) throw new Error('tamperEvident verify failed on fresh vault');
    vault.assertIntact();
    vault.get();
  } catch (e) {
    if (e instanceof SyntaxError) return;
    if (e instanceof TypeError) return;
    throw e;
  }
}
