/**
 * /signup — Preventia account registration page
 */
import type { Metadata } from 'next';
import { Suspense } from 'react';
import SignupForm from './SignupForm';

export const metadata: Metadata = {
  title: 'Create Account — Preventia',
};

export default function SignupPage() {
  return (
    <Suspense fallback={<div style={{ padding: 32, color: '#6F6A63' }}>Loading…</div>}>
      <SignupForm />
    </Suspense>
  );
}
