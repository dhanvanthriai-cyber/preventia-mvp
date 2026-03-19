'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { AuthUser } from '@preventia/shared';
import { getTokenFromCookie } from '@/lib/auth';
import {
  divider,
  inputStyle,
  pill,
  softButton,
  surface,
  textStyles,
  webTheme,
} from '@/lib/designSystem';

interface Props {
  user?: AuthUser;
}

interface DoctorOption {
  id: number;
  name: string;
  email?: string;
}

interface AppointmentResult {
  id: number;
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

export default function PatientBookAppointmentPage({ user }: Readonly<Props>) {
  const now = new Date();
  const [patientId, setPatientId] = useState<number | null>(user?.userId ?? null);
  const [patientName, setPatientName] = useState(user?.name ?? 'Patient');
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => toDateInputValue(now));
  const [selectedTime, setSelectedTime] = useState(() => getNextHalfHour(now));
  const [duration, setDuration] = useState('30');
  const [loading, setLoading] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AppointmentResult | null>(null);

  useEffect(() => {
    const jwt = getTokenFromCookie();
    if (!jwt) {
      setLoadingDoctors(false);
      return;
    }

    Promise.all([
      fetch('/api/v1/auth/me', {
        headers: { Authorization: `Bearer ${jwt}` },
      }),
      fetch('/api/v1/auth/doctors', {
        headers: { Authorization: `Bearer ${jwt}` },
      }),
    ])
      .then(async ([meRes, doctorsRes]) => {
        if (meRes.ok) {
          const me = await meRes.json() as { userId: number; name?: string };
          setPatientId(me.userId);
          if (me.name) setPatientName(me.name);
        }

        if (!doctorsRes.ok) {
          throw new Error(`HTTP ${doctorsRes.status}`);
        }

        const directory = await doctorsRes.json() as DoctorOption[];
        setDoctors(directory);
        setSelectedDoctorId((current) => current || String(directory[0]?.id ?? ''));
      })
      .catch(() => {
        setError('We could not load the doctor directory right now. Please refresh and try again.');
      })
      .finally(() => {
        setLoadingDoctors(false);
      });
  }, []);

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

  const selectedDoctor = doctors.find((doctor) => String(doctor.id) === selectedDoctorId) ?? null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const jwt = getTokenFromCookie();
    if (!jwt) {
      setError('Your session has expired. Sign in again before booking the appointment.');
      return;
    }

    if (!patientId) {
      setError('Your patient profile is still loading. Try again in a moment.');
      return;
    }

