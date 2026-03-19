import {
  HeartPulse,
  Scale,
  Sparkles,
  UserRoundCog,
  Video,
} from 'lucide-react';
import AdminSectionPage from '@/components/admin/AdminSectionPage';
import {
  fetchAdminDashboard,
  formatAdminDateTime,
  getAdminSession,
} from '@/lib/adminServer';

export default async function AdminOverviewPage() {
  const session = getAdminSession('/admin');
  const dashboard = await fetchAdminDashboard(session.token);
  const pulse = dashboard.pulseMetrics;
  const userCounts = dashboard.unifiedUserManagement.counts;
  const verification = dashboard.clinicalVerification.counts;
  const videoOps = dashboard.videoOperations;
  const paperTrail = dashboard.paperTrail;

  return (
    <AdminSectionPage
      badge="Pulse Metrics"
      title="One control surface across the full care platform."
      description={`Updated ${formatAdminDateTime(dashboard.generatedAt)} with live user, clinical verification, video, webhook, and audit signals from the backend.`}
      metrics={[
        {
          label: 'Live sessions',
          value: String(pulse.liveConsultations),
          detail: 'Appointments currently marked ACTIVE in the teleconsultation workflow.',
        },
        {
          label: 'Clinical queue',
          value: String(pulse.pendingPrescriptions + pulse.labExceptions),
          detail: `${pulse.pendingPrescriptions} prescriptions and ${pulse.labExceptions} lab exceptions need review.`,
        },
        {
          label: 'Webhook health',
          value: pulse.webhookFailuresLast24Hours > 0 ? `${pulse.webhookFailuresLast24Hours} alerts` : 'Stable',
          detail: `${videoOps.webhookMetrics.totalLast24Hours} webhook events were recorded in the last 24 hours.`,
        },
        {
          label: 'Payments today',
          value: String(pulse.paymentsCapturedToday),
          detail: `${paperTrail.counts.capturedPaymentsToday} captured payments have landed in the paper trail today.`,
        },
      ]}
      spotlights={[
        {
          eyebrow: 'Population',
          title: `${pulse.totalUsers} platform accounts are under active administration`,
          body: `${userCounts.patients} patients, ${userCounts.doctors} doctors, ${userCounts.pharmacists} pharmacists, and ${userCounts.admins} admins now sit inside the unified user surface.`,
          icon: HeartPulse,
          tone: 'sage',
        },
        {
          eyebrow: 'Verification',
          title: verification.slaBreaches > 0 ? 'Clinical review backlog needs attention' : 'Clinical review posture is steady',
          body: `${verification.pendingPrescriptions} pending prescriptions, ${verification.awaitingClarification} clarifications, and ${verification.coldChainBreaches} cold-chain breaches are currently surfaced.`,
          icon: Video,
          tone: 'gold',
        },
        {
          eyebrow: 'Governance',
          title: pulse.auditEventsToday > 0 ? 'Paper trail is actively recording the platform day' : 'Paper trail is quiet',
          body: `${paperTrail.counts.prescriptionEventsToday} prescription events, ${paperTrail.counts.inventoryEventsToday} inventory changes, and ${paperTrail.counts.webhookEventsToday} webhook logs were captured today.`,
          icon: Scale,
          tone: 'neutral',
        },
      ]}
    >
      <section className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
        <article className="rounded-2xl border border-[#E5E1DA] bg-[#FFFCF8] p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8A837A]">
                Today&apos;s watchlist
              </p>
              <h3 className="mt-3 text-xl font-semibold tracking-[-0.03em] text-[#2D2D2D]">
                Priorities for the admin team
              </h3>
            </div>
            <div className="inline-flex rounded-full border border-[#E5E1DA] bg-[#F5EEE2] px-3 py-1 text-xs font-semibold text-[#8E7342]">
              Live updates
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {pulse.watchlist.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-[#ECE6DE] bg-white p-4 shadow-sm"
              >
                <p className="text-sm leading-7 text-[#4D4943]">{item}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-[#E5E1DA] bg-[#FFFCF8] p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8A837A]">
            Module health
          </p>
          <div className="mt-5 space-y-4">
            {[
              {
                title: 'Unified User Management',
                body: `${dashboard.unifiedUserManagement.recentUsers.length} recently created accounts are ready for review.`,
              },
              {
                title: 'Clinical Verification',
                body: `${dashboard.clinicalVerification.prescriptions.length} prescriptions and ${dashboard.clinicalVerification.labOrders.length} lab orders are in the current queue.`,
              },
              {
                title: 'Video Ops & Webhooks',
                body: `${dashboard.videoOperations.liveAppointments.length} live rooms and ${dashboard.videoOperations.recentWebhookEvents.length} recent webhook events are in view.`,
              },
            ].map((item, index) => {
              const icons = [UserRoundCog, Sparkles, Video] as const;
              const Icon = icons[index % icons.length];
              return (
                <div
                  key={item.title}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-[#ECE6DE] bg-white px-4 py-4 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F4EFE7] text-[#6D675F]">
                      <Icon className="h-4 w-4" strokeWidth={1.8} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#4D4943]">{item.title}</p>
                      <p className="text-sm leading-7 text-[#6F6A63]">{item.body}</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-[#2D2D2D]">Open</span>
                </div>
              );
            })}
          </div>
        </article>
      </section>
    </AdminSectionPage>
  );
}
