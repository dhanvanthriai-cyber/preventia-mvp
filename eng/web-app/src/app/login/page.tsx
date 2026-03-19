/**
 * /login — Preventia portal login page
 *
 * Server component wrapper — LoginForm is the 'use client' leaf.
 * Suspense boundary is required because LoginForm calls useSearchParams().
 */
import type { Metadata } from 'next';
import { Suspense } from 'react';
import LoginForm from './LoginForm';

export const metadata: Metadata = {
  title: 'Sign In — Preventia Portal',
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ padding: 32, color: '#6F6A63' }}>Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
