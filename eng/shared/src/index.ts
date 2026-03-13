/**
 * index.ts — Public API of @dhanvanthri/shared
 * Re-exports all platform-agnostic logic.
 */

// Types
export * from './types';

// API clients
export * from './api/client';
export * from './api/appointments';
export * from './api/medications';

// Hooks
export * from './hooks/useAuth';
export * from './hooks/useDailySession';
