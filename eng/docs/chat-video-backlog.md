# Preventia — Chat & Video Consultation Feature Backlog

## Priority Legend
- 🔴 P0 — Critical / blocks core flow
- 🟠 P1 — High value / next sprint
- 🟡 P2 — Medium / sprint after
- 🟢 P3 — Nice to have / future

---

## CHAT-001 — Dynamic Doctor-Patient Channel Wiring

**Priority:** 🔴 P0  
**Area:** Chat  
**Who:** Doctor / Patient  
**Story:** As a patient, I want my chat to automatically connect to my assigned doctor so that I don't have to know or enter any user ID manually.  
**Acceptance Criteria:**
- [ ] Patient dashboard resolves the correct Stream userId of their assigned doctor from the backend (remove hardcoded `peerUserId="1"`)
- [ ] `GET /api/v1/chat/peer` returns the peer userId for the calling user's role (patient → their doctor; doctor → list of their patients)
- [ ] Channel creation is idempotent: rejoining the same pair never creates a duplicate channel
- [ ] Works for both web (Next.js) and mobile (React Native)

**Implementation Notes:** Add `/api/v1/chat/peer` endpoint in Spring Boot. Query `appointments` or `doctor_patient` mapping table. Update `PatientChatPage` and `DoctorChatPage` on frontend to call this endpoint before initializing Stream client.

---

## CHAT-002 — Appointment Confirmation Chat Message

**Priority:** 🟠 P1  
**Area:** Chat  
**Who:** Patient / Sponsor  
**Story:** As a patient and sponsor, I want to receive a chat message confirming a newly booked appointment so that I have all the details in one place without checking email.  
**Acceptance Criteria:**
- [ ] When an appointment is created (`SCHEDULED`), a system bot message is sent to the doctor-patient channel containing: appointment date/time (IST), doctor name, appointment ID, and a join link
- [ ] Sponsor channel (if linked) also receives the confirmation message
- [ ] Message is sent by a named bot user (e.g., `preventia-bot`) with a recognizable avatar
- [ ] Confirmation message is pinned in the channel for easy retrieval

**Implementation Notes:** Trigger from `AppointmentService.createAppointment()` in Spring Boot via Stream server-side SDK (`sendMessage` with `system: true`). Create a `ChatNotificationService` bean. Bot user must be pre-provisioned in Stream dashboard.

---

## CHAT-003 — Pre-Consultation Reminder Messages

**Priority:** 🟠 P1  
**Area:** Chat  
**Who:** Patient / Sponsor  
**Story:** As a patient, I want to receive a chat reminder 24 hours and 1 hour before my appointment so that I don't miss it and can prepare.  
**Acceptance Criteria:**
- [ ] Reminder at T-24h: "Your appointment with Dr. [Name] is tomorrow at [time IST]. Please have your medications list and recent reports ready."
- [ ] Reminder at T-1h: "Your appointment starts in 1 hour. Click here to join: [deep link]"
- [ ] Sponsor receives the same reminders on their linked channel
- [ ] Reminders are not sent if appointment is already CANCELLED or COMPLETED
- [ ] Deep link works on both web and React Native (universal link)

**Implementation Notes:** Use Spring Boot `@Scheduled` or a dedicated scheduler (Quartz/DB-backed jobs) to enqueue reminders at booking time. Store job references in `appointment_reminders` table. `ChatNotificationService.sendReminder()` wraps Stream SDK call.

---

## CHAT-004 — Patient Symptom Update (Async Message)

**Priority:** 🟠 P1  
**Area:** Chat  
**Who:** Patient  
**Story:** As a patient, I want to send a message to my doctor between appointments describing new or worsening symptoms so that my doctor can advise me without waiting for the next scheduled call.  
**Acceptance Criteria:**
- [ ] Patient can send free-text messages and attach images (e.g., photos of rashes, medication labels) in the existing channel at any time
- [ ] Messages are visible on doctor dashboard with unread badge count
- [ ] Doctor can reply asynchronously; patient gets a push notification (FCM/APNs)
- [ ] Image attachments are stored via Stream CDN; no PHI leaves the approved boundary

**Implementation Notes:** Stream Chat natively supports file/image attachments. Ensure Stream channel config allows attachments. Push notifications via Stream's built-in push integration with Firebase (Android) and APNs (iOS). Flag channel-level file size limits (e.g., 10 MB).

