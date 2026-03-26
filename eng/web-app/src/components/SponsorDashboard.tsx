'use client';

import React, { useCallback, useEffect, useState } from 'react';
import type { Appointment, AuthUser } from '@preventia/shared';
import { getAppointments } from '@preventia/shared';
import { getTokenFromCookie } from '../lib/auth';
import dynamic from 'next/dynamic';

const ChatPanel      = dynamic(() => import('./ChatPanel'),      { ssr: false });
const PatientTimeline = dynamic(() => import('./PatientTimeline'), { ssr: false });
import {
  pageShell,
  photoPlaceholder,
  pill,
  softButton,
  surface,
  textStyles,
  webTheme,
} from '@/lib/designSystem';

interface MedAlert {
  medicationName: string;
  urgency: 'CRITICAL' | 'WARNING' | 'OK';
  daysRemaining: number;
}

interface Props {
  user?: AuthUser;
}

const heroGridStyle: React.CSSProperties = {
  ...pageShell,
  display: 'grid',
  gap: 20,
  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
};

const panelGridStyle: React.CSSProperties = {
  ...pageShell,
  display: 'grid',
  gap: 20,
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  paddingTop: 0,
};

const cardStyle: React.CSSProperties = surface({
  padding: 24,
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
});

const listCardStyle: React.CSSProperties = {
  ...surface({
    padding: 18,
    boxShadow: 'none',
    backgroundColor: webTheme.colors.surfaceAlt,
  }),
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
};

const metaRowStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 10,
  alignItems: 'center',
};

