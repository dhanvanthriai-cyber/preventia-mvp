/**
 * /login — Dhanvanthri portal login page
 *
 * Server component wrapper — LoginForm is the 'use client' leaf.
 * Suspense boundary is required because LoginForm calls useSearchParams().
 */
import type { Metadata } from 'next';
import { Suspense } from 'react';
import LoginForm from './LoginForm';

export const metadata: Metadata = {
  title: 'Sign In — Dhanvanthri Portal',
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ fontFamily: 'monospace', padding: 32 }}>Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
