import { redirect } from 'next/navigation';

export default function LoginRedirect({ searchParams }: { searchParams: Record<string, string> }) {
  const role = searchParams.role;

  // Admin gets its own dedicated login page
  if (role === 'ADMIN') {
    const next = searchParams.next ? `?next=${searchParams.next}` : '';
    redirect(`/admin/login${next}`);
  }

  const roleParam = role ? `&role=${role}` : '';
  const next = searchParams.next ? `&next=${searchParams.next}` : '';
  redirect(`/?mode=login${roleParam}${next}`);
}