export default function SponsorDashboard({ user }: Props) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [medAlerts, setMedAlerts] = useState<MedAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alertLoading, setAlertLoading] = useState(false);

  const sponsorName = user?.name ?? 'Sponsor';
  const firstName = sponsorName.split(' ')[0] ?? sponsorName;

  const fetchAppointments = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const data = await getAppointments({ sponsorId: user.userId });
      setAppointments(data);

      const firstAppt = data.find((appointment) => appointment.recipientId);
      if (firstAppt?.recipientId) {
        setAlertLoading(true);
        const token = getTokenFromCookie();
        try {
          const res = await fetch(`/api/v1/patients/${firstAppt.recipientId}/medications/alerts`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (res.ok) setMedAlerts(await res.json() as MedAlert[]);
        } catch {
          setMedAlerts([]);
        } finally {
          setAlertLoading(false);
        }
      }
    } catch (error) {
      console.error('[SponsorDashboard]', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchAppointments();
  }, [fetchAppointments]);

  const scheduled = appointments.filter((appointment) => appointment.status === 'SCHEDULED');
  const active = appointments.filter((appointment) => appointment.status === 'ACTIVE');
  const completed = appointments.filter((appointment) => appointment.status === 'COMPLETED');
  const critAlerts = medAlerts.filter((alert) => alert.urgency === 'CRITICAL');
  const warnAlerts = medAlerts.filter((alert) => alert.urgency === 'WARNING');

  const formatVisit = (iso: string) =>
    new Date(iso).toLocaleString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      day: 'numeric',
      month: 'short',
    });

  if (!user) {
    return (
      <div style={heroGridStyle}>
        <section style={cardStyle}>
          <span style={textStyles.eyebrow}>Sponsor portal</span>
          <h1 style={{ ...textStyles.display, margin: 0 }}>
            A premium family-care dashboard, not a clinical tool.
          </h1>
          <p style={{ ...textStyles.body, margin: 0 }}>
            Sign in to manage consultations, medication watchlists, and family updates from abroad.
          </p>
          <a href="/login" style={softButton('accent')}>
            Sign in
          </a>
        </section>
        <section style={cardStyle}>
          <div style={photoPlaceholder(320)}>
            <div
              style={{
                position: 'absolute',
                left: 18,
                right: 18,
                bottom: 18,
                ...surface({
                  borderRadius: webTheme.radius.md,
                  padding: 16,
                  boxShadow: 'none',
                  backgroundColor: 'rgba(255, 252, 248, 0.78)',
                }),
              }}
            >
              <div style={{ ...textStyles.label, marginBottom: 6 }}>Care at home</div>
              <div style={textStyles.muted}>
                A home-centered care moment with familiar surroundings and calmer coordination.
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={heroGridStyle}>
        <section style={{ ...cardStyle, alignItems: 'center', justifyContent: 'center', minHeight: 280 }}>
          <span style={textStyles.muted}>Loading your family dashboard…</span>
        </section>
      </div>
    );
  }

  return (
    <>
      <section style={heroGridStyle}>
        <div style={{ ...cardStyle, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <span style={textStyles.eyebrow}>Sponsor view</span>
            <h1 style={{ ...textStyles.display, margin: 0 }}>
              Caring for home from anywhere feels calmer now.
            </h1>
            <p style={{ ...textStyles.body, margin: 0 }}>
              {firstName}, keep your parent&apos;s appointments, refill signals, and recent care moments in one warm, premium dashboard.
            </p>
            <div style={metaRowStyle}>
              <span style={pill('accent')}>Remote family care</span>
              <span style={pill('neutral')}>
                {appointments.length} visit{appointments.length === 1 ? '' : 's'} tracked
              </span>
              <span style={pill(active.length > 0 ? 'rose' : 'success')}>
                {active.length > 0 ? 'Live consultation available' : 'Everything calm right now'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <a href="/sponsor/book" style={softButton('accent')}>
              Book consultation
            </a>
            <button
              type="button"
              style={softButton('secondary')}
              onClick={() => {
                setRefreshing(true);
                void fetchAppointments();
              }}
              disabled={refreshing}
            >
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
            <a href="/api/logout" style={softButton('ghost')}>
              Sign out
            </a>
          </div>
        </div>

        <div style={photoPlaceholder(360)}>
          <div
            style={{
              position: 'absolute',
              top: 22,
              right: 22,
              width: 110,
              height: 110,
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.3)',
              filter: 'blur(8px)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 18,
              right: 18,
              bottom: 18,
              ...surface({
                borderRadius: webTheme.radius.md,
                padding: 16,
                boxShadow: 'none',
                backgroundColor: 'rgba(255, 252, 248, 0.76)',
              }),
            }}
          >
            <div style={{ ...textStyles.label, marginBottom: 6 }}>Care at home</div>
            <div style={textStyles.muted}>
              A connected family setting that keeps care updates warm, clear, and close at hand.
            </div>
          </div>
        </div>
      </section>

      <section style={panelGridStyle}>
        <div style={cardStyle}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={textStyles.eyebrow}>Upcoming care moments</span>
            <h2 style={{ ...textStyles.title, fontSize: 26, lineHeight: '32px', margin: 0 }}>
              What needs your attention next
            </h2>
          </div>

          {active.map((appointment) => (
            <div key={appointment.id} style={{ ...listCardStyle, backgroundColor: webTheme.colors.roseTint }}>
              <div style={metaRowStyle}>
                <span style={pill('rose')}>Live now</span>
                <span style={textStyles.muted}>{appointment.recipientName ?? `Patient #${appointment.id}`}</span>
              </div>
              <div style={textStyles.title}>{appointment.doctorName ?? 'Consultation in progress'}</div>
              {appointment.dailyRoomUrl ? (
                <a href={appointment.dailyRoomUrl} target="_blank" rel="noreferrer" style={softButton('rose')}>
                  Join consultation
                </a>
              ) : null}
            </div>
          ))}

          {scheduled.map((appointment) => (
            <div key={appointment.id} style={listCardStyle}>
              <div style={metaRowStyle}>
                <span style={pill('accent')}>{formatVisit(appointment.startTime)}</span>
                <span style={textStyles.muted}>{appointment.recipientName ?? `Patient #${appointment.id}`}</span>
              </div>
              <div style={textStyles.title}>{appointment.doctorName ?? 'Scheduled consultation'}</div>
              <div style={textStyles.muted}>A calm reminder instead of a dense schedule grid.</div>
            </div>
          ))}

          {active.length === 0 && scheduled.length === 0 ? (
            <div style={listCardStyle}>
              <div style={textStyles.title}>No upcoming consultations</div>
              <div style={textStyles.muted}>Book a visit when your family needs another care touchpoint.</div>
            </div>
          ) : null}
        </div>

        <div style={cardStyle}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={textStyles.eyebrow}>Medication watch</span>
            <h2 style={{ ...textStyles.title, fontSize: 26, lineHeight: '32px', margin: 0 }}>
              Refill signals in a softer tone
            </h2>
          </div>

          {alertLoading ? <div style={textStyles.muted}>Checking medications…</div> : null}

          {!alertLoading && critAlerts.length === 0 && warnAlerts.length === 0 ? (
            <div style={{ ...listCardStyle, backgroundColor: '#EDF5EA' }}>
              <div style={pill('success')}>All clear</div>
              <div style={textStyles.muted}>No urgent medication alerts for the linked recipient.</div>
            </div>
          ) : null}

          {critAlerts.map((alert) => (
            <div key={alert.medicationName} style={{ ...listCardStyle, backgroundColor: webTheme.colors.roseTint }}>
              <div style={metaRowStyle}>
                <span style={pill('rose')}>Needs action</span>
                <span style={textStyles.muted}>{alert.daysRemaining} days remaining</span>
              </div>
              <div style={textStyles.title}>{alert.medicationName}</div>
            </div>
          ))}

          {warnAlerts.map((alert) => (
            <div key={alert.medicationName} style={{ ...listCardStyle, backgroundColor: webTheme.colors.goldTint }}>
              <div style={metaRowStyle}>
                <span style={pill('gold')}>Refill soon</span>
                <span style={textStyles.muted}>{alert.daysRemaining} days remaining</span>
              </div>
              <div style={textStyles.title}>{alert.medicationName}</div>
            </div>
          ))}
        </div>

        <div style={cardStyle}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={textStyles.eyebrow}>Recent visits</span>
            <h2 style={{ ...textStyles.title, fontSize: 26, lineHeight: '32px', margin: 0 }}>
              Notes from completed care moments
            </h2>
          </div>

          {completed.length === 0 ? (
            <div style={listCardStyle}>
              <div style={textStyles.title}>No completed sessions yet</div>
              <div style={textStyles.muted}>Recent prescriptions and summaries will land here.</div>
            </div>
          ) : null}

          {completed.map((appointment) => (
            <div key={appointment.id} style={listCardStyle}>
              <div style={metaRowStyle}>
                <span style={pill('neutral')}>{formatVisit(appointment.startTime)}</span>
                <span style={textStyles.muted}>{appointment.recipientName ?? `Patient #${appointment.id}`}</span>
              </div>
              <div style={textStyles.title}>{appointment.doctorName ?? 'Completed consultation'}</div>
              {appointment.prescriptionUrl ? (
                <a href={appointment.prescriptionUrl} target="_blank" rel="noreferrer" style={softButton('secondary')}>
                  View prescription
                </a>
              ) : (
                <div style={textStyles.muted}>Prescription will appear when it is uploaded.</div>
              )}
            </div>
          ))}
        </div>

        {/* Care Team Channel — doctor + patient + sponsor 3-way chat */}
        {(() => {
          const firstRecipientId = appointments.find(a => a.recipientId)?.recipientId;
          if (!firstRecipientId) return null;
          const careTeamChannelId = `care-team-${firstRecipientId}`;
          const token = getTokenFromCookie() ?? '';
          return (
            <div style={{ ...cardStyle, gridColumn: 'span 2' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={textStyles.eyebrow}>Care team</span>
                  <h2 style={{ ...textStyles.title, fontSize: 22, lineHeight: '28px', margin: 0 }}>
                    Doctor · Patient · You
                  </h2>
                  <p style={{ ...textStyles.muted, margin: 0, fontSize: 13 }}>
                    A shared channel connecting you, the patient, and their doctor in one place.
                  </p>
                </div>
                <a href="/sponsor/messages" style={softButton('accent')}>Full screen ›</a>
              </div>
              <ChatPanel
                userName={sponsorName}
                height={340}
                embedded
                peerUserId={`care-team-${firstRecipientId}`}
              />
            </div>
          );
        })()}

        {/* Care Timeline — patient's care history visible to sponsor */}
        {(() => {
          const firstRecipientId = appointments.find(a => a.recipientId)?.recipientId;
          if (!firstRecipientId) return null;
          const token = getTokenFromCookie() ?? '';
          return (
            <div style={cardStyle}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={textStyles.eyebrow}>Care history</span>
                <h2 style={{ ...textStyles.title, fontSize: 22, lineHeight: '28px', margin: 0 }}>
                  Recent care moments
                </h2>
              </div>
              <PatientTimeline
                patientId={firstRecipientId}
                token={user?.token ?? token}
                role="SPONSOR"
                compact
              />
            </div>
          );
        })()}

        <div style={cardStyle}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={textStyles.eyebrow}>Next steps</span>
            <h2 style={{ ...textStyles.title, fontSize: 22, lineHeight: '32px', margin: 0 }}>
              Plan the next visit
            </h2>
          </div>
          <div style={{ ...listCardStyle, backgroundColor: webTheme.colors.surfaceTint }}>
            <div style={pill('accent')}>Consultation booking</div>
            <div style={textStyles.body}>
              Book a teleconsultation for your family member with any available doctor.
            </div>
          </div>
          <a href="/sponsor/book" style={softButton('gold')}>
            Book a consultation
          </a>
        </div>
      </section>
    </>
  );
}
