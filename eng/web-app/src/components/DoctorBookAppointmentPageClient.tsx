'use client';

import type { CSSProperties, FormEvent } from 'react';
import { useMemo, useState } from 'react';
import { getTokenFromCookie, getUserFromToken } from '@/lib/auth';
import {
  divider,
  inputStyle,
  pill,
  softButton,
  surface,
  textStyles,
  webTheme,
} from '@/lib/designSystem';

const API_BASE = '';

interface AppointmentResult {
  id: number;
}

interface DoctorBookAppointmentPageClientProps {
  readonly doctorId: number;
  readonly doctorName: string;
}

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toTimeInputValue(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function getNextHalfHour(date: Date): string {
  const next = new Date(date);
  next.setSeconds(0, 0);
  const minutes = next.getMinutes();
  const remainder = minutes % 30;
  next.setMinutes(minutes + (remainder === 0 ? 30 : 30 - remainder));
  return toTimeInputValue(next);
}

function formatDateTime(date: Date): string {
  return date.toLocaleString('en-IN', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function toGoogleCalendarUrl(title: string, details: string, start: Date, end: Date): string {
  const compact = (value: Date) => value.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    details,
    dates: `${compact(start)}/${compact(end)}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export default function DoctorBookAppointmentPageClient({
  doctorId,
  doctorName,
}: DoctorBookAppointmentPageClientProps) {
  const now = new Date();
  const [recipientId, setRecipientId] = useState('2');
  const [recipientName, setRecipientName] = useState('Sam Patient');
  const [selectedDate, setSelectedDate] = useState(() => toDateInputValue(now));
  const [selectedTime, setSelectedTime] = useState(() => getNextHalfHour(now));
  const [duration, setDuration] = useState('30');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AppointmentResult | null>(null);

  const startDate = useMemo(() => new Date(`${selectedDate}T${selectedTime}`), [selectedDate, selectedTime]);
  const endDate = useMemo(() => new Date(startDate.getTime() + Number(duration) * 60_000), [startDate, duration]);
  const quickDates = useMemo(() => {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);
    return [
      { label: 'Today', value: toDateInputValue(today) },
      { label: 'Tomorrow', value: toDateInputValue(tomorrow) },
      { label: 'Next week', value: toDateInputValue(nextWeek) },
    ];
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const token = getTokenFromCookie();
    if (!token) {
      setError('Your session has expired. Sign in again before booking the appointment.');
      return;
    }

    const currentUser = getUserFromToken(token);
    const activeDoctorId = currentUser?.userId ?? doctorId;

    if (!activeDoctorId) {
      setError('Doctor profile is still loading. Try again in a moment.');
      return;
    }

    if (Number.isNaN(startDate.getTime())) {
      setError('Pick a valid date and time.');
      return;
    }

    if (endDate <= startDate) {
      setError('End time must be after start time.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/v1/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          doctorId: activeDoctorId,
          doctorName,
          recipientId: Number(recipientId),
          recipientName,
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        if (response.status === 401) {
          window.location.href = '/login?next=/doctor/book';
          return;
        }
        if (response.status === 403) {
          throw new Error('This account does not have permission to book appointments.');
        }
        throw new Error(`HTTP ${response.status}: ${text}`);
      }

      setResult(await response.json() as AppointmentResult);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : String(submitError));
    } finally {
      setLoading(false);
    }
  }

  const calendarUrl = result
    ? toGoogleCalendarUrl(
        `Preventia Consultation: ${recipientName}`,
        `Consultation booked with ${doctorName} for ${recipientName}.`,
        startDate,
        endDate,
      )
    : null;

  return (
    <div style={pageStyle}>
      <section style={heroCardStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1, minWidth: 280 }}>
          <a href="/doctor" style={{ ...softButton('ghost'), alignSelf: 'flex-start', padding: 0 }}>
            ← Back to provider workspace
          </a>
          <span style={{ ...pill('accent'), alignSelf: 'flex-start' }}>Book appointment</span>
          <h1 style={{ ...textStyles.display, margin: 0 }}>Schedule a consultation with a calmer flow.</h1>
          <p style={{ ...textStyles.body, margin: 0, maxWidth: 680 }}>
            Choose the day on the calendar, set the time, and confirm the patient details in the same gentle
            doctor-portal style.
          </p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <span style={pill('neutral')}>{doctorName}</span>
          <span style={pill('gold')}>Calendar-led booking</span>
        </div>
      </section>

      {result ? (
        <section style={gridStyle}>
          <div style={panelStyle}>
            <span style={textStyles.eyebrow}>Appointment booked</span>
            <h2 style={{ ...textStyles.title, fontSize: 30, lineHeight: '36px', margin: 0 }}>
              The consultation is now scheduled.
            </h2>
            <div style={{ ...summaryCardStyle, backgroundColor: '#EDF5EA', borderColor: 'rgba(126, 154, 119, 0.2)' }}>
              <div style={{ ...textStyles.label, color: webTheme.colors.success }}>Appointment #{result.id}</div>
              <div style={textStyles.body}>{recipientName}</div>
              <div style={textStyles.muted}>{formatDateTime(startDate)} to {formatDateTime(endDate)}</div>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <a href="/doctor" style={softButton('accent')}>
                Back to workspace
              </a>
              <a href={`/doctor/consult/${result.id}`} style={softButton('secondary')}>
                Open consultation room
              </a>
              {calendarUrl ? (
                <a href={calendarUrl} target="_blank" rel="noreferrer" style={softButton('secondary')}>
                  Add to calendar
                </a>
              ) : null}
            </div>
          </div>

          <div style={panelStyle}>
            <span style={textStyles.eyebrow}>Visit summary</span>
            <h2 style={{ ...textStyles.title, fontSize: 28, lineHeight: '34px', margin: 0 }}>
              Booking details
            </h2>
            <div style={summaryCardStyle}>
              <div style={summaryRowStyle}>
                <span style={textStyles.muted}>Doctor</span>
                <span style={textStyles.body}>{doctorName}</span>
              </div>
              <div style={summaryRowStyle}>
                <span style={textStyles.muted}>Patient</span>
                <span style={textStyles.body}>{recipientName}</span>
              </div>
              <div style={summaryRowStyle}>
                <span style={textStyles.muted}>Date</span>
                <span style={textStyles.body}>{formatDateTime(startDate)}</span>
              </div>
              <div style={summaryRowStyle}>
                <span style={textStyles.muted}>Duration</span>
                <span style={textStyles.body}>{duration} minutes</span>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <form onSubmit={(event) => void handleSubmit(event)} style={gridStyle}>
          <section style={panelStyle}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={textStyles.eyebrow}>Patient details</span>
              <h2 style={{ ...textStyles.title, fontSize: 28, lineHeight: '34px', margin: 0 }}>
                Who is this consultation for?
              </h2>
            </div>

            {error ? (
              <div style={errorBannerStyle}>{error}</div>
            ) : null}

            <div style={fieldStyle}>
              <label style={textStyles.label}>Doctor</label>
              <input value={doctorName} readOnly style={{ ...inputStyle, backgroundColor: webTheme.colors.surfaceAlt }} />
            </div>

            <div style={fieldStyle}>
              <label style={textStyles.label}>Patient user ID</label>
              <input
                value={recipientId}
                onChange={(event) => setRecipientId(event.target.value)}
                placeholder="DB user id, e.g. 2"
                required
                style={inputStyle}
              />
              <span style={textStyles.muted}>Use the patient&apos;s internal Preventia user id.</span>
            </div>

            <div style={fieldStyle}>
              <label style={textStyles.label}>Patient name</label>
              <input
                value={recipientName}
                onChange={(event) => setRecipientName(event.target.value)}
                placeholder="Patient name"
                required
                style={inputStyle}
              />
            </div>

            <div style={divider} />

            <div style={{ ...summaryCardStyle, backgroundColor: webTheme.colors.surfaceTint }}>
              <div style={{ ...textStyles.label, color: webTheme.colors.accentStrong }}>Booking summary</div>
              <div style={textStyles.body}>{recipientName || 'Patient name'}</div>
              <div style={textStyles.muted}>
                {Number.isNaN(startDate.getTime()) ? 'Pick a valid slot.' : `${formatDateTime(startDate)} for ${duration} minutes`}
              </div>
            </div>
          </section>

          <section style={panelStyle}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={textStyles.eyebrow}>Calendar</span>
              <h2 style={{ ...textStyles.title, fontSize: 28, lineHeight: '34px', margin: 0 }}>
                Pick the day and time.
              </h2>
              <p style={{ ...textStyles.muted, margin: 0 }}>
                Use the calendar field for the visit date, then choose the start time and duration.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {quickDates.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  style={selectedDate === option.value ? softButton('accent') : softButton('secondary')}
                  onClick={() => setSelectedDate(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div style={fieldStyle}>
              <label style={textStyles.label}>Visit date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                required
                min={toDateInputValue(now)}
                style={inputStyle}
              />
            </div>

            <div style={timeGridStyle}>
              <div style={fieldStyle}>
                <label style={textStyles.label}>Start time</label>
                <input
                  type="time"
                  value={selectedTime}
                  onChange={(event) => setSelectedTime(event.target.value)}
                  required
                  style={inputStyle}
                />
              </div>

              <div style={fieldStyle}>
                <label style={textStyles.label}>Duration</label>
                <select
                  value={duration}
                  onChange={(event) => setDuration(event.target.value)}
                  style={inputStyle}
                >
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">60 minutes</option>
                </select>
              </div>
            </div>

            <div style={summaryCardStyle}>
              <div style={{ ...textStyles.label, marginBottom: 6 }}>Calendar preview</div>
              <div style={textStyles.body}>{Number.isNaN(startDate.getTime()) ? 'Choose a valid slot' : formatDateTime(startDate)}</div>
              <div style={textStyles.muted}>
                Ends at {Number.isNaN(endDate.getTime()) ? '—' : formatDateTime(endDate)}
              </div>
            </div>

            <button
              type="submit"
              style={{ ...softButton('accent'), width: '100%', borderRadius: webTheme.radius.md, padding: '14px 18px' }}
              disabled={loading}
            >
              {loading ? 'Booking appointment…' : 'Create appointment'}
            </button>
          </section>
        </form>
      )}
    </div>
  );
}

const pageStyle: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '0 clamp(24px, 4vw, 56px) 72px',
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
};

const heroCardStyle: CSSProperties = {
  ...surface({
    padding: 28,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 20,
    flexWrap: 'wrap',
  }),
};

const gridStyle: CSSProperties = {
  display: 'grid',
  gap: 20,
  gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
};

const panelStyle: CSSProperties = surface({
  padding: 28,
  display: 'flex',
  flexDirection: 'column',
  gap: 18,
  minHeight: 520,
});

const fieldStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

const timeGridStyle: CSSProperties = {
  display: 'grid',
  gap: 16,
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
};

const summaryCardStyle: CSSProperties = {
  ...surface({
    padding: 16,
    boxShadow: 'none',
    backgroundColor: webTheme.colors.surfaceAlt,
  }),
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

const summaryRowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 16,
  alignItems: 'center',
};

const errorBannerStyle: CSSProperties = {
  borderRadius: webTheme.radius.md,
  backgroundColor: webTheme.colors.roseTint,
  border: '1px solid rgba(199, 131, 117, 0.22)',
  padding: '12px 14px',
  ...textStyles.body,
  color: webTheme.colors.rose,
};
