import { ActivitySquare, FlaskConical, ShieldCheck, Stethoscope } from 'lucide-react';
import AdminSectionPage from '@/components/admin/AdminSectionPage';
import {
  fetchAdminDashboard,
  formatAdminDateTime,
  getAdminSession,
  humanizeEnum,
} from '@/lib/adminServer';

export default async function AdminClinicalVerificationPage() {
  const session = getAdminSession('/admin/clinical-verification');
  const dashboard = await fetchAdminDashboard(session.token);
  const verification = dashboard.clinicalVerification;

  return (
    <AdminSectionPage
      badge="Clinical Verification"
      title="Prescription review and lab exceptions in one queue."
      description={`Clinical verification is aggregated from prescription workflow and lab order state as of ${formatAdminDateTime(dashboard.generatedAt)}.`}
      metrics={[
        { label: 'Pending prescriptions', value: String(verification.counts.pendingPrescriptions), detail: 'Prescription PDFs waiting for pharmacist review.' },
        { label: 'Clarifications', value: String(verification.counts.awaitingClarification), detail: 'Items routed back to the doctor for clinical clarification.' },
        { label: 'SLA breaches', value: String(verification.counts.slaBreaches), detail: 'Prescription items older than the 4-hour verification window.' },
        { label: 'Cold-chain breaches', value: String(verification.counts.coldChainBreaches), detail: 'Lab orders flagged for cold-chain handling exceptions.' },
      ]}
      spotlights={[
        {
          eyebrow: 'Queue',
          title: verification.prescriptions.length > 0 ? 'Prescription verification is active' : 'Prescription queue is currently clear',
          body: `${verification.prescriptions.length} prescription items are currently surfaced in the admin review queue.`,
          icon: ShieldCheck,
          tone: 'sage',
        },
        {
          eyebrow: 'Labs',
          title: verification.labOrders.some((item) => item.requiresAttention) ? 'Lab exception handling needs attention' : 'Lab order flow is steady',
          body: `${verification.counts.openLabOrders} lab orders remain open, including ${verification.counts.coldChainBreaches} cold-chain breaches.`,
          icon: FlaskConical,
          tone: 'gold',
        },
        {
          eyebrow: 'Clinical flow',
          title: verification.counts.awaitingClarification > 0 ? 'Doctor follow-through is blocking some items' : 'Doctor clarifications are under control',
          body: `${verification.counts.awaitingClarification} prescriptions remain blocked on clinician response.`,
          icon: ActivitySquare,
          tone: 'neutral',
        },
      ]}
    >
      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-2xl border border-[#E5E1DA] bg-[#FFFCF8] p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EEF3EA] text-[#657C62]">
              <Stethoscope className="h-5 w-5" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8A837A]">
                Prescription queue
              </p>
              <h3 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[#2D2D2D]">
                Verification work waiting on clinical action
              </h3>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {verification.prescriptions.length === 0 ? (
              <div className="rounded-2xl border border-[#ECE6DE] bg-white p-4 shadow-sm">
                <p className="text-sm leading-7 text-[#6F6A63]">No prescription verification items are currently open.</p>
              </div>
            ) : verification.prescriptions.map((item) => (
              <div key={item.soapNoteId} className="rounded-2xl border border-[#ECE6DE] bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#2D2D2D]">{item.patientName}</p>
                    <p className="mt-1 text-sm text-[#4D4943]">Dr. {item.doctorName}</p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <span className="rounded-full border border-[#E5E1DA] bg-[#F8F5F0] px-3 py-1 text-xs font-semibold text-[#6F6A63]">
                      {humanizeEnum(item.status)}
                    </span>
                    {item.slaBreached ? (
                      <span className="rounded-full border border-[#EAC5BD] bg-[#FFF2EE] px-3 py-1 text-xs font-semibold text-[#9C5C4D]">
                        SLA breach
                      </span>
                    ) : null}
                  </div>
                </div>
                <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[#8A837A]">
                  {item.uploadedAt ? `Uploaded ${formatAdminDateTime(item.uploadedAt)}` : 'Upload time unavailable'}
                  {typeof item.daysRemaining === 'number' ? ` · ${item.daysRemaining} days remaining` : ''}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-[#E5E1DA] bg-[#FFFCF8] p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F5EEE2] text-[#8E7342]">
              <FlaskConical className="h-5 w-5" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8A837A]">
                Lab exception watch
              </p>
              <h3 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[#2D2D2D]">
                Open lab orders and cold-chain signals
              </h3>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {verification.labOrders.length === 0 ? (
              <div className="rounded-2xl border border-[#ECE6DE] bg-white p-4 shadow-sm">
                <p className="text-sm leading-7 text-[#6F6A63]">No lab orders are waiting in the admin watchlist.</p>
              </div>
            ) : verification.labOrders.map((item) => (
              <div key={item.labOrderId} className="rounded-2xl border border-[#ECE6DE] bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#2D2D2D]">{item.patientName}</p>
                    <p className="mt-1 text-sm text-[#4D4943]">{item.testName}</p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <span className="rounded-full border border-[#E5E1DA] bg-[#F8F5F0] px-3 py-1 text-xs font-semibold text-[#6F6A63]">
                      {humanizeEnum(item.status)}
                    </span>
                    {item.requiresAttention ? (
                      <span className="rounded-full border border-[#EAC5BD] bg-[#FFF2EE] px-3 py-1 text-xs font-semibold text-[#9C5C4D]">
                        Needs attention
                      </span>
                    ) : null}
                  </div>
                </div>
                <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[#8A837A]">
                  {item.partner} · {item.scheduledAt ? `Scheduled ${formatAdminDateTime(item.scheduledAt)}` : 'No schedule set'}
                  {item.coldChainBreached ? ' · Cold-chain breached' : ''}
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </AdminSectionPage>
  );
}
