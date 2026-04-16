import { describe, it, expect } from 'vitest';
import { checkRuntimeIntegrity as checkIntegrity } from '../src/index';

describe('checkIntegrity', () => {
  it('returns intact: true in clean environment', () => {
    const result = checkIntegrity();
    expect(result.intact).toBe(true);
    expect(result.compromised).toEqual([]);
  });

  it('result object is frozen', () => {
    const result = checkIntegrity();
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.compromised)).toBe(true);
  });

  it('detects Object.freeze override', () => {
    const original = Object.freeze;
    try {
      (Object as any).freeze = (x: any) => x;
      const result = checkIntegrity();
      expect(result.intact).toBe(false);
      expect(result.compromised).toContain('Object.freeze');
    } finally {
      Object.freeze = original;
    }
  });

  it('detects Object.isFrozen override', () => {
    const original = Object.isFrozen;
    try {
      (Object as any).isFrozen = () => true;
      const result = checkIntegrity();
      expect(result.intact).toBe(false);
      expect(result.compromised).toContain('Object.isFrozen');
    } finally {
      Object.isFrozen = original;
    }
  });
});