    if (!selectedDoctor) {
      setError('Choose a doctor before you continue.');
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
      const res = await fetch('/api/v1/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          doctorId: selectedDoctor.id,
          doctorName: selectedDoctor.name,
          recipientId: patientId,
          recipientName: patientName,
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        if (res.status === 401) {
          throw new Error('You are not authorized to book appointments with this session. Sign in again and retry.');
        }
        if (res.status === 403) {
          throw new Error('This account does not have permission to book appointments.');
        }
        throw new Error(`HTTP ${res.status}: ${text}`);
      }

      setResult(await res.json() as AppointmentResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  const calendarUrl = result && selectedDoctor
    ? toGoogleCalendarUrl(
        `Preventia Consultation: ${selectedDoctor.name}`,
        `Consultation booked for ${patientName} with ${selectedDoctor.name}.`,
        startDate,
        endDate,
      )
    : null;

  if (!user) {
    return (
      <div style={pageStyle}>
        <section style={panelStyle}>
          <span style={textStyles.eyebrow}>Patient booking</span>
          <h1 style={{ ...textStyles.display, margin: 0 }}>Sign in to schedule your next consultation.</h1>
          <p style={{ ...textStyles.body, margin: 0 }}>
            Your booking details and available doctors will appear once you sign in with a patient account.
          </p>
          <a href="/login?next=/patient/book" style={softButton('accent')}>
            Sign in
          </a>
        </section>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <section style={heroCardStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1, minWidth: 280 }}>
          <a href="/patient" style={{ ...softButton('ghost'), alignSelf: 'flex-start', padding: 0 }}>
            ← Back to patient portal
          </a>
          <span style={{ ...pill('accent'), alignSelf: 'flex-start' }}>Book appointment</span>
          <h1 style={{ ...textStyles.display, margin: 0 }}>Schedule your next consultation with a calmer flow.</h1>
          <p style={{ ...textStyles.body, margin: 0, maxWidth: 700 }}>
            Choose a doctor, pick the day on the calendar, and confirm the visit in the same gentle patient-portal style.
          </p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <span style={pill('neutral')}>{patientName}</span>
          <span style={pill('gold')}>{doctors.length} doctor{doctors.length === 1 ? '' : 's'} available</span>
        </div>
      </section>

      {result ? (
        <section style={gridStyle}>
          <div style={panelStyle}>
            <span style={textStyles.eyebrow}>Appointment booked</span>
            <h2 style={{ ...textStyles.title, fontSize: 30, lineHeight: '36px', margin: 0 }}>
              Your consultation is now on the calendar.
            </h2>
            <div style={{ ...summaryCardStyle, backgroundColor: '#EDF5EA', borderColor: 'rgba(126, 154, 119, 0.2)' }}>
              <div style={{ ...textStyles.label, color: webTheme.colors.success }}>Appointment #{result.id}</div>
              <div style={textStyles.body}>{selectedDoctor?.name ?? 'Doctor selected'}</div>
              <div style={textStyles.muted}>{formatDateTime(startDate)} to {formatDateTime(endDate)}</div>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <a href="/patient" style={softButton('accent')}>
                Back to portal
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
                <span style={textStyles.muted}>Patient</span>
                <span style={textStyles.body}>{patientName}</span>
              </div>
              <div style={summaryRowStyle}>
                <span style={textStyles.muted}>Doctor</span>
                <span style={textStyles.body}>{selectedDoctor?.name ?? 'Doctor selected'}</span>
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
              <span style={textStyles.eyebrow}>Visit details</span>
              <h2 style={{ ...textStyles.title, fontSize: 28, lineHeight: '34px', margin: 0 }}>
                Choose your doctor and review your details.
              </h2>
            </div>

            {error ? <div style={errorBannerStyle}>{error}</div> : null}

            <div style={fieldStyle}>
              <label style={textStyles.label}>Patient</label>
              <input value={patientName} readOnly style={{ ...inputStyle, backgroundColor: webTheme.colors.surfaceAlt }} />
            </div>

            <div style={fieldStyle}>
              <label style={textStyles.label}>Patient user ID</label>
              <input
                value={patientId ? String(patientId) : ''}
                readOnly
                style={{ ...inputStyle, backgroundColor: webTheme.colors.surfaceAlt }}
              />
            </div>

            <div style={fieldStyle}>
              <label style={textStyles.label}>Doctor</label>
              <select
                value={selectedDoctorId}
                onChange={(event) => setSelectedDoctorId(event.target.value)}
                disabled={loadingDoctors || doctors.length === 0}
                style={inputStyle}
              >
                <option value="">
                  {loadingDoctors ? 'Loading doctors…' : doctors.length === 0 ? 'No doctors available' : 'Select a doctor'}
                </option>
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.name}
                  </option>
                ))}
              </select>
              <span style={textStyles.muted}>
                {selectedDoctor?.email ? `Contact: ${selectedDoctor.email}` : 'Choose from the available doctors on the platform.'}
              </span>
            </div>

            {selectedDoctor ? (
              <div style={{ ...summaryCardStyle, backgroundColor: webTheme.colors.surfaceTint }}>
                <div style={{ ...textStyles.label, color: webTheme.colors.accentStrong }}>Selected doctor</div>
                <div style={textStyles.body}>{selectedDoctor.name}</div>
                <div style={textStyles.muted}>{selectedDoctor.email ?? 'Doctor profile available in your care network.'}</div>
              </div>
            ) : null}

            <div style={divider} />

            <div style={{ ...summaryCardStyle, backgroundColor: webTheme.colors.surfaceTint }}>
              <div style={{ ...textStyles.label, color: webTheme.colors.accentStrong }}>Booking summary</div>
              <div style={textStyles.body}>{selectedDoctor?.name ?? 'Choose a doctor'}</div>
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
                Choose a visit date, set the start time, and confirm the consultation duration.
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
              disabled={loading || loadingDoctors || doctors.length === 0}
            >
              {loading ? 'Booking appointment…' : 'Create appointment'}
            </button>
          </section>
        </form>
      )}
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '0 clamp(24px, 4vw, 56px) 72px',
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
};

const heroCardStyle: React.CSSProperties = surface({
  padding: 28,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 20,
  flexWrap: 'wrap',
});

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gap: 20,
  gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
};

const panelStyle: React.CSSProperties = surface({
  padding: 28,
  display: 'flex',
  flexDirection: 'column',
  gap: 18,
  minHeight: 520,
});

const fieldStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

const timeGridStyle: React.CSSProperties = {
  display: 'grid',
  gap: 16,
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
};

const summaryCardStyle: React.CSSProperties = {
  ...surface({
    padding: 16,
    boxShadow: 'none',
    backgroundColor: webTheme.colors.surfaceAlt,
  }),
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

const summaryRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 16,
  alignItems: 'center',
};

const errorBannerStyle: React.CSSProperties = {
  borderRadius: webTheme.radius.md,
  backgroundColor: webTheme.colors.roseTint,
  border: '1px solid rgba(199, 131, 117, 0.22)',
  padding: '12px 14px',
  ...textStyles.body,
  color: webTheme.colors.rose,
};
