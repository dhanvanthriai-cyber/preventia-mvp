import { ShieldCheck, UserPlus, UserRoundCog } from 'lucide-react';
import AdminSectionPage from '@/components/admin/AdminSectionPage';
import AdminUserManagementClient from '@/components/admin/AdminUserManagementClient';
import {
  fetchAdminDashboard,
  formatAdminDateTime,
  getAdminSession,
} from '@/lib/adminServer';

export default async function AdminUsersPage() {
  const session = getAdminSession('/admin/users');
  const dashboard = await fetchAdminDashboard(session.token);
  const users = dashboard.unifiedUserManagement;

  return (
    <AdminSectionPage
      badge="Unified User Management"
      title="Every account in one operational directory."
      description={`User administration is synced with live platform roles as of ${formatAdminDateTime(dashboard.generatedAt)}.`}
      metrics={[
        { label: 'All accounts', value: String(users.counts.total), detail: 'Every user record currently present on the platform.' },
        { label: 'Patients', value: String(users.counts.patients), detail: 'Recipient accounts active in the platform user base.' },
        { label: 'Practitioners', value: String(users.counts.doctors), detail: 'Doctor accounts available for consultations and care plans.' },
        { label: 'Admins', value: String(users.counts.admins), detail: 'Internal operator accounts with full admin portal access.' },
      ]}
      spotlights={[
        {
          eyebrow: 'New accounts',
          title: users.recentUsers[0]
            ? `${users.recentUsers[0].name} is the newest visible user`
            : 'No recent user onboarding is visible yet',
          body: users.recentUsers[0]
            ? `${users.recentUsers[0].email} joined ${formatAdminDateTime(users.recentUsers[0].createdAt)} and currently holds the ${users.recentUsers[0].role.toLowerCase()} role.`
            : 'No account creation activity is available yet.',
          icon: UserPlus,
          tone: 'gold',
        },
        {
          eyebrow: 'Control',
          title: `${users.counts.pharmacists} pharmacy accounts are currently in the directory`,
          body: `${users.counts.sponsors} sponsor accounts also remain in the system for legacy care flows that still need supervision.`,
          icon: UserRoundCog,
          tone: 'sage',
        },
        {
          eyebrow: 'Access',
          title: users.counts.admins > 1 ? 'Admin redundancy is in place' : 'Admin access is currently concentrated',
          body: `${users.counts.admins} admin account${users.counts.admins === 1 ? '' : 's'} currently govern the platform. The role editor below can be used to rebalance access.`,
          icon: ShieldCheck,
          tone: 'neutral',
        },
      ]}
    >
      <AdminUserManagementClient users={users.directory} />
    </AdminSectionPage>
  );
}
