import { redirect } from 'next/navigation';
export default function LoginRedirect({ searchParams }: { searchParams: Record<string, string> }) {
  const role = searchParams.role ? `&role=${searchParams.role}` : '';
  const next = searchParams.next ? `&next=${searchParams.next}` : '';
  redirect(`/?mode=login${role}${next}`);
}
