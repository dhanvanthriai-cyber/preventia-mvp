import type { ReactNode } from 'react';
import AdminDashboardLayout from '@/components/admin/AdminDashboardLayout';
import { getAdminSession } from '@/lib/adminServer';

export default function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  const session = getAdminSession('/admin');

  return (
    <AdminDashboardLayout profileName={session.name} profileLabel="Platform admin">
      {children}
    </AdminDashboardLayout>
  );
}
