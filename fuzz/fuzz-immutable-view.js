/**
 * Fuzz target for immutableView — tests that arbitrary objects can be
 * wrapped without throwing, and that mutations are always blocked.
 */
import { immutableView } from '../dist/index.js';

/**
 * @param {Uint8Array} data
 */
export function fuzz(data) {
  try {
    const str = new TextDecoder().decode(data);
    const obj = JSON.parse(str);
    if (typeof obj !== 'object' || obj === null) return;
    const view = immutableView(obj);
    const keys = Object.keys(view);
    if (keys.length > 0) {
      try {
        view[keys[0]] = 'fuzzed';
        throw new Error('immutableView allowed mutation');
      } catch (e) {
        if (!(e instanceof TypeError)) throw e;
      }
    }
  } catch (e) {
    if (e instanceof SyntaxError) return;
    throw e;
  }
}
