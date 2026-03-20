import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AddFamilyMemberForm from '@/components/AddFamilyMemberForm';

export const metadata: Metadata = {
  title: 'Add Family Member — Preventia',
};

export default function AddFamilyMemberPage() {
  const cookieStore = cookies();
  const token = cookieStore.get('preventia_token')?.value;
  if (!token) redirect('/login?next=/patient/family/add');
  return <AddFamilyMemberForm />;
}
