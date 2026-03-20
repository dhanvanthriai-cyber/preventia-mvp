# Preventia — Sprint Directives
**One file per sprint. One sprint per agent session.**

---

## Sprint Queue

| Sprint | Agent | File | Status | Depends on |
|--------|-------|------|--------|------------|
| SPRINT-01 | eng | [SPRINT-01-video-auth-refresh.md](./SPRINT-01-video-auth-refresh.md) | ⬜ NOT STARTED | — |
| SPRINT-02 | eng | [SPRINT-02-stream-chat.md](./SPRINT-02-stream-chat.md) | ⬜ NOT STARTED | SPRINT-01 ✅ |
| SPRINT-03 | eng | [SPRINT-03-razorpay-sponsor.md](./SPRINT-03-razorpay-sponsor.md) | ⬜ NOT STARTED | SPRINT-02 ✅ |
| SPRINT-04 | eng | [SPRINT-04-push-abha-cleanup.md](./SPRINT-04-push-abha-cleanup.md) | ⬜ NOT STARTED | SPRINT-03 ✅ |
| SPRINT-05 | ops | [SPRINT-05-nri-bridge-thyrocare.md](./SPRINT-05-nri-bridge-thyrocare.md) | ⬜ NOT STARTED | SPRINT-04 ✅ |
| SPRINT-06 | pm  | [SPRINT-06-pm-tracking.md](./SPRINT-06-pm-tracking.md) | 🔄 ONGOING | Run daily |
| SPRINT-07 | eng | [SPRINT-07-chat-video-foundation.md](./SPRINT-07-chat-video-foundation.md) | ✅ DONE | Bug fixes ✅ (305f200) |
| SPRINT-07-OPS | ops | (infra — see below) | ✅ DONE | Parallel with SPRINT-07 |
| SPRINT-08 | eng | [SPRINT-08-chat-video-care-comms.md](./SPRINT-08-chat-video-care-comms.md) | ⬜ NOT STARTED | SPRINT-07 ✅ + SPRINT-07-OPS ✅ |
| SPRINT-09 | eng | [SPRINT-09-chat-video-clinical-handoff.md](./SPRINT-09-chat-video-clinical-handoff.md) | ⬜ NOT STARTED | SPRINT-08 ✅ |
| SPRINT-10 | eng | [SPRINT-10-chat-video-polish.md](./SPRINT-10-chat-video-polish.md) | ⬜ NOT STARTED | SPRINT-09 ✅ |

---

## Chat & Video Ticket Coverage

