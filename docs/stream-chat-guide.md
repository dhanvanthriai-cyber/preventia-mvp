# Stream Chat — Manual Testing Guide

## Current Status
Your `.env` file has **no `STREAM_API_KEY` or `STREAM_API_SECRET`**, so the backend is
currently in **STUB mode**. You'll go through two stages of testing:

---

## Stage 1 — Test Stub Mode (no credentials needed, right now)

This confirms the plumbing (backend → frontend) is wired correctly before
you add real keys.

### Step 1 — Start the backend
```bash
cd /Users/satishjonnala/Documents/Dhanvantri/dhanvanthri-mvp/eng
zsh restart.sh
```

### Step 2 — Log in and get a JWT
```bash
curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"patient@test.com","password":"password"}' | jq .
```
Copy the `token` value from the response. Then:

### Step 3 — Hit the chat token endpoint directly
```bash
curl -s http://localhost:8080/api/v1/chat/token \
  -H "Authorization: Bearer <YOUR_JWT_HERE>" | jq .
```

**Expected response in STUB mode:**
```json
{
  "token":  "stub_token_1",
  "userId": "1",
  "apiKey": "STUB_KEY"
}
```
✅ If you see `"apiKey": "STUB_KEY"` — the backend endpoint is alive and auth is working.  
❌ `401 Unauthorized` — your JWT is wrong or expired.  
❌ `404 Not Found` — the backend isn't running or the route isn't mapped.

### Step 4 — Verify the UI shows the stub placeholder
Open `http://localhost:3000/patient` in your browser, log in as a patient,
click **💬 MESSAGE DOCTOR** or the **MESSAGES** tab.

You should see the stub placeholder card:
> 💬 STREAM CHAT  
> Live chat powered by Stream  
> Stream credentials active — waiting for backend connection.

✅ Stub UI is rendered correctly — ChatPanel is loading and receiving the response.

---

## Stage 2 — Test with Real Stream Credentials

### Step 1 — Get your Stream API keys
1. Go to [https://dashboard.getstream.io](https://dashboard.getstream.io)
2. Create a free account (or log in)
3. Create an app → choose **Chat** → name it `dhanvanthri-mvp`
4. From the app Overview page, copy:
    - **API Key** (always visible)
    - **API Secret** (click "Show Secret")

### Step 2 — Add keys to your .env
```bash
# Add these two lines to eng/.env
echo 'STREAM_API_KEY=your_api_key_here' >> /Users/satishjonnala/Documents/Dhanvantri/dhanvanthri-mvp/eng/.env
echo 'STREAM_API_SECRET=your_api_secret_here' >> /Users/satishjonnala/Documents/Dhanvantri/dhanvanthri-mvp/eng/.env
```
Also add `STREAM_API_KEY` and `STREAM_API_SECRET` to `docker-compose.yml` env block
(they're currently missing from it).

### Step 3 — Restart the backend
```bash
cd /Users/satishjonnala/Documents/Dhanvantri/dhanvanthri-mvp/eng
zsh restart.sh
```

### Step 4 — Verify the token is a real JWT
```bash
# Get a JWT first (patient login)
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"patient@test.com","password":"password"}' | jq -r .token)

# Hit the chat token endpoint
curl -s http://localhost:8080/api/v1/chat/token \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Expected response with real keys:**
```json
{
  "token":  "eyJhbGciOiJIUzI1NiJ9...",
  "userId": "1",
  "apiKey": "abc123xyz"
}
```
✅ `apiKey` is your real Stream key (not `STUB_KEY`)  
✅ `token` starts with `eyJ` — it's a real HS256 JWT

### Step 5 — Decode and verify the token payload
Paste the `token` value into [https://jwt.io](https://jwt.io).

**The payload must look exactly like this:**
```json
{
  "user_id": "1"
}
```
> ⚠️ Stream is strict — the claim name must be `user_id` (not `sub`, not `userId`).
> The `StreamChatService.java` in this project generates it correctly.

**Also verify the signature:**
- Algorithm: `HS256`
- Secret: paste your `STREAM_API_SECRET` into the "verify signature" box
- It should show ✅ **Signature Verified**

### Step 6 — Test the full UI flow (patient → doctor)

**In Browser Tab 1 — Patient:**
1. Open `http://localhost:3000/patient`, log in as patient
2. Click **💬 MESSAGE DOCTOR** → MESSAGES tab opens
3. The Channel list should load (empty if no channels exist yet — that's normal)

**In Browser Tab 2 — Doctor:**
1. Open `http://localhost:3000/doctor` in an incognito window, log in as doctor
2. The **PEER MESSAGES** section in the left column should show the ChatPanel

**Create a test channel and send a message:**
Since no channels exist yet, you need to create one first. Run this in the
browser console on the **patient** page to create a channel and send a message:

```javascript
// Open browser DevTools → Console on the patient's /patient page
// This simulates what will happen automatically when appointment-based
// channel creation is wired up in the backend.

const { StreamChat } = await import('stream-chat');

// Use the token values from the curl response above
const client = StreamChat.getInstance('YOUR_API_KEY');
await client.connectUser({ id: '1', name: 'Test Patient' }, 'YOUR_PATIENT_TOKEN');

const channel = client.channel('messaging', 'appt-test-1', {
  name: 'Test Consultation',
  members: ['1', '2'],  // patient userId, doctor userId
});
await channel.create();
await channel.sendMessage({ text: 'Hello Doctor, this is a test message!' });
console.log('✅ Channel created and message sent!');
```

Both the patient MESSAGES tab and the doctor PEER MESSAGES panel should now
show the channel and the message in real-time.

---

## Quick Checklist

| Check | Command / Action | Expected |
|-------|-----------------|----------|
| Backend alive | `curl localhost:8080/actuator/health` | `{"status":"UP"}` |
| Login works | POST `/api/v1/auth/login` | Returns `token` |
| Chat token endpoint | GET `/api/v1/chat/token` + Bearer JWT | Returns `{token, userId, apiKey}` |
| Stub mode (no keys) | `apiKey` in response | `"STUB_KEY"` |
| Real mode (with keys) | `apiKey` in response | Your actual Stream API key |
| Token format | Paste into jwt.io | Payload = `{"user_id":"<n>"}`, sig verified |
| Patient UI | Click MESSAGE DOCTOR | MESSAGES tab opens, ChatPanel renders |
| Doctor UI | `/doctor` page | PEER MESSAGES section shows ChatPanel |
