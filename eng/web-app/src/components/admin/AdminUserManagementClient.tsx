'use client';

import { useDeferredValue, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { getTokenFromCookie } from '@/lib/auth';

type ManagedUser = {
  userId: number;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  lastActivityAt?: string | null;
  activityCount: number;
  activityLabel: string;
};

type AdminUserManagementClientProps = {
  users: ManagedUser[];
};

const ROLE_OPTIONS = ['RECIPIENT', 'DOCTOR', 'PHARMACIST', 'SPONSOR', 'ADMIN'] as const;

function formatDate(value?: string | null) {
  if (!value) return 'No activity yet';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No activity yet';
  return date.toLocaleString('en-IN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function humanizeRole(role: string) {
  return role
    .toLowerCase()
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

export default function AdminUserManagementClient({
  users,
}: Readonly<AdminUserManagementClientProps>) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | (typeof ROLE_OPTIONS)[number]>('ALL');
  const [draftRoles, setDraftRoles] = useState<Record<number, string>>(
    Object.fromEntries(users.map((user) => [user.userId, user.role])),
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [savingUserId, setSavingUserId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const deferredQuery = useDeferredValue(query);

  const visibleUsers = users.filter((user) => {
    const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;
    const haystack = `${user.name} ${user.email} ${user.role}`.toLowerCase();
    const matchesQuery = haystack.includes(deferredQuery.trim().toLowerCase());
    return matchesRole && matchesQuery;
  });

  function updateDraftRole(userId: number, role: string) {
    setDraftRoles((current) => ({ ...current, [userId]: role }));
  }

  function saveRole(userId: number) {
    const nextRole = draftRoles[userId];
    const token = getTokenFromCookie();
    if (!token) {
      setError('Your admin session expired. Sign in again to continue.');
      return;
    }

    setError(null);
    setSuccess(null);
    setSavingUserId(userId);

    void (async () => {
      try {
        const res = await fetch(`/api/v1/admin/users/${userId}/role`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ role: nextRole }),
        });

        if (!res.ok) {
          const text = await res.text();
          setError(text || `Role update failed (${res.status})`);
          return;
        }

        setSuccess('User role updated.');
        startTransition(() => {
          router.refresh();
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Role update failed.');
      } finally {
        setSavingUserId(null);
      }
    })();
  }

  return (
    <section className="space-y-4">
      <article className="rounded-2xl border border-[#E5E1DA] bg-[#FFFCF8] p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8A837A]">
              Directory controls
            </p>
            <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[#2D2D2D]">
              Search, filter, and reassign platform roles
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-[#6F6A63]">
              Use this surface to keep account ownership clean across patient, provider, pharmacist, sponsor, and admin roles.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name or email"
              className="min-w-[240px] rounded-full border border-[#E5E1DA] bg-white px-4 py-3 text-sm text-[#2D2D2D] outline-none transition focus:border-[#D7CDBE]"
            />
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value as 'ALL' | (typeof ROLE_OPTIONS)[number])}
              className="rounded-full border border-[#E5E1DA] bg-white px-4 py-3 text-sm text-[#2D2D2D] outline-none transition focus:border-[#D7CDBE]"
            >
              <option value="ALL">All roles</option>
              {ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>
                  {humanizeRole(role)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-[#EAC5BD] bg-[#FFF2EE] px-4 py-3 text-sm text-[#9C5C4D]">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="mt-4 rounded-2xl border border-[#D7E5D0] bg-[#EEF6EA] px-4 py-3 text-sm text-[#5E7E58]">
            {success}
          </div>
        ) : null}
      </article>

      <div className="grid gap-3">
        {visibleUsers.length === 0 ? (
          <article className="rounded-2xl border border-[#E5E1DA] bg-white p-5 shadow-sm">
            <p className="text-sm leading-7 text-[#6F6A63]">
              No accounts match the current filters.
            </p>
          </article>
        ) : visibleUsers.map((user) => {
          const isSaving = savingUserId === user.userId && isPending;
          const roleChanged = draftRoles[user.userId] !== user.role;

          return (
            <article
              key={user.userId}
              className="grid gap-4 rounded-2xl border border-[#E5E1DA] bg-white p-5 shadow-sm xl:grid-cols-[1.2fr_0.9fr_0.8fr]"
            >
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h4 className="text-base font-semibold text-[#2D2D2D]">{user.name}</h4>
                  <span className="rounded-full border border-[#E5E1DA] bg-[#F8F5F0] px-3 py-1 text-xs font-semibold text-[#6F6A63]">
                    {humanizeRole(user.role)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-[#4D4943]">{user.email}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[#8A837A]">
                  Joined {formatDate(user.createdAt)}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8A837A]">
                  Activity
                </p>
                <p className="text-sm font-medium text-[#2D2D2D]">{user.activityLabel}</p>
                <p className="text-sm leading-7 text-[#6F6A63]">
                  Last active {formatDate(user.lastActivityAt)}
                </p>
              </div>

              <div className="flex flex-col gap-3 xl:items-end">
                <div className="flex w-full flex-col gap-3 sm:flex-row xl:justify-end">
                  <select
                    value={draftRoles[user.userId] ?? user.role}
                    onChange={(event) => updateDraftRole(user.userId, event.target.value)}
                    className="rounded-full border border-[#E5E1DA] bg-[#FCFAF7] px-4 py-3 text-sm text-[#2D2D2D] outline-none transition focus:border-[#D7CDBE]"
                  >
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role} value={role}>
                        {humanizeRole(role)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => saveRole(user.userId)}
                    disabled={!roleChanged || isSaving}
                    className="rounded-full border border-[#D7CDBE] bg-[#F4EFE7] px-4 py-3 text-sm font-semibold text-[#2D2D2D] transition hover:bg-[#EEE7DD] disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    {isSaving ? 'Saving…' : 'Save role'}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
