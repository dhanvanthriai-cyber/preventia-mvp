/**
 * index.ts — Public API of @preventia/shared
 * Re-exports all platform-agnostic logic.
 */

// Types
export * from './types';

// API clients
export * from './api/client';
export * from './api/appointments';
export * from './api/medications';

// Hooks
export { useAuth } from './hooks/useAuth';
export type { UseAuthResult } from './hooks/useAuth';
export { useDailySession } from './hooks/useDailySession';
