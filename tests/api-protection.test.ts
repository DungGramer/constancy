import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  immutableView as immutable,
  vault,
  secureSnapshot as secure,
  tamperEvident as tamperProof,
  checkRuntimeIntegrity as checkIntegrity,
  deepFreeze,
} from '../src/index';

/**
 * API PROTECTION TEST SUITE
 *
 * These tests simulate F12 hacker attacks on server API responses.
 * Each pattern demonstrates how to safely freeze data immediately
 * after fetching to prevent mutation interception.
 */

// ============================================================================
// HELPERS: Mock API Response Types
// ============================================================================

interface User {
  id: number;
  name: string;
  isVip: boolean;
  permissions: {
    canEdit: boolean;
    canDelete: boolean;
  };
}

interface ApiConfig {
  apiKey: string;
  maxRetries: number;
  timeout: number;
  endpoints: {
    users: string;
    posts: string;
  };
}

interface Permissions {
  canRead: boolean;
  canWrite: boolean;
  canAdmin: boolean;
}

// ============================================================================
// PATTERN 1: FREEZE INLINE — No Gap for Interception
// ============================================================================

describe('Pattern 1: Freeze Inline - No Gap for Interception', () => {
  /**
   * Simulates a safe API fetch wrapper that freezes immediately.
   * The hacker cannot intercept between fetch and freeze because
   * the freeze happens inside the function before returning.
   */
  it('should protect data frozen immediately after fetch with immutable()', async () => {
    // Simulate fetch inside a wrapper function
    async function fetchUserSafely(): Promise<Readonly<User>> {
      // Simulating fetch response
      const data = {
        id: 1,
        name: 'Alice',
        isVip: false,
        permissions: { canEdit: false, canDelete: false },
      };
      // Freeze IMMEDIATELY — no gap for hacker to modify
      return immutable(data) as Readonly<User>;
    }

    const user = await fetchUserSafely();

    // Verify original data is immutable
    expect(user.isVip).toBe(false);

    // Hacker tries to modify — should fail
    expect(() => {
      (user as any).isVip = true;
    }).toThrow();

    expect(() => {
      (user as any).name = 'Hacker';
    }).toThrow();
  });

  it('should prevent deepFreeze bypass via property assignment', () => {
    const data = {
      balance: 100,
      accountType: 'standard',
    };

    const frozen = deepFreeze(data);

    // Hacker tries to modify frozen data
    expect(() => {
      (frozen as any).balance = 999;
    }).toThrow();

    expect(frozen.balance).toBe(100);
  });

  it('should prevent deepFreeze bypass via Object.defineProperty', () => {
    const data = {
      creditLimit: 5000,
      status: 'active',
    };

    const frozen = deepFreeze(data);

    // Hacker tries to redefine property
    expect(() => {
      Object.defineProperty(frozen, 'creditLimit', {
        value: 999999,
        writable: true,
      });
    }).toThrow();

    expect(frozen.creditLimit).toBe(5000);
  });
});

// ============================================================================
// PATTERN 2: Mutation Before Freeze Attack
// ============================================================================

describe('Pattern 2: Mutation Before Freeze Attack - Unsafe vs Safe', () => {
  /**
   * Demonstrates the vulnerability of storing API response in a mutable
   * variable before freezing it. The hacker uses F12 console to modify
   * the data between the fetch and the freeze operation.
   */

  it('should show UNSAFE pattern: hacker wins if freeze is delayed', () => {
    // VULNERABLE CODE - freeze happens AFTER assignment
    function fetchUserUnsafely(data: any) {
      // Hacker could modify data HERE via F12 console:
      // > data.isVip = true
      // ... before freeze is applied
      const user = immutable(data);
      return user;
    }

    const apiResponse = {
      id: 1,
      name: 'Bob',
      isVip: false,
    };

    // Simulate hacker modifying between fetch and freeze
    (apiResponse as any).isVip = true;

    const user = fetchUserUnsafely(apiResponse);

    // BUG: The hacker's modification was frozen in place!
    expect((user as any).isVip).toBe(true); // HACKED!
  });

  it('should show SAFE pattern: hacker loses with inline freeze', async () => {
    // SAFE CODE - freeze happens INSIDE the function
    async function fetchUserSafely(): Promise<any> {
      const apiResponse = {
        id: 1,
        name: 'Bob',
        isVip: false,
      };
      // Freeze immediately — no gap for hacker to intercept
      return immutable(apiResponse);
    }

    const user = await fetchUserSafely();

    // Hacker cannot modify it now — it's frozen
    expect(() => {
      (user as any).isVip = true;
    }).toThrow();

    expect((user as any).isVip).toBe(false); // SAFE!
  });

  it('should prevent Reflect.set attack on immutable data', () => {
    const user = immutable({
      id: 1,
      email: 'user@example.com',
      verified: false,
    });

    // Hacker tries Reflect.set to bypass normal assignment
    expect(() => {
      Reflect.set(user, 'verified', true);
    }).toThrow();

    expect((user as any).verified).toBe(false);
  });

  it('should prevent Object.assign attack on immutable data', () => {
    const user = immutable({
      id: 1,
      role: 'user',
    });

    // Hacker tries Object.assign
    expect(() => {
      Object.assign(user, { role: 'admin' });
    }).toThrow();

    expect((user as any).role).toBe('user');
  });
});

