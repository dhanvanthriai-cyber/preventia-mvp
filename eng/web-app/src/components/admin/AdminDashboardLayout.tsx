'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  HeartPulse,
  LogOut,
  ScrollText,
  UserSquare2,
  Video,
  ShieldCheck,
} from 'lucide-react';

type AdminDashboardLayoutProps = {
  children: ReactNode;
  profileName: string;
  profileLabel: string;
};

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const navItems: NavItem[] = [
  { href: '/admin', label: 'Pulse Metrics', icon: HeartPulse },
  { href: '/admin/users', label: 'User Management', icon: UserSquare2 },
  { href: '/admin/clinical-verification', label: 'Clinical Verification', icon: ShieldCheck },
  { href: '/admin/video-ops', label: 'Video Ops', icon: Video },
  { href: '/admin/audit-logs', label: 'Paper Trail', icon: ScrollText },
];

function initialsFromName(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
  return initials || 'AU';
}

export default function AdminDashboardLayout({
  children,
  profileName,
  profileLabel,
}: Readonly<AdminDashboardLayoutProps>) {
  const pathname = usePathname();
  const initials = initialsFromName(profileName);

  return (
    <div className="min-h-full bg-[#F9F8F6] px-4 pb-10 md:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-6 lg:flex-row">
        <aside className="w-full shrink-0 rounded-2xl border border-[#E5E1DA] bg-white/95 p-5 shadow-sm lg:sticky lg:top-24 lg:h-[calc(100vh-132px)] lg:w-[280px] flex flex-col">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F4EFE7] text-[#2D2D2D]">
              <Activity className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div className="space-y-1">
              <div className="inline-flex rounded-full border border-[#E5E1DA] bg-[#F8F5F0] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7B746C]">
                Admin portal
              </div>
              <p className="text-sm leading-6 text-[#6F6A63]">
                Platform control across care, fulfillment, video, and audit systems.
              </p>
            </div>
          </div>

          <nav className="grid gap-2">
            {navItems.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  prefetch={false}
                  className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? 'border-[#D8D0C6] bg-[#F4EFE7] text-[#2D2D2D] shadow-sm'
                      : 'border-transparent bg-transparent text-[#5F5A53] hover:border-[#EEE8DF] hover:bg-[#FCFAF7]'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={1.8} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Sign-out — pinned to sidebar bottom */}
          <div className="mt-auto pt-6 border-t border-[#EEE8DF]">
            <a
              href="/api/logout"
              className="flex items-center gap-3 rounded-2xl border border-transparent px-4 py-3 text-sm font-medium text-[#B05A4A] transition hover:border-[#F2DDD9] hover:bg-[#FDF6F5]"
            >
              <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.8} />
              <span>Sign out</span>
            </a>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <header className="flex flex-col gap-4 rounded-2xl border border-[#E5E1DA] bg-white/95 px-5 py-5 shadow-sm md:flex-row md:items-center md:justify-between md:px-6">
            <div className="space-y-2">
              <div className="inline-flex rounded-full border border-[#E5E1DA] bg-[#F8F5F0] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7B746C]">
                Admin workspace
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-[-0.03em] text-[#2D2D2D] md:text-[2rem]">
                  Admin Portal
                </h1>
                <p className="mt-1 text-sm leading-6 text-[#6F6A63] md:text-[15px]">
                  A full-platform control surface for user operations, clinical verification, video health, and paper trails.
                </p>
              </div>
            </div>

            <div className="inline-flex items-center gap-3 self-start rounded-full border border-[#E5E1DA] bg-[#FCFAF7] px-3 py-2 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EEE7DE] text-sm font-semibold text-[#2D2D2D]">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#2D2D2D]">{profileName}</p>
                <p className="truncate text-xs uppercase tracking-[0.18em] text-[#8B847B]">
                  {profileLabel}
                </p>
              </div>
              <a
                href="/api/logout"
                title="Sign out"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E5E1DA] bg-white text-[#B05A4A] transition hover:border-[#F2DDD9] hover:bg-[#FDF6F5]"
              >
                <LogOut className="h-4 w-4" strokeWidth={1.75} />
              </a>
            </div>
          </header>

          <main className="min-h-[70vh] rounded-2xl border border-[#E5E1DA] bg-white/90 p-5 shadow-sm md:p-6 xl:p-7">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
