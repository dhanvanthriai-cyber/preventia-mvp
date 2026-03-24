import { redirect } from 'next/navigation';
export default function SignupRedirect({ searchParams }: { searchParams: Record<string, string> }) {
  const role = searchParams.role ? `&role=${searchParams.role}` : '';
  redirect(`/?mode=register${role}`);
}