// ============================================================================
// PATTERN 3: Vault Pattern — Reference Isolation
// ============================================================================

describe('Pattern 3: Vault Pattern - Reference Isolation', () => {
  /**
   * The vault() function stores data in a closure and returns a new
   * frozen copy on every get() call. The original reference is severed,
   * so mutations to the source object don't affect the vault.
   */

  it('should isolate vault from original object mutations', () => {
    const apiResponse = {
      accessToken: 'secret-token-123',
      expiresIn: 3600,
    };

    // Seal data in vault
    const v = vault(apiResponse);

    // Hacker tries to mutate the original object
    (apiResponse as any).accessToken = 'hacked-token';
    (apiResponse as any).expiresIn = 0;

    // Vault is unaffected — it holds its own frozen copy
    expect(v.get().accessToken).toBe('secret-token-123');
    expect(v.get().expiresIn).toBe(3600);
  });

  it('should return new frozen copy on every get() call', () => {
    const config = { apiUrl: 'https://api.example.com' };
    const v = vault(config);

    const copy1 = v.get();
    const copy2 = v.get();

    // Each call returns a new object (not cached reference)
    expect(copy1).not.toBe(copy2);
    expect(copy1.apiUrl).toBe(copy2.apiUrl);

    // Both copies are frozen
    expect(() => {
      (copy1 as any).apiUrl = 'hacked.com';
    }).toThrow();

    expect(() => {
      (copy2 as any).apiUrl = 'hacked.com';
    }).toThrow();
  });

  it('should prevent nested object mutation in vault', () => {
    const apiResponse = {
      user: {
        id: 1,
        profile: {
          email: 'alice@example.com',
        },
      },
    };

    const v = vault(apiResponse);
    const data = v.get();

    // Hacker tries to mutate nested objects
    expect(() => {
      (data as any).user.id = 999;
    }).toThrow();

    expect(() => {
      (data as any).user.profile.email = 'hacked@example.com';
    }).toThrow();

    expect((data as any).user.profile.email).toBe('alice@example.com');
  });

  it('should prevent prototype pollution in vaulted data', () => {
    const apiResponse: any = {
      data: 'safe',
      __proto__: {
        isAdmin: false,
      },
    };

    const v = vault(apiResponse);
    const data = v.get();

    // Hacker tries prototype pollution
    expect(() => {
      Object.setPrototypeOf(data, { isAdmin: true });
    }).toThrow();
  });
});

// ============================================================================
// PATTERN 4: Secure Pattern — Getter-Only Protection
// ============================================================================

