# Dhanvanthri — Sprint Directives
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

---

## How to activate an agent (copy-paste into openclaw chat)

### For the eng agent — start each session with:

```
Read eng/sprints/SPRINT-0X-<name>.md and execute all tasks in order.
Follow eng/SOUL.md for your persona and coding standards.
Commit after each task using:
  git config --local user.name "dhanvanthri ai"
  git config --local user.email "dhanvanthri.ai@gmail.com"
Do not start if the listed dependencies are not yet committed.
```

*(Replace `SPRINT-0X-<name>` with the current sprint filename)*

### For the ops agent — start each session with:

```
Read eng/sprints/SPRINT-05-nri-bridge-thyrocare.md and execute all tasks in order.
Follow ops/SOUL.md for your persona. Your mandate is in ops/INSTRUCTIONS.md.
Commit after each task using:
  git config --local user.name "dhanvanthri ai"
  git config --local user.email "dhanvanthri.ai@gmail.com"
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

