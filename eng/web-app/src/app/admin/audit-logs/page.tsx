import { FileClock, LockKeyhole, ScrollText, ShieldCheck } from 'lucide-react';
import AdminSectionPage from '@/components/admin/AdminSectionPage';
import {
  fetchAdminDashboard,
  formatAdminDateTime,
  getAdminSession,
  humanizeEnum,
} from '@/lib/adminServer';

export default async function AdminAuditLogsPage() {
  const session = getAdminSession('/admin/audit-logs');
  const dashboard = await fetchAdminDashboard(session.token);
  const paperTrail = dashboard.paperTrail;

  return (
    <AdminSectionPage
      badge="Paper Trail"
      title="Audit visibility with room to breathe."
      description={`Audit metrics now blend prescription, inventory, webhook, and payment trails as of ${formatAdminDateTime(dashboard.generatedAt)}.`}
      metrics={[
        { label: 'Prescription events', value: String(paperTrail.counts.prescriptionEventsToday), detail: 'Prescription audit events recorded since the start of the day.' },
        { label: 'Inventory events', value: String(paperTrail.counts.inventoryEventsToday), detail: 'Inventory change entries logged today.' },
        { label: 'Webhook events', value: String(paperTrail.counts.webhookEventsToday), detail: 'Webhook events recorded in the paper trail today.' },
        { label: 'Captured payments', value: String(paperTrail.counts.capturedPaymentsToday), detail: 'Captured payments written into the audit feed today.' },
      ]}
      spotlights={[
        {
          eyebrow: 'Integrity',
          title: paperTrail.counts.prescriptionEventsToday > 0 ? 'The prescription trail is active today' : 'No prescription audit events have landed today yet',
          body: `${paperTrail.counts.prescriptionEventsToday} prescription events and ${paperTrail.counts.inventoryEventsToday} inventory events have already been recorded today.`,
          icon: ShieldCheck,
          tone: 'sage',
        },
        {
          eyebrow: 'Review',
          title: paperTrail.counts.webhookEventsToday > 0 ? 'Webhook and system trails are visible' : 'System audit feed is still warming up',
          body: `${paperTrail.counts.webhookEventsToday} webhook events and ${paperTrail.counts.capturedPaymentsToday} captured payments are currently visible in the day’s paper trail.`,
          icon: FileClock,
          tone: 'gold',
        },
        {
          eyebrow: 'Security',
          title: 'Audit posture is now platform-wide',
          body: 'The paper trail is no longer prescription-only. Inventory, webhooks, and payment capture all now contribute to the operational record.',
          icon: LockKeyhole,
          tone: 'neutral',
        },
      ]}
    >
      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-2xl border border-[#E5E1DA] bg-[#FFFCF8] p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EEF3EA] text-[#657C62]">
              <ScrollText className="h-5 w-5" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8A837A]">
                Recent events
              </p>
              <h3 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[#2D2D2D]">
                Latest platform audit actions
              </h3>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {paperTrail.recentEvents.length === 0 ? (
              <div className="rounded-2xl border border-[#ECE6DE] bg-white p-4 shadow-sm">
                <p className="text-sm leading-7 text-[#6F6A63]">No recent audit events are available yet.</p>
              </div>
            ) : paperTrail.recentEvents.map((event) => (
              <div key={`${event.source}-${event.createdAt}-${event.action}`} className="rounded-2xl border border-[#ECE6DE] bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#2D2D2D]">
                      {humanizeEnum(event.action)} · {event.subject}
                    </p>
                    <p className="mt-1 text-sm text-[#4D4943]">{event.actorName}</p>
                  </div>
                  <span className="text-xs uppercase tracking-[0.18em] text-[#8A837A]">
                    {formatAdminDateTime(event.createdAt)}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-[#6F6A63]">
                  {event.detail}
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[#8A837A]">
                  {humanizeEnum(event.source)}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-[#E5E1DA] bg-[#FFFCF8] p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8A837A]">
            Review notes
          </p>
          <div className="mt-5 space-y-3">
            {[
              `${paperTrail.counts.prescriptionEventsToday} prescription audit entries have been captured today.`,
              `${paperTrail.counts.inventoryEventsToday} inventory actions and ${paperTrail.counts.webhookEventsToday} webhook events are visible in the current trail.`,
              paperTrail.counts.capturedPaymentsToday > 0
                ? `${paperTrail.counts.capturedPaymentsToday} payment captures were recorded in the paper trail today.`
                : 'No captured payment events are in the paper trail yet today.',
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-[#ECE6DE] bg-white p-4 shadow-sm">
                <p className="text-sm leading-7 text-[#6F6A63]">{item}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </AdminSectionPage>
  );
}
