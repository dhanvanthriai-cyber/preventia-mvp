import { Gauge, Headphones, Signal, Video } from 'lucide-react';
import AdminSectionPage from '@/components/admin/AdminSectionPage';
import {
  fetchAdminDashboard,
  formatAdminDateTime,
  getAdminSession,
  humanizeEnum,
} from '@/lib/adminServer';

export default async function AdminVideoOpsPage() {
  const session = getAdminSession('/admin/video-ops');
  const dashboard = await fetchAdminDashboard(session.token);
  const videoOps = dashboard.videoOperations;
  const sessionFeed = [...videoOps.liveAppointments, ...videoOps.upcomingAppointments]
    .sort((left, right) => new Date(left.startTime).getTime() - new Date(right.startTime).getTime())
    .slice(0, 6);

  return (
    <AdminSectionPage
      badge="Video Ops"
      title="Video reliability and webhook delivery in one frame."
      description={`Video operations now reflect room state and webhook telemetry from the backend, refreshed ${formatAdminDateTime(dashboard.generatedAt)}.`}
      metrics={[
        { label: 'Active rooms', value: String(videoOps.metrics.liveConsultations), detail: 'Live appointments currently marked ACTIVE.' },
        { label: 'Today’s consults', value: String(videoOps.metrics.scheduledToday), detail: 'Scheduled or active appointments on today’s calendar.' },
        { label: 'Webhook failures', value: String(videoOps.webhookMetrics.failedLast24Hours), detail: 'Webhook events that failed validation or processing in the last 24 hours.' },
        { label: 'Provisioning gaps', value: String(videoOps.metrics.missingRoomLinks), detail: 'Scheduled or live sessions missing a room URL.' },
      ]}
      spotlights={[
        {
          eyebrow: 'Reliability',
          title: videoOps.metrics.liveConsultations > 0 ? 'Live consultation load is visible' : 'No live rooms are open right now',
          body: `${videoOps.metrics.liveConsultations} active rooms are currently in session, with ${videoOps.metrics.scheduledToday} total consults in today’s flow.`,
          icon: Signal,
          tone: 'sage',
        },
        {
          eyebrow: 'Support',
          title: videoOps.metrics.missingRoomLinks > 0 ? 'A few room issues need triage' : 'No room-link escalations are visible',
          body: videoOps.metrics.missingRoomLinks > 0
            ? `${videoOps.metrics.missingRoomLinks} sessions are still missing room provisioning and should be reviewed before start time.`
            : 'All currently tracked sessions have room links provisioned.',
          icon: Headphones,
          tone: 'gold',
        },
        {
          eyebrow: 'Performance',
          title: videoOps.webhookMetrics.failedLast24Hours > 0 ? 'Webhook delivery needs attention' : 'Webhook delivery is steady',
          body: `${videoOps.webhookMetrics.totalLast24Hours} webhook events arrived in the last 24 hours, with ${videoOps.webhookMetrics.invalidSignaturesLast24Hours} invalid signatures recorded.`,
          icon: Gauge,
          tone: 'neutral',
        },
      ]}
    >
      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-2xl border border-[#E5E1DA] bg-[#FFFCF8] p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F4EFE7] text-[#6D675F]">
              <Video className="h-5 w-5" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8A837A]">
                Session feed
              </p>
              <h3 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[#2D2D2D]">
                Live and upcoming room activity
              </h3>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {sessionFeed.length === 0 ? (
              <div className="rounded-2xl border border-[#ECE6DE] bg-white p-4 shadow-sm">
                <p className="text-sm leading-7 text-[#6F6A63]">No live or upcoming sessions are available yet.</p>
              </div>
            ) : sessionFeed.map((item) => (
              <div key={item.appointmentId} className="rounded-2xl border border-[#ECE6DE] bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#2D2D2D]">
                      {item.patientName} with Dr. {item.doctorName}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[#8A837A]">
                      {formatAdminDateTime(item.startTime)}
                      {item.roomName ? ` · ${item.roomName}` : ''}
                    </p>
                  </div>
                  <span className="rounded-full border border-[#E5E1DA] bg-[#F8F5F0] px-3 py-1 text-xs font-semibold text-[#6F6A63]">
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-[#E5E1DA] bg-[#FFFCF8] p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8A837A]">
            Webhook feed
          </p>
          <div className="mt-5 space-y-3">
            {videoOps.recentWebhookEvents.length === 0 ? (
              <div className="rounded-2xl border border-[#ECE6DE] bg-white p-4 shadow-sm">
                <p className="text-sm leading-7 text-[#6F6A63]">No webhook events have been recorded yet.</p>
              </div>
            ) : videoOps.recentWebhookEvents.map((event) => (
              <div key={event.eventId} className="rounded-2xl border border-[#ECE6DE] bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#2D2D2D]">
                      {event.provider} · {humanizeEnum(event.eventType)}
                    </p>
                    <p className="mt-1 text-sm leading-7 text-[#6F6A63]">
                      {event.payloadSummary ?? event.endpoint}
                    </p>
                  </div>
                  <span className="rounded-full border border-[#E5E1DA] bg-[#F8F5F0] px-3 py-1 text-xs font-semibold text-[#6F6A63]">
                    HTTP {event.statusCode}
                  </span>
                </div>
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[#8A837A]">
                  {formatAdminDateTime(event.createdAt)}
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </AdminSectionPage>
  );
}
