'use client';

import React, { useState } from 'react';
import type { AuthUser } from '@preventia/shared';
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
  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
};

const columnStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
};

const panelStyle: React.CSSProperties = surface({
  padding: 28,
  display: 'flex',
  flexDirection: 'column',
  gap: 18,
});

const listCardStyle: React.CSSProperties = {
  ...surface({
    padding: 16,
    backgroundColor: webTheme.colors.surfaceAlt,
    boxShadow: 'none',
  }),
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
};

const fieldStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

const fieldGridStyle: React.CSSProperties = {
  display: 'grid',
  gap: 14,
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
};

const textAreaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: 120,
  resize: 'vertical',
};

const bannerStyle: React.CSSProperties = {
  borderRadius: webTheme.radius.md,
  backgroundColor: '#EDF5EA',
  border: '1px solid rgba(126, 154, 119, 0.2)',
  padding: '12px 14px',
  ...textStyles.body,
  color: webTheme.colors.success,
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 16,
  alignItems: 'center',
  flexWrap: 'wrap',
};

const actionRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 12,
  flexWrap: 'wrap',
  alignItems: 'center',
};

export default function DoctorProfilePage({ user }: Readonly<Props>) {
  const doctorName = user?.name ?? 'Doctor';
  const [displayName, setDisplayName] = useState(doctorName);
  const [specialty, setSpecialty] = useState('Internal Medicine');
  const [experience, setExperience] = useState('11');
  const [languages, setLanguages] = useState('English, Telugu, Hindi');
  const [bio, setBio] = useState(
    'Warm, longitudinal care for adult patients, with an emphasis on preventive medicine and clearer follow-up plans.',
  );
  const [licenseNumber, setLicenseNumber] = useState('882910');
  const [boardCertification, setBoardCertification] = useState('Internal Medicine');
  const [consultMode, setConsultMode] = useState('Telehealth');
  const [responseWindow, setResponseWindow] = useState('Within 4 hours');
  const [patientNote, setPatientNote] = useState(
    'Appointments begin on time. Please upload any recent labs or medication changes before the visit.',
  );
  const [consultFee, setConsultFee] = useState('2500');
  const [visitLength, setVisitLength] = useState('30');
  const [bookingBuffer, setBookingBuffer] = useState('10');
  const [acceptingPatients, setAcceptingPatients] = useState('Yes');
  const [officeHours, setOfficeHours] = useState('Mon-Fri, 9:00 AM - 6:00 PM');
  const [payoutCadence, setPayoutCadence] = useState('Weekly');
  const [statementEmail, setStatementEmail] = useState('billing@preventia.health');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  function handleSave(section: string) {
    setSaveMessage(`${section} updated.`);
  }

  if (!user) {
    return (
      <div style={pageStyle}>
        <section style={panelStyle}>
          <span style={textStyles.eyebrow}>Doctor profile</span>
          <h1 style={{ ...textStyles.display, margin: 0 }}>Sign in to edit your provider profile.</h1>
          <p style={{ ...textStyles.body, margin: 0 }}>
            Profile, practice, and scheduling settings are available once you sign in with a doctor account.
          </p>
          <a href="/login" style={softButton('accent')}>
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
          <a href="/doctor" style={{ ...softButton('ghost'), alignSelf: 'flex-start', padding: 0 }}>
            ← Back to provider workspace
          </a>
          <span style={{ ...pill('accent'), alignSelf: 'flex-start' }}>Doctor profile</span>
          <h1 style={{ ...textStyles.display, margin: 0 }}>Edit your practice profile in one place.</h1>
          <p style={{ ...textStyles.body, margin: 0, maxWidth: 720 }}>
            This page now carries the practice settings that used to live on the dashboard, along with the rest of the
            doctor-facing profile controls.
          </p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <span style={pill('neutral')}>{doctorName}</span>
          <span style={pill('success')}>{acceptingPatients === 'Yes' ? 'Accepting patients' : 'Closed to new patients'}</span>
          <span style={pill('gold')}>Consult fee ₹{consultFee}</span>
        </div>
      </section>

      {saveMessage ? <div style={bannerStyle}>{saveMessage}</div> : null}

      <section style={gridStyle}>
        <div style={columnStyle}>
          <section style={panelStyle}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={textStyles.eyebrow}>Profile basics</span>
              <h2 style={{ ...textStyles.title, fontSize: 28, lineHeight: '34px', margin: 0 }}>
                How patients and sponsors see you
              </h2>
            </div>

            <div style={fieldGridStyle}>
              <div style={fieldStyle}>
                <label style={textStyles.label}>Display name</label>
                <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} style={inputStyle} />
              </div>
              <div style={fieldStyle}>
                <label style={textStyles.label}>Specialty</label>
                <input value={specialty} onChange={(event) => setSpecialty(event.target.value)} style={inputStyle} />
              </div>
              <div style={fieldStyle}>
                <label style={textStyles.label}>Years in practice</label>
                <input value={experience} onChange={(event) => setExperience(event.target.value)} style={inputStyle} />
              </div>
              <div style={fieldStyle}>
                <label style={textStyles.label}>Languages</label>
                <input value={languages} onChange={(event) => setLanguages(event.target.value)} style={inputStyle} />
              </div>
            </div>

            <div style={fieldStyle}>
              <label style={textStyles.label}>Short bio</label>
              <textarea value={bio} onChange={(event) => setBio(event.target.value)} style={textAreaStyle} />
            </div>

            <div style={actionRowStyle}>
              <button type="button" style={softButton('accent')} onClick={() => handleSave('Profile basics')}>
                Save basics
              </button>
              <span style={textStyles.muted}>Use a shorter summary here for a more lifestyle-forward doctor card.</span>
            </div>
          </section>

          <section style={panelStyle}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={textStyles.eyebrow}>Credentials</span>
              <h2 style={{ ...textStyles.title, fontSize: 28, lineHeight: '34px', margin: 0 }}>
                Trust markers and care style
              </h2>
            </div>

            <div style={fieldGridStyle}>
              <div style={fieldStyle}>
                <label style={textStyles.label}>License number</label>
                <input
                  value={licenseNumber}
                  onChange={(event) => setLicenseNumber(event.target.value)}
                  style={inputStyle}
                />
              </div>
              <div style={fieldStyle}>
                <label style={textStyles.label}>Board certification</label>
                <input
                  value={boardCertification}
                  onChange={(event) => setBoardCertification(event.target.value)}
                  style={inputStyle}
                />
              </div>
              <div style={fieldStyle}>
                <label style={textStyles.label}>Visit mode</label>
                <select value={consultMode} onChange={(event) => setConsultMode(event.target.value)} style={inputStyle}>
                  <option value="Telehealth">Telehealth</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="Clinic">Clinic</option>
                </select>
              </div>
              <div style={fieldStyle}>
                <label style={textStyles.label}>Message response window</label>
                <select value={responseWindow} onChange={(event) => setResponseWindow(event.target.value)} style={inputStyle}>
                  <option value="Within 2 hours">Within 2 hours</option>
                  <option value="Within 4 hours">Within 4 hours</option>
                  <option value="Same day">Same day</option>
                </select>
              </div>
            </div>

            <div style={fieldStyle}>
              <label style={textStyles.label}>Patient-facing booking note</label>
              <textarea
                value={patientNote}
                onChange={(event) => setPatientNote(event.target.value)}
                style={textAreaStyle}
              />
            </div>

            <div style={actionRowStyle}>
              <button type="button" style={softButton('secondary')} onClick={() => handleSave('Credentials')}>
                Save credentials
              </button>
              <span style={textStyles.muted}>These details support the premium, approachable provider profile view.</span>
            </div>
          </section>
        </div>

        <div style={columnStyle}>
          <section style={panelStyle}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={textStyles.eyebrow}>Scheduling</span>
              <h2 style={{ ...textStyles.title, fontSize: 28, lineHeight: '34px', margin: 0 }}>
                Consultation preferences
              </h2>
            </div>

            <div style={fieldGridStyle}>
              <div style={fieldStyle}>
                <label style={textStyles.label}>Consultation fee (INR)</label>
                <input value={consultFee} onChange={(event) => setConsultFee(event.target.value)} style={inputStyle} />
              </div>
              <div style={fieldStyle}>
                <label style={textStyles.label}>Default visit length</label>
                <select value={visitLength} onChange={(event) => setVisitLength(event.target.value)} style={inputStyle}>
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">60 minutes</option>
                </select>
              </div>
              <div style={fieldStyle}>
                <label style={textStyles.label}>Buffer between visits</label>
                <select value={bookingBuffer} onChange={(event) => setBookingBuffer(event.target.value)} style={inputStyle}>
                  <option value="5">5 minutes</option>
                  <option value="10">10 minutes</option>
                  <option value="15">15 minutes</option>
                </select>
              </div>
              <div style={fieldStyle}>
                <label style={textStyles.label}>Accepting new patients</label>
                <select
                  value={acceptingPatients}
                  onChange={(event) => setAcceptingPatients(event.target.value)}
                  style={inputStyle}
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
            </div>

            <div style={fieldStyle}>
              <label style={textStyles.label}>Preferred office hours</label>
              <input value={officeHours} onChange={(event) => setOfficeHours(event.target.value)} style={inputStyle} />
            </div>

            <div style={actionRowStyle}>
              <button type="button" style={softButton('accent')} onClick={() => handleSave('Scheduling preferences')}>
                Save scheduling
              </button>
            </div>
          </section>

          <section style={panelStyle}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={textStyles.eyebrow}>Practice settings</span>
              <h2 style={{ ...textStyles.title, fontSize: 28, lineHeight: '34px', margin: 0 }}>
                Fees, earnings, and payouts
              </h2>
            </div>

            <div style={listCardStyle}>
              <div style={{ ...rowStyle, paddingBottom: 6 }}>
                <span style={pill('success')}>This week</span>
                <span style={{ ...textStyles.title, fontSize: 20 }}>₹ 12,500</span>
              </div>
              <div style={rowStyle}>
                <span style={pill('neutral')}>This month</span>
                <span style={{ ...textStyles.title, fontSize: 20 }}>₹ 48,000</span>
              </div>
              <div style={rowStyle}>
                <span style={pill('gold')}>Pending</span>
                <span style={{ ...textStyles.title, fontSize: 20 }}>₹ 7,500</span>
              </div>
            </div>

            <div style={divider} />

            <div style={fieldGridStyle}>
              <div style={fieldStyle}>
                <label style={textStyles.label}>Payout cadence</label>
                <select value={payoutCadence} onChange={(event) => setPayoutCadence(event.target.value)} style={inputStyle}>
                  <option value="Weekly">Weekly</option>
                  <option value="Bi-weekly">Bi-weekly</option>
                  <option value="Monthly">Monthly</option>
                </select>
              </div>
              <div style={fieldStyle}>
                <label style={textStyles.label}>Statement email</label>
                <input
                  value={statementEmail}
                  onChange={(event) => setStatementEmail(event.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={actionRowStyle}>
              <button type="button" style={softButton('secondary')} onClick={() => handleSave('Practice settings')}>
                Save practice settings
              </button>
              <button type="button" style={softButton('gold')}>
                View statement
              </button>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
