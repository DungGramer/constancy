/**
 * Fuzz target for deepFreeze — tests that arbitrary nested structures
 * can be frozen without throwing unexpected errors.
 */
import { deepFreeze } from '../dist/index.js';

/**
 * @param {Uint8Array} data
 */
export function fuzz(data) {
  try {
    const str = new TextDecoder().decode(data);
    const obj = JSON.parse(str);
    if (typeof obj !== 'object' || obj === null) return;
    deepFreeze(obj);
    if (!Object.isFrozen(obj)) throw new Error('deepFreeze failed to freeze root');
  } catch (e) {
    if (e instanceof SyntaxError) return;
    if (e instanceof TypeError) return;
    throw e;
  }
}