---

## CHAT-005 — Urgent Message Flag & SLA Alert

**Priority:** 🟠 P1  
**Area:** Chat  
**Who:** Patient / Doctor  
**Story:** As a patient, I want to mark a message as URGENT so that my doctor is alerted immediately and knows to respond within a defined SLA (e.g., 4 hours).  
**Acceptance Criteria:**
- [ ] Patient can tap/click an "🚨 Mark as Urgent" button when composing a message
- [ ] Urgent messages display a red banner and 🚨 badge in the doctor's dashboard
- [ ] An escalation push notification is sent immediately (bypasses quiet hours)
- [ ] If doctor has not responded within 4 hours, a secondary alert is sent to a clinic admin
- [ ] Urgent flag is stored on the message's `extra_data` in Stream so it survives channel history

**Implementation Notes:** Use Stream's `message.extraData` field `{ urgent: true }`. Custom UI component renders the badge. SLA timer implemented via Spring Boot scheduled job polling `GET /api/v1/chat/urgent-unread`; admin alert via email/SMS fallback. Store SLA metadata in `urgent_messages` table.

---

## CHAT-006 — Sponsor-Doctor Update Channel

**Priority:** 🟠 P1  
**Area:** Chat  
**Who:** Sponsor / Doctor  
**Story:** As an NRI Sponsor, I want a dedicated channel with the doctor so that I can ask questions about my parent's care and receive updates without going through the patient.  
**Acceptance Criteria:**
- [ ] A separate 1:1 channel exists between the doctor and each linked sponsor
- [ ] Doctor can send a post-consultation summary to this channel with one click
- [ ] Sponsor can message the doctor but cannot see the patient's private channel
- [ ] Channel is created automatically when a sponsor is linked to a patient's care team

**Implementation Notes:** Create channel type `sponsor-doctor` in Stream. Backend creates this channel in `SponsorService.linkSponsor()`. Enforce channel privacy at Stream channel-level permissions. Summary send triggered by `POST /api/v1/chat/send-summary/{appointmentId}`.

---

## CHAT-007 — Pharmacist-Doctor Prescription Clarification Channel

**Priority:** 🟠 P1  
**Area:** Chat  
**Who:** Doctor / Pharmacist  
**Story:** As a pharmacist, I want to message the prescribing doctor to clarify prescription details so that I can safely dispense medication without delaying patient care.  
**Acceptance Criteria:**
- [ ] Pharmacist role users can initiate a chat with the doctor linked to a specific prescription
- [ ] Message thread is tagged with the prescription/appointment ID for audit traceability
- [ ] All messages in this channel are stored in audit log (`chat_audit_log` table) per compliance requirements
- [ ] Doctor receives push notification for pharmacist messages with prescription context in the preview

**Implementation Notes:** Create Stream channel type `pharmacy-doctor` with channel ID format `rx-{prescriptionId}`. `PharmacyController` exposes `POST /api/v1/chat/pharmacy/start-clarification`. Audit hook via Stream webhook `message.new` → `AuditService.logChatEvent()`.

---

## CHAT-008 — Lab Results Notification to Patient

**Priority:** 🟠 P1  
**Area:** Chat  
**Who:** Doctor / Patient  
**Story:** As a doctor, I want to notify my patient via chat when their lab results have arrived and share a summary so that the patient is informed promptly without an additional appointment.  
**Acceptance Criteria:**
- [ ] Doctor can select a patient and trigger "Lab Results Available" notification from doctor dashboard
- [ ] Chat message includes: lab test name, date, a brief doctor note, and a secure link to the full report PDF
- [ ] Patient receives push notification with "Your lab results are ready" text
- [ ] PDF link is time-limited (e.g., 24-hour signed URL) to protect PHI

**Implementation Notes:** `LabResultController` → `POST /api/v1/lab-results/{resultId}/notify-patient`. `ChatNotificationService` composes and sends the message. PDF stored in S3/OCI Object Storage; signed URL generated by `StorageService.generatePresignedUrl(24h)`. Stream message `extraData` carries `{ type: "lab_result", resultId }` for deep linking.

---

## CHAT-009 — Consent Document Delivery via Chat