| Ticket | Sprint | Priority | Status |
|--------|--------|----------|--------|
| CHAT-001 — Dynamic doctor-patient channel wiring | SPRINT-07 | 🔴 P0 | ✅ |
| VIDEO-005 — Zombie room auto-termination | SPRINT-07 | 🔴 P0 | ✅ |
| CONSULT-004 — Consent gate before video | SPRINT-07 | 🔴 P0 | ✅ |
| VIDEO-007 — Waiting room + doctor-ready notification | SPRINT-07 | 🟠 P1 | ✅ |
| VIDEO-001 — In-call chat overlay | SPRINT-07 | 🟠 P1 | ✅ |
| CHAT-002 — Appointment confirmation message | SPRINT-07 | 🟠 P1 | ✅ |
| CHAT-003 — Pre-consultation reminder messages | SPRINT-08 | 🟠 P1 | ⬜ |
| CHAT-005 — Urgent message flag + SLA alert | SPRINT-08 | 🟠 P1 | ⬜ |
| CHAT-006 — Sponsor-doctor update channel | SPRINT-08 | 🟠 P1 | ⬜ |
| CHAT-007 — Pharmacist-doctor clarification channel | SPRINT-08 | 🟠 P1 | ⬜ |
| CHAT-010 — Patient no-show auto-message | SPRINT-08 | 🟠 P1 | ⬜ |
| CHAT-011 — Doctor no-show auto-message | SPRINT-08 | 🟠 P1 | ⬜ |
| VIDEO-002 — Sponsor observer join flow | SPRINT-08 | 🟠 P1 | ⬜ |
| VIDEO-003 — Audio-only fallback on poor network | SPRINT-08 | 🟠 P1 | ⬜ |
| VIDEO-006 — Pre-call device check | SPRINT-08 | 🟠 P1 | ⬜ |
| CONSULT-010 — Emergency escalation button | SPRINT-08 | 🟠 P1 | ⬜ |
| CONSULT-006 — Video failure → chat fallback | SPRINT-08 | 🟠 P1 | ⬜ |
| CHAT-004 — Patient async symptom updates + attachments | SPRINT-09 | 🟠 P1 | ⬜ |
| CHAT-008 — Lab results notification | SPRINT-09 | 🟠 P1 | ⬜ |
| CHAT-009 — Consent document via chat | SPRINT-09 | 🟠 P1 | ⬜ |
| CHAT-012 — Post-consultation SOAP summary | SPRINT-09 | 🟠 P1 | ⬜ |
| CONSULT-002 — Prescription notification + pharmacy routing | SPRINT-09 | 🟠 P1 | ⬜ |
| CONSULT-003 — SOAP pre-population from chat context | SPRINT-09 | 🟠 P1 | ⬜ |
| CONSULT-005 — Sponsor live updates during consultation | SPRINT-09 | 🟡 P2 | ⬜ |
| CHAT-013 — Follow-up appointment scheduling via chat | SPRINT-09 | 🟡 P2 | ⬜ |
| CHAT-014 — Multi-party care team group channel | SPRINT-10 | 🟡 P2 | ⬜ |
| CONSULT-001 — Unified consultation timeline | SPRINT-10 | 🟡 P2 | ⬜ |
| VIDEO-004 — Post-call transcript + recording | SPRINT-10 | 🟡 P2 | ⬜ |
| CONSULT-007 — Recurring care plan check-ins | SPRINT-10 | 🟡 P2 | ⬜ |
| CONSULT-009 — Satisfaction survey | SPRINT-10 | 🟡 P2 | ⬜ |
| CONSULT-008 — Second opinion request | SPRINT-10 | 🟢 P3 | ⬜ |

---

## How to activate an agent (copy-paste into openclaw chat)

### For the eng agent — start each session with:

```
Read eng/sprints/SPRINT-0X-<name>.md and execute all tasks in order.
Follow eng/SOUL.md for your persona and coding standards.
Commit after each task using:
  git config --local user.name "preventia ai"
  git config --local user.email "preventia.ai@gmail.com"
Do not start if the listed dependencies are not yet committed.
```

*(Replace `SPRINT-0X-<name>` with the current sprint filename)*

### For the ops agent — start each session with:

```
Read eng/sprints/SPRINT-05-nri-bridge-thyrocare.md and execute all tasks in order.
Follow ops/SOUL.md for your persona. Your mandate is in ops/INSTRUCTIONS.md.
Commit after each task using:
  git config --local user.name "preventia ai"
  git config --local user.email "preventia.ai@gmail.com"
```

### For the pm agent — start each session with:

```
Read eng/sprints/SPRINT-06-pm-tracking.md and execute all tasks.
Follow pm/SOUL.md for your persona. Reporting format is in pm/INSTRUCTIONS.md.
```

---

## Credential checklist — add to `eng/.env` before starting agents

| Var | Where to get | Time | Needed for |
|-----|-------------|------|-----------|
| `DAILY_API_KEY` | dashboard.daily.co → Developers → API Key | 5 min (free) | SPRINT-01 |
| `DAILY_WEBHOOK_SECRET` | dashboard.daily.co → Webhooks | 5 min | SPRINT-01 |
| `STREAM_API_KEY` | dashboard.getstream.io → App → API Credentials | 10 min (free) | SPRINT-02 |
| `STREAM_API_SECRET` | same as above | — | SPRINT-02 |
| `RAZORPAY_API_KEY` | dashboard.razorpay.com → Settings → API Keys (Test Mode) | 10 min | SPRINT-03 |
| `RAZORPAY_API_SECRET` | same as above | — | SPRINT-03 |
| `RAZORPAY_WEBHOOK_SECRET` | dashboard.razorpay.com → Webhooks | 5 min | SPRINT-03 |
| `FIREBASE_CREDENTIALS_PATH` | console.firebase.google.com → Service Accounts → Generate key | 15 min | SPRINT-04 |

**Total setup time: ~50 minutes. Get all credentials before Day 1.**

