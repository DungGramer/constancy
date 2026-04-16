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

describe('checkIntegrity extended checks', () => {
  it('should detect tampered Object.getOwnPropertyDescriptor', () => {
    const original = Object.getOwnPropertyDescriptor;
    try {
      Object.getOwnPropertyDescriptor = (() => undefined) as any;
      const result = checkIntegrity();
      expect(result.intact).toBe(false);
      expect(result.compromised).toContain('Object.getOwnPropertyDescriptor');
    } finally {
      Object.getOwnPropertyDescriptor = original;
    }
  });

  it('should detect tampered Object.defineProperty', () => {
    const original = Object.defineProperty;
    try {
      Object.defineProperty = (() => ({})) as any;
      const result = checkIntegrity();
      expect(result.intact).toBe(false);
      expect(result.compromised).toContain('Object.defineProperty');
    } finally {
      Object.defineProperty = original;
    }
  });

  it('should detect tampered Object.create', () => {
    const original = Object.create;
    try {
      Object.create = (() => ({})) as any;
      const result = checkIntegrity();
      expect(result.intact).toBe(false);
      expect(result.compromised).toContain('Object.create');
    } finally {
      Object.create = original;
    }
  });

  it('should detect tampered Reflect.ownKeys', () => {
    const original = Reflect.ownKeys;
    try {
      Reflect.ownKeys = (() => []) as any;
      const result = checkIntegrity();
      expect(result.intact).toBe(false);
      expect(result.compromised).toContain('Reflect.ownKeys');
    } finally {
      Reflect.ownKeys = original;
    }
  });

  it('should detect tampered ArrayBuffer.isView', () => {
    const original = ArrayBuffer.isView;
    try {
      ArrayBuffer.isView = (() => false) as any;
      const result = checkIntegrity();
      expect(result.intact).toBe(false);
      expect(result.compromised).toContain('ArrayBuffer.isView');
    } finally {
      ArrayBuffer.isView = original;
    }
  });

  it('should report intact when all builtins are original', () => {
    const result = checkIntegrity();
    expect(result.intact).toBe(true);
    expect(result.compromised).toHaveLength(0);
  });
});