**Priority:** 🟠 P1  
**Area:** Chat  
**Who:** Patient / Sponsor  
**Story:** As a patient, I want to receive consent forms in chat and acknowledge them digitally so that the clinic has a timestamped, auditable consent record without printing or scanning.  
**Acceptance Criteria:**
- [ ] Backend sends a consent document message with a CTA button ("I Agree" / "Decline")
- [ ] Patient taps "I Agree"; the action is POSTed to `POST /api/v1/consent/{consentId}/acknowledge`
- [ ] Acknowledgement timestamp and IP are recorded in `consent_records` table
- [ ] Sponsor can countersign for a patient who is unable to consent independently
- [ ] Once signed, the message updates to show "✅ Signed by [name] at [timestamp]"

**Implementation Notes:** Use Stream's custom message actions (`message.actions`) to render interactive buttons. React Native and Next.js custom renderers handle the action. Spring Boot `ConsentService` processes acknowledgement. Consider Stream's `message.updated` event to refresh the signed state in real time.

---

## CHAT-010 — No-Show Auto-Message (Patient)

**Priority:** 🟠 P1  
**Area:** Chat  
**Who:** Patient / Sponsor  
**Story:** As a patient who missed my appointment, I want to automatically receive a follow-up chat message so that I know I can reschedule and don't feel abandoned.  
**Acceptance Criteria:**
- [ ] If appointment reaches `COMPLETED` state but patient never joined (join event never received from Daily.co), send "We missed you!" message
- [ ] Message includes a direct link to reschedule and doctor's next available slots (if API available)
- [ ] Sponsor also receives the no-show notification on their channel
- [ ] No-show event is logged in `appointment_events` for reporting

**Implementation Notes:** Daily.co webhook `meeting-ended` → Spring Boot `AppointmentWebhookHandler`. Compare `participant_ids` to expected patient. If patient absent, trigger `ChatNotificationService.sendNoShowMessage()`. Scheduler double-checks 15 min after end time to handle late webhooks.

---

## CHAT-011 — No-Show Auto-Message (Doctor)

**Priority:** 🟠 P1  
**Area:** Chat  
**Who:** Patient / Sponsor  
**Story:** As a patient waiting in the video room, I want an automated chat message if my doctor is 10+ minutes late so that I know what's happening and have a way to contact the clinic.  
**Acceptance Criteria:**
- [ ] If patient joins but doctor has not joined within 10 minutes of scheduled start, a bot message is sent: "Dr. [Name] is running late. Our support team is being notified. Clinic contact: [number]"
- [ ] Clinic admin receives an internal alert (email/Slack)
- [ ] If doctor joins within 20 min, a follow-up message apologizes for the delay
- [ ] If doctor never joins, appointment is marked `NO_SHOW_DOCTOR` and patient is offered reschedule

**Implementation Notes:** Scheduled check via Quartz job at `scheduledTime + 10min`. Checks `appointment.status` and Daily.co participant list via Daily REST API `GET /rooms/{roomName}/participants`. `AppointmentService.markDoctorNoShow()` triggers state transition and chat message.

---

## CHAT-012 — Post-Consultation SOAP Note Share

**Priority:** 🟠 P1  
**Area:** Chat  
**Who:** Patient / Sponsor  
**Story:** As a patient, I want to receive a simplified summary of my doctor's SOAP note after the consultation so that I understand my diagnosis and care plan without medical jargon.  
**Acceptance Criteria:**
- [ ] After appointment reaches `LOCKED` status, doctor can click "Share Summary with Patient"
- [ ] A patient-friendly summary (Plan + medications, not raw SOAP) is sent as a structured chat message
- [ ] Sponsor also receives the summary on their channel
- [ ] The message renders as a card (not raw text) with sections: Diagnosis, Medications, Follow-up instructions
- [ ] Sharing is optional — doctor controls what to share

**Implementation Notes:** `POST /api/v1/appointments/{id}/share-summary`. `SoapNoteService` composes the patient-friendly version (filtered fields). Stream `extraData: { type: "soap_summary", appointmentId }` enables custom card rendering in both apps.

---

## CHAT-013 — Follow-up Appointment Scheduling via Chat

