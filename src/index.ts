// Freeze (in-place)
export { freezeShallow } from './freeze-shallow';
export { freezeShallow as default } from './freeze-shallow';
export { deepFreeze } from './deep-freeze';

// View (Proxy, no clone)
export { immutableView, isImmutableView, assertImmutableView } from './immutable-view';
export { immutableMapView, immutableSetView } from './immutable-collection-views';

// Snapshot (clone + freeze)
export { snapshot, lock } from './snapshot';
export { secureSnapshot } from './secure-snapshot';
export { tamperEvident } from './tamper-evident';
export type { TamperEvidentVault } from './tamper-evident';

// Isolation (closure + copy-on-read)
export { vault } from './vault';
export type { Vault } from './vault';

// Verification
export { isDeepFrozen, assertDeepFrozen } from './verification';
export { checkRuntimeIntegrity } from './check-runtime-integrity';
export type { IntegrityResult } from './check-runtime-integrity';

// Types
export type { DeepReadonly, Freezable } from './types';
