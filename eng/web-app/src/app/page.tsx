import { redirect } from 'next/navigation';

/**
 * Root page — redirect to Doctor Portal by default.
 * TODO: replace with role-based routing once auth is wired up.
 */
export default function HomePage() {
  redirect('/doctor');
}