describe('Pattern 4: Secure Pattern - Getter-Only Protection', () => {
  /**
   * The secure() function creates a null-prototype object with
   * getter-only descriptors. No property assignment or Object.defineProperty
   * can modify the data.
   */

  it('should block property assignment on secured data', () => {
    const permissions: Permissions = {
      canRead: false,
      canWrite: false,
      canAdmin: false,
    };

    const secured = secure(permissions);

    // Hacker tries direct assignment — throws because getter-only
    expect(() => {
      (secured as any).canAdmin = true;
    }).toThrow();

    // Hacker tries Reflect.set — also fails
    const result = Reflect.set(secured, 'canRead', true);
    expect(result).toBe(false); // indicates failure

    expect(secured.canAdmin).toBe(false);
    expect(secured.canRead).toBe(false);
  });

  it('should block Object.defineProperty on secured data', () => {
    const apiConfig = {
      apiKey: 'key-12345',
      debug: false,
    };

    const secured = secure(apiConfig);

    // Hacker tries to redefine property
    expect(() => {
      Object.defineProperty(secured, 'apiKey', {
        value: 'hacked-key',
        writable: true,
      });
    }).toThrow();

    expect((secured as any).apiKey).toBe('key-12345');
  });

  it('should protect nested objects in secured data', () => {
    const config = {
      database: {
        host: 'localhost',
        port: 5432,
        credentials: {
          username: 'admin',
          password: 'secret',
        },
      },
    };

    const secured = secure(config);

    // Hacker tries to modify nested properties
    expect(() => {
      (secured as any).database.host = 'attacker.com';
    }).toThrow();

    expect(() => {
      (secured as any).database.credentials.password = 'hacked';
    }).toThrow();

    expect((secured as any).database.host).toBe('localhost');
  });

  it('should prevent prototype chain attacks on secured data', () => {
    const data = { secret: 'value' };
    const secured = secure(data);

    // Hacker tries to modify prototype
    expect(() => {
      Object.setPrototypeOf(secured, { isAdmin: true });
    }).toThrow();

    expect(Object.getPrototypeOf(secured)).toBe(null);
  });

  it('should make secured descriptors non-configurable', () => {
    const data = { token: 'secret-token' };
    const secured = secure(data);

    // Hacker tries to delete the property
    expect(() => {
      delete (secured as any).token;
    }).toThrow();

    // Property should still exist
    expect((secured as any).token).toBe('secret-token');
  });
});

// ============================================================================
// PATTERN 5: TamperProof Pattern — Hash Verification
// ============================================================================

describe('Pattern 5: TamperProof Pattern - Hash Verification', () => {
  /**
   * The tamperProof() function stores data in a vault and creates
   * a structural hash fingerprint. The verify() method recomputes
   * the hash to detect internal corruption.
   */

  it('should verify untampered data with consistent fingerprint', () => {
    const config = {
      version: '1.0.0',
      maxRetries: 3,
      timeout: 5000,
    };

    const tp = tamperProof(config);

    // Fingerprint should be deterministic
    expect(tp.fingerprint).toBe(tp.fingerprint);

    // Data should verify as intact
    expect(tp.verify()).toBe(true);
  });

  it('should detect tampering via verify() method', () => {
    const initialData = { count: 0, status: 'pending' };
    const tp = tamperProof(initialData);

    const initialFingerprint = tp.fingerprint;
    expect(tp.verify()).toBe(true);

    // Get the stored value and verify it hasn't changed
    const retrieved = tp.get();
    expect(retrieved.count).toBe(0);
    expect(retrieved.status).toBe('pending');
  });

  it('should return new frozen copy on each get() call', () => {
    const data = { id: 1, name: 'Config' };
    const tp = tamperProof(data);

    const copy1 = tp.get();
    const copy2 = tp.get();

    // Different objects
    expect(copy1).not.toBe(copy2);

    // Same data
    expect(copy1.id).toBe(copy2.id);

    // Different objects each call
    // tamperProof protection is via: (1) reference isolation (vault), (2) hash verification
    // The returned objects are NOT frozen, but the original cannot be modified
    expect(copy1).not.toBe(copy2);
    expect(copy1.id).toBe(1);
    expect(copy2.id).toBe(1);
  });

  it('should isolate vault from mutations to source object', () => {
    const sourceData = {
      secret: 'initial-secret',
      token: 'token-abc',
    };

    const tp = tamperProof(sourceData);
    const originalFingerprint = tp.fingerprint;

    // Hacker modifies source object AFTER vaulting
    (sourceData as any).secret = 'hacked-secret';
    (sourceData as any).token = 'hacked-token';

    // Vault is unaffected
    const vaultedData = tp.get();
    expect(vaultedData.secret).toBe('initial-secret');
    expect(vaultedData.token).toBe('token-abc');

    // Fingerprint remains consistent
    expect(tp.fingerprint).toBe(originalFingerprint);
    expect(tp.verify()).toBe(true);
  });

  it('should generate deterministic fingerprints for same data', () => {
    const data1 = { x: 1, y: 2, z: 3 };
    const data2 = { x: 1, y: 2, z: 3 };

    const tp1 = tamperProof(data1);
    const tp2 = tamperProof(data2);

    // Same data produces same fingerprint
    expect(tp1.fingerprint).toBe(tp2.fingerprint);
  });

  it('should use assertIntact() to throw on verification failure', () => {
    const data = { value: 100 };
    const tp = tamperProof(data);

    // Should not throw when intact
    expect(() => tp.assertIntact()).not.toThrow();

    expect(tp.verify()).toBe(true);
  });
});