**Priority:** 🟡 P2  
**Area:** Chat  
**Who:** Doctor / Patient  
**Story:** As a doctor, I want to suggest a follow-up appointment date directly in chat so that the patient can accept with one tap and scheduling is frictionless.  
**Acceptance Criteria:**
- [ ] Doctor types `/schedule follow-up [date] [time]` or uses a UI picker; a booking card is posted to chat
- [ ] Patient sees the card with "Accept" and "Propose Another Time" buttons
- [ ] "Accept" creates an appointment record (`SCHEDULED`) and sends both parties a confirmation
- [ ] "Propose Another Time" opens a calendar picker for the patient to suggest alternatives
- [ ] Appointment is linked to the originating consultation via `parent_appointment_id`

**Implementation Notes:** Slash command handled by custom message composer in React Native / Next.js. `POST /api/v1/appointments/propose` creates a `PROPOSED` appointment. Stream message action callbacks route to Spring Boot `AppointmentController`. Calendar picker uses existing availability slots API.

---

## CHAT-014 — Multi-Party Group Channel (Doctor + Patient + Sponsor)

**Priority:** 🟡 P2  
**Area:** Chat  
**Who:** All  
**Story:** As a care team, we want a shared group channel so that the doctor, patient, and sponsor can coordinate openly and nothing important gets siloed.  
**Acceptance Criteria:**
- [ ] A "Care Team" group channel is automatically created when a sponsor is linked to a patient
- [ ] Channel members: doctor, patient, sponsor (additional sponsors if multiple)
- [ ] Doctor can mute sponsor in the channel without removing them (read-only sponsor mode)
- [ ] All three receive messages and file attachments
- [ ] Doctor can promote/demote sponsor's send permissions at any time

**Implementation Notes:** Stream channel type `care-team`. Create in `SponsorService.linkSponsor()`. Stream channel capabilities (`send-message` granted/revoked per member). Backend `PUT /api/v1/chat/care-team/{channelId}/permissions` to manage roles.

---

## VIDEO-001 — In-Call Chat Overlay (File Sharing During Consultation)

**Priority:** 🟠 P1  
**Area:** Video  
**Who:** Doctor / Patient / Sponsor  
**Story:** As a doctor on a video call, I want a slide-out chat panel so that I can share a document or link with the patient without ending the call to switch apps.  
**Acceptance Criteria:**
- [ ] A chat icon in the video toolbar opens a slide-out panel (Stream Chat embedded) without interrupting video/audio
- [ ] Files (PDFs, images) can be sent through this in-call chat
- [ ] Messages sent during the call are persisted in the same channel as async messages
- [ ] Chat panel is available on both web and mobile (bottom drawer on mobile)
- [ ] Unread badge on chat icon indicates new messages when panel is closed

**Implementation Notes:** Embed `StreamChat` component inside Daily.co call UI. Use existing channel — do not create a new one for in-call. Both Next.js (`DailyVideoRoom`) and React Native (`VideoCallScreen`) need the overlay component. Daily.co `useParticipantIds` hook still drives video grid.

---

## VIDEO-002 — Sponsor Observer Join Flow

**Priority:** 🟠 P1  
**Area:** Video  
**Who:** Sponsor  
**Story:** As an NRI Sponsor, I want to join my parent's teleconsultation as a silent observer so that I can hear the doctor's advice directly without disrupting the consultation.  
**Acceptance Criteria:**
- [ ] Sponsor receives a join link in their chat channel when the appointment goes `ACTIVE`
- [ ] Sponsor joins the same Daily.co room but their camera/mic defaults to OFF
- [ ] Doctor sees a "Sponsor joined as observer" toast; can mute/remove sponsor from the room
- [ ] Patient can optionally block sponsor from joining (consent toggle at booking time)
- [ ] Sponsor's participant metadata is tagged with role `sponsor` in Daily.co room

**Implementation Notes:** Daily.co room creation includes `enable_prejoin_ui: false` and custom meeting token with `is_owner: false` for sponsor. Spring Boot generates token via `POST /api/daily/rooms/{roomName}/tokens` with `user_data: { role: "sponsor" }`. Sponsor join triggers a Stream system message.

---

## VIDEO-003 — Video Fallback to Audio-Only Mode