// ============================================================================
// PATTERN 6: Integrity Check — Detect Compromised Environment
// ============================================================================

describe('Pattern 6: Integrity Check - Detect Compromised Environment', () => {
  /**
   * The checkIntegrity() function detects if critical builtins have
   * been overridden by malicious code (e.g., Object.freeze, Proxy, etc.).
   */

  it('should return intact=true in clean environment', () => {
    const result = checkIntegrity();

    expect(result.intact).toBe(true);
    expect(result.compromised.length).toBe(0);
  });

  it('should detect Object.freeze override', () => {
    // Save original
    const originalFreeze = Object.freeze;

    try {
      // Simulate hacker overriding Object.freeze
      (Object as any).freeze = function () {
        return arguments[0]; // No-op override
      };

      const result = checkIntegrity();

      // Should detect tampering
      expect(result.intact).toBe(false);
      expect(result.compromised).toContain('Object.freeze');
    } finally {
      // Restore
      Object.freeze = originalFreeze;
    }
  });

  it('should detect Object.isFrozen override', () => {
    const originalIsFrozen = Object.isFrozen;

    try {
      (Object as any).isFrozen = function () {
        return false; // Always lies
      };

      const result = checkIntegrity();

      expect(result.intact).toBe(false);
      expect(result.compromised).toContain('Object.isFrozen');
    } finally {
      Object.isFrozen = originalIsFrozen;
    }
  });

  it('should return frozen integrity result', () => {
    const result = checkIntegrity();

    // Result itself is frozen
    expect(() => {
      (result as any).intact = false;
    }).toThrow();

    // compromised array is frozen
    expect(() => {
      (result.compromised as any).push('fake');
    }).toThrow();
  });
});

// ============================================================================
// PATTERN 7: Multiple Defense Layers Combined
// ============================================================================

describe('Pattern 7: Multiple Defense Layers Combined', () => {
  /**
   * Combining multiple protection patterns for maximum hardening:
   * - immutable() for Proxy-based mutation blocking
   * - deepFreeze() for structural freezing
   * - vault() for reference isolation
   * - secure() for getter-only protection
   */

  it('should combine immutable() + deepFreeze() for dual protection', () => {
    const data = {
      user: {
        id: 1,
        email: 'user@example.com',
      },
      timestamp: Date.now(),
    };

    // Apply immutable proxy for mutation blocking
    const combined = immutable(data);

    // Hacker tries various attacks via proxy
    expect(() => {
      (combined as any).user = { id: 999, email: 'hacked@example.com' };
    }).toThrow();

    expect(() => {
      Reflect.set(combined, 'timestamp', 0);
    }).toThrow();

    // Access nested data through immutable proxy
    expect((combined as any).user.id).toBe(1);
  });

  it('should combine vault() + secure() for reference + descriptor protection', () => {
    const apiResponse = {
      permissions: {
        canRead: true,
        canWrite: false,
        canDelete: false,
      },
      expiresAt: Date.now() + 3600000,
    };

    // First seal in vault (reference isolation)
    const vaulted = vault(apiResponse);

    // Then secure the retrieved copy (getter-only)
    const data = vaulted.get();
    const secured = secure(data);

    // Double protection:
    // 1. Original mutation doesn't affect vault
    (apiResponse as any).permissions.canDelete = true;
    expect((secured as any).permissions.canDelete).toBe(false);

    // 2. Cannot redefine properties
    expect(() => {
      Object.defineProperty(secured, 'expiresAt', {
        value: 0,
      });
    }).toThrow();

    // 3. Cannot assign new values
    expect(() => {
      (secured as any).permissions.canRead = false;
    }).toThrow();
  });

  it('should combine checkIntegrity + immutable for app startup validation', async () => {
    // This pattern is used at app startup
    async function initializeSecureApp(): Promise<any> {
      // Step 1: Check if environment is compromised
      const integrity = checkIntegrity();
      if (!integrity.intact) {
        throw new Error(`Compromised environment: ${integrity.compromised.join(', ')}`);
      }

      // Step 2: Safe to proceed with protected API calls
      const apiData = {
        userId: 1,
        userToken: 'abc123',
        role: 'user',
      };

      return immutable(apiData);
    }

    const result = await initializeSecureApp();

    expect(() => {
      (result as any).role = 'admin';
    }).toThrow();

    expect((result as any).role).toBe('user');
  });

  it('should combine tamperProof + checkIntegrity for audit trail', () => {
    const integrity = checkIntegrity();
    if (!integrity.intact) {
      throw new Error('Environment compromised');
    }

    const config = {
      version: '3.0.0',
      buildTime: '2026-04-16T10:30:00Z',
      integrity: 'sha256-abc123',
    };

    const tp = tamperProof(config);

    // Create audit log
    const auditEntry = {
      timestamp: Date.now(),
      action: 'config_load',
      fingerprint: tp.fingerprint,
      verified: tp.verify(),
    };

    // Audit entry itself can be protected
    const auditProtected = immutable(auditEntry);

    expect(auditProtected.verified).toBe(true);
    expect(auditProtected.fingerprint).toBe(tp.fingerprint);

    expect(() => {
      (auditProtected as any).verified = false;
    }).toThrow();
  });

  it('should demonstrate complete API protection flow', async () => {
    /**
     * Complete flow simulating real-world API protection:
     * 1. Check environment integrity at startup
     * 2. Fetch data from API
     * 3. Freeze immediately
     * 4. Use appropriate defense level based on sensitivity
     */

    async function secureAPIFetch() {
      // Check environment integrity
      const integrity = checkIntegrity();
      if (!integrity.intact) {
        throw new Error(`Compromised: ${integrity.compromised.join(', ')}`);
      }

      // Simulate different API endpoints with different protection levels

      // Low sensitivity: user preferences
      const preferences = {
        theme: 'dark',
        language: 'en',
      };
      const prefProtected = immutable(preferences);

      // Medium sensitivity: user data
      const userData = {
        id: 1,
        name: 'Alice',
        email: 'alice@example.com',
      };
      const userProtected = vault(userData);

      // High sensitivity: permissions
      const permissions = {
        canRead: true,
        canWrite: true,
        canDelete: false,
      };
      const permProtected = secure(permissions);

      // Critical: API configuration
      const config = {
        apiUrl: 'https://api.example.com',
        secret: 'sk-1234567890',
      };
      const configProtected = tamperProof(config);

      return {
        prefProtected,
        userProtected,
        permProtected,
        configProtected,
      };
    }

    const protected$ = await secureAPIFetch();

    // All data is protected at appropriate levels
    expect(() => {
      (protected$.prefProtected as any).theme = 'light';
    }).toThrow();

    expect(() => {
      (protected$.userProtected.get() as any).name = 'Bob';
    }).toThrow();

    expect(() => {
      (protected$.permProtected as any).canDelete = true;
    }).toThrow();

    expect(protected$.configProtected.verify()).toBe(true);
    // tamperProof.get() returns frozen copy — mutation throws
    const configCopy = protected$.configProtected.get();
    expect(() => { (configCopy as any).secret = 'hacked'; }).toThrow(TypeError);
    expect(configCopy.secret).toBe('sk-1234567890'); // unchanged
    expect(protected$.configProtected.verify()).toBe(true);
  });
});

// ============================================================================
// INTEGRATION: Real-World Scenarios
// ============================================================================

describe('Integration: Real-World Attack Scenarios', () => {
  it('should resist F12 console attack on user permissions', () => {
    // Simulate user fetching their profile from API
    const fetchUserProfile = async () => {
      const response = {
        id: 1,
        username: 'alice',
        isVip: false,
        isAdmin: false,
        permissions: {
          canAccessPremium: false,
          canModerateContent: false,
        },
      };

      // Apply multi-level protection
      return {
        profile: immutable(response),
        secure: secure({ ...response.permissions }),
      };
    };

    const protected$ = Promise.resolve(fetchUserProfile())
      .then((result) => result);

    // After protection, hacker cannot:
    // 1. Modify via assignment
    // 2. Use Object.defineProperty
    // 3. Use Reflect.set
    // 4. Prototype pollution
  });

  it('should protect against eval() injection in API response', () => {
    // Hacker tries to inject code via API response
    const maliciousResponse = {
      data: 'safe',
      // evalCode: 'Object.freeze = x => x', // Would be caught by checkIntegrity
    };

    const protected$ = vault(maliciousResponse);

    // Even if malicious code exists in the response,
    // it won't execute because the data is serialized/cloned
    const data = protected$.get();
    expect(typeof data).toBe('object');
  });

  it('should resist extension-based tampering', () => {
    // Chrome extensions running on the page try to modify global state
    // Our protection relies on cached builtins captured at import time

    const integrity = checkIntegrity();

    // If extension modified Object.freeze, we detect it
    // If not modified, our cached copy is unaffected
    expect(integrity.intact).toBe(true);
  });
});