**Priority:** 🟠 P1  
**Area:** Video  
**Who:** All  
**Story:** As a patient on a poor connection, I want the call to automatically degrade to audio-only so that the consultation can continue without dropping entirely.  
**Acceptance Criteria:**
- [ ] When network quality score drops below threshold (Daily.co network stats), UI suggests "Switch to Audio Only"
- [ ] Patient/Doctor can toggle their own video off; call continues with audio
- [ ] A chat system message logs: "Video disabled due to network conditions"
- [ ] If audio also degrades, fallback chat banner appears: "Video unavailable — continue via chat"
- [ ] Auto-rejoin attempt is offered every 60 seconds with a countdown

**Implementation Notes:** Daily.co `useNetworkConnectivity()` hook provides quality scores. Threshold: `<2/5` triggers suggestion. Fallback chat banner uses existing Stream channel. Mobile uses `react-native-daily-js` network events. Log event to `appointment_events` for quality analytics.

---

## VIDEO-004 — Post-Call Transcript & Recording Delivery

**Priority:** 🟡 P2  
**Area:** Video  
**Who:** Doctor / Patient / Sponsor  
**Story:** As a doctor, I want an auto-generated call transcript delivered to the consultation record so that I can review key points when writing SOAP notes, and optionally share a summary with the patient.  
**Acceptance Criteria:**
- [ ] If recording is enabled (consent obtained), Daily.co cloud recording is triggered on room creation
- [ ] On `meeting-ended` webhook, recording URL and transcript (via Whisper or Daily's transcription) are attached to the appointment record
- [ ] Doctor receives a chat message: "Recording and transcript ready: [link]"
- [ ] Transcript is stored in `appointment_transcripts` table; not shared with patient by default
- [ ] Doctor can send a selected portion of the transcript to the patient channel

**Implementation Notes:** Daily.co `enable_recording: "cloud"` and `enable_transcription: true` on room creation (only when consent flag is set). Webhook handler saves to `appointment_transcripts`. `StorageService` handles signed URL for transcript PDF. Transcription via Daily's built-in or piped to a Whisper endpoint.

---

## VIDEO-005 — No-Show Auto-End Room & Status Transition

**Priority:** 🔴 P0  
**Area:** Video  
**Who:** All  
**Story:** As the system, I want the appointment to auto-complete if the room is empty for 15+ minutes so that zombie `ACTIVE` appointments don't block downstream flows (EMR access, billing).  
**Acceptance Criteria:**
- [ ] If Daily.co room has zero participants for 15 consecutive minutes, a server-side job ends the meeting
- [ ] Appointment transitions: `ACTIVE → COMPLETED → LOCKED`
- [ ] A chat system message is sent to both parties: "Consultation session ended automatically"
- [ ] Idle room detection is implemented via Daily.co REST API polling or webhook `participant-left`
- [ ] `appointment_events` log records `AUTO_ENDED` with timestamp

**Implementation Notes:** Spring Boot scheduled job every 5 min: `GET /api/daily/rooms/{roomName}` to check `ongoing_session` and participant count. Or use Daily webhook `participant-left` and track last-participant-left time. `AppointmentService.autoEndIfEmpty()` handles state machine. Idempotency check prevents double-close.

---

## VIDEO-006 — Pre-Call Device Check

**Priority:** 🟠 P1  
**Area:** Video  
**Who:** Patient / Doctor  
**Story:** As a patient about to join a video consultation, I want a pre-call checklist to verify my camera, microphone, and internet speed so that technical issues are caught before the doctor's time is wasted.  
**Acceptance Criteria:**
- [ ] Joining a video room first lands on a "Pre-Call Check" screen (not directly in the room)
- [ ] Screen tests: camera preview, microphone level meter, speaker test, network speed indicator
- [ ] If any check fails, user sees a specific troubleshooting tip (e.g., "Check browser camera permissions")
- [ ] User can proceed even if checks fail (with a warning)
- [ ] Check results are logged for support analytics (`device_check_log` table)

**Implementation Notes:** Daily.co Prebuilt or custom UI using `DailyDeviceManager`. Pre-call screen route `/consultation/[id]/check` before `/consultation/[id]/room`. Network test via `navigator.connection` API or a ping to health endpoint. Results POST to `POST /api/v1/appointments/{id}/device-check-log`.

---

## VIDEO-007 — Waiting Room & "Doctor Is Ready" Notification

**Priority:** 🟠 P1  
**Area:** Video  
**Who:** Patient / Doctor  
**Story:** As a patient, I want to wait in a virtual waiting room until the doctor starts the call so that I'm not staring at an empty video grid for minutes.  
**Acceptance Criteria:**
- [ ] Patient joins early → lands in waiting room UI (not Daily.co room) with estimated wait time
- [ ] When doctor joins the Daily.co room, patient receives a push notification and in-app "Doctor is ready" prompt
- [ ] Patient can see a countdown to scheduled time in the waiting room
- [ ] Chat is available in the waiting room so patient can message the doctor while waiting
- [ ] Waiting room shows "Consultation in progress" if a previous patient ran over

**Implementation Notes:** Waiting room is a frontend-only state: patient is in channel but hasn't joined Daily room yet. Doctor join triggers Daily webhook `participant-joined` → Spring Boot → push notification via FCM/APNs → Stream system message "Dr. [Name] is ready, please join now." React Native `linking` handles deep link into the room.

---

## CONSULT-001 — Unified Consultation Timeline View

**Priority:** 🟡 P2  
**Area:** Both  
**Who:** Doctor / Patient / Sponsor  
**Story:** As a doctor, I want a single timeline view of a patient's consultation history (chat messages, video calls, lab results, prescriptions) so that I have full context before the next appointment.  
**Acceptance Criteria:**
- [ ] Timeline shows chronological events: appointments, key chat messages (doctor-flagged), lab results, prescriptions, SOAP notes
- [ ] Doctor can flag specific chat messages as "clinically relevant" to surface them in the timeline
- [ ] Sponsor view shows a filtered, non-PHI subset of the timeline
- [ ] Patient view shows their own timeline without SOAP internals
- [ ] Timeline is available from both web and mobile

**Implementation Notes:** `GET /api/v1/patients/{id}/timeline` aggregates from `appointments`, `prescriptions`, `lab_results`, `flagged_chat_events`. Stream messages are not stored in backend DB — use Stream's message search API to retrieve flagged messages by `extraData.flagged=true`. Response is role-filtered by `TimelineService`.

---

## CONSULT-002 — Prescription Notification with Pharmacy Routing

**Priority:** 🟠 P1  
**Area:** Both  
**Who:** Patient / Sponsor / Pharmacist  
**Story:** As a patient, I want a chat notification when my prescription is ready, with an option to route it to my preferred pharmacy so that I don't have to call anyone.  
**Acceptance Criteria:**
- [ ] When doctor finalizes prescription (post-`LOCKED`), patient receives chat message: "Your prescription is ready. Route to pharmacy?"
- [ ] Patient selects from saved pharmacies or enters a new one
- [ ] Prescription is electronically transmitted; pharmacist receives it in their portal
- [ ] Pharmacist can initiate a clarification chat with the doctor (links to CHAT-007)
- [ ] Sponsor also notified on their channel with "Prescription sent to [Pharmacy Name]"

**Implementation Notes:** `PrescriptionService.finalize()` → `ChatNotificationService.sendPrescriptionReady()`. Stream message with action button `{ type: "pharmacy_select" }`. Patient action POSTs to `POST /api/v1/prescriptions/{id}/route-to-pharmacy`. Pharmacy transmission is async (queue-backed).

---

## CONSULT-003 — End-of-Call SOAP Note Prompt with Chat Context

**Priority:** 🟠 P1  
**Area:** Both  
**Who:** Doctor  
**Story:** As a doctor, I want the SOAP note editor to auto-populate with bullet points from the in-call chat and any pre-consultation symptom messages the patient sent so that I don't have to retype things already discussed.  
**Acceptance Criteria:**
- [ ] After call ends (`COMPLETED`), doctor is presented with SOAP editor pre-filled with: patient's last 3 async symptom messages, in-call chat messages flagged by doctor during the call
- [ ] Doctor can accept, edit, or delete any auto-populated entry
- [ ] Pre-population is clearly marked "from patient chat" for audit trail
- [ ] SOAP note remains editable only while status is `COMPLETED` (before `LOCKED`)

**Implementation Notes:** `GET /api/v1/appointments/{id}/soap-prefill` fetches: Stream channel messages filtered by `extraData.flagged=true` (in-call), and last N async messages from patient. `SoapPrefillService` composes a draft. Frontend SOAP editor accepts a `prefill` prop. Lock transition remains unchanged.

---

## CONSULT-004 — Consent Capture Before Video Join

**Priority:** 🔴 P0  
**Area:** Both  
**Who:** Patient / Sponsor  
**Story:** As the platform, I want patients to digitally consent to the teleconsultation (including recording, if applicable) before entering the video room so that every session is legally defensible.  
**Acceptance Criteria:**
- [ ] First-time joining a consultation, patient sees a consent screen before pre-call check
- [ ] Consent covers: teleconsultation terms, optional recording consent, data processing
- [ ] Recording toggle is visible; if declined, Daily.co recording is NOT enabled on room creation
- [ ] Consent is stored in `consent_records` with appointment ID, user ID, timestamp, recording preference
- [ ] Returning patients see a brief reminder (not full form) if consent was given >90 days ago

**Implementation Notes:** `GET /api/v1/consent/check?appointmentId=X` returns `{ required: true/false, type: "full|reminder" }`. Consent submission `POST /api/v1/consent` stores record and returns a token included in the join-room request. `AppointmentService.createDailyRoom()` checks recording consent before setting `enable_recording`.

---

## CONSULT-005 — Sponsor Real-Time Care Update During Active Consultation

**Priority:** 🟡 P2  
**Area:** Both  
**Who:** Sponsor  
**Story:** As an NRI Sponsor who cannot join the video call, I want real-time chat updates from the doctor during the consultation so that I feel connected to my parent's care without being physically present.  
**Acceptance Criteria:**
- [ ] Doctor can toggle "Live Updates" mode during a call, sending brief chat messages to the sponsor channel in real time
- [ ] Example updates: "Examination started," "Prescribing [medication]," "Follow-up needed in 2 weeks"
- [ ] Sponsor sees a "🔴 Live" badge on the channel when consultation is active
- [ ] Messages are clearly marked as sent-during-call and include a timestamp
- [ ] Doctor can send updates with a single tap from a set of quick-reply templates

**Implementation Notes:** Sponsor channel (from CHAT-006) receives messages tagged `extraData: { liveUpdate: true, appointmentId }`. Doctor UI has a quick-message panel in the video call sidebar. `POST /api/v1/chat/live-update/{appointmentId}` sends to the sponsor channel. Stream's real-time delivery ensures instant delivery across time zones.

---

## CONSULT-006 — Technical Failure Fallback: Automatic Chat Escalation

**Priority:** 🟠 P1  
**Area:** Both  
**Who:** All  
**Story:** As a patient whose video call has completely failed, I want the system to automatically switch me to a chat-based consultation so that I still receive care even if technology fails.  
**Acceptance Criteria:**
- [ ] If patient cannot join the video room after 3 attempts (device check failures or Daily.co errors), a banner appears: "Video unavailable — switch to chat consultation"
- [ ] Doctor is notified via push notification and chat message: "Patient [Name] is experiencing video issues. Chat consultation suggested."
- [ ] Appointment type is logged as `CHAT_FALLBACK` in `appointment_events`
- [ ] Doctor can formally mark the chat as the consultation session for EMR/billing purposes
- [ ] At end of chat session, normal SOAP note flow is triggered

**Implementation Notes:** Frontend error boundary catches Daily.co join failures. After 3 retries (`MAX_JOIN_ATTEMPTS = 3`), redirect to `ChatFallbackConsultation` component. Push notification via `NotificationService`. `POST /api/v1/appointments/{id}/flag-chat-fallback` updates appointment metadata. Billing flag set accordingly.

---

## CONSULT-007 — Recurring Care Plan Check-In Messages

**Priority:** 🟡 P2  
**Area:** Both  
**Who:** Doctor / Patient  
**Story:** As a doctor managing a patient with a chronic condition, I want to schedule automated check-in messages to the patient at defined intervals so that I can monitor adherence without booking a full appointment.  
**Acceptance Criteria:**
- [ ] Doctor can create a care plan with check-in questions (e.g., "How is your blood pressure today?" "Did you take your medications?")
- [ ] Questions are sent as chat messages on the defined schedule (daily, weekly, etc.)
- [ ] Patient responds in chat; responses are tagged `extraData: { checkIn: true, carePlanId }`
- [ ] Doctor dashboard shows a check-in response summary card per patient
- [ ] If patient misses 3+ consecutive check-ins, doctor receives an alert

**Implementation Notes:** `CarePlanService` + `care_plans` and `care_plan_checkins` tables. Quartz scheduler job per plan. `ChatNotificationService.sendCheckIn()` posts the question. Stream message search for responses by `extraData.checkIn=true`. Missed check-in alert via `CarePlanAlertJob`.

---

## CONSULT-008 — Second Opinion Request via Chat

**Priority:** 🟢 P3  
**Area:** Both  
**Who:** Doctor / Patient / Sponsor  
**Story:** As a doctor, I want to invite a specialist into a patient's channel for a second opinion so that the patient benefits from multi-disciplinary care without leaving the platform.  
**Acceptance Criteria:**
- [ ] Doctor can search for specialist users in the platform and invite them to a care channel
- [ ] Specialist sees a summary of the patient's recent SOAP notes and relevant lab results (shared by primary doctor)
- [ ] Specialist can reply in the channel or schedule a separate video consultation
- [ ] Patient and sponsor are visible in the channel and can read the discussion
- [ ] Second opinion engagement is logged in `appointment_events` as `SECOND_OPINION_REQUESTED`

**Implementation Notes:** Stream channel member invite via `channel.addMembers([specialistStreamId])`. Access control: specialist sees only records shared by primary doctor (`shared_records` table). `GET /api/v1/patients/{id}/shared-summary` returns curated record set. Video booking reuses existing appointment flow.

---

## CONSULT-009 — Post-Consultation Patient Satisfaction Survey via Chat

**Priority:** 🟡 P2  
**Area:** Both  
**Who:** Patient / Sponsor  
**Story:** As the platform, I want to send a quick satisfaction survey in chat after each consultation so that we can track care quality and doctor performance.  
**Acceptance Criteria:**
- [ ] 30 minutes after appointment reaches `LOCKED`, a survey message is sent to the patient channel
- [ ] Survey has 3 quick questions (star ratings + optional comment)
- [ ] Patient responds inline via interactive message actions (1–5 stars)
- [ ] Sponsor also receives a survey on their channel
- [ ] Results stored in `consultation_feedback` table; visible in admin analytics dashboard

**Implementation Notes:** Scheduled job at `LOCKED + 30min`. `ChatNotificationService.sendSurvey()`. Stream interactive message with 5 action buttons per question. Survey responses POST to `POST /api/v1/feedback/consultation`. Admin dashboard reads from `consultation_feedback`. One survey per appointment per user (idempotency enforced).

---

## CONSULT-010 — Emergency Escalation Button in Chat & Video

**Priority:** 🟠 P1  
**Area:** Both  
**Who:** Patient / Sponsor  
**Story:** As a patient experiencing a medical emergency during a consultation, I want a one-tap emergency escalation so that the doctor is immediately alerted and emergency services guidance is provided.  
**Acceptance Criteria:**
- [ ] A persistent "🆘 Emergency" button is visible in both the video call UI and the chat interface
- [ ] Tapping sends an URGENT system message to the doctor channel: "⚠️ EMERGENCY ESCALATION — [Patient Name] — [Timestamp]"
- [ ] Emergency services guidance (call 112/911) is displayed immediately on screen
- [ ] Doctor receives an intrusive push notification that bypasses Do Not Disturb
- [ ] Event is logged in `appointment_events` as `EMERGENCY_ESCALATED` and triggers an email to clinic admin within 60 seconds

**Implementation Notes:** Emergency button is a persistent component in `VideoCallLayout` and `ChatScreen`. Tapping calls `POST /api/v1/appointments/{id}/emergency`. This sets `extraData.emergency=true` on the Stream message, bypasses normal push and sends via FCM high-priority `notification` (not `data`) message. Admin email via Spring `JavaMailSender`. Do not gate this behind auth refresh — call the emergency endpoint with cached token.

---

*Generated by Preventia PM — Sprint Planning Backlog v1.0*  
*Total tickets: 10 CHAT + 7 VIDEO + 10 CONSULT = 27 tickets*
