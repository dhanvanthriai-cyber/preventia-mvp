# SPRINT-02 — Stream Chat Integration (Web + Mobile)
**Agent:** eng | **Priority:** 🟠 HIGH | **Estimated time:** 4.5h
**Status:** ⬜ NOT STARTED
**Depends on:** SPRINT-01 committed ✅

---

## 🔑 Manual Setup Required BEFORE Running This Sprint

**You (Satish) must complete this — agents cannot do it.**
Estimated time: **10 minutes**.

### Step 1 — Create a Stream account and app
1. Go to **https://getstream.io** → click **Start for Free**
2. Sign up with GitHub or email (use `dhanvanthri.ai@gmail.com`)
3. When asked "What are you building?" → select **Chat Messaging**
4. Give the app a name: `dhanvanthri-mvp`
5. Select region: **Mumbai (ap-south-1)** if available, otherwise Singapore

### Step 2 — Get your credentials
1. In the Stream dashboard → **App Settings** → **Overview**
2. Copy these two values:

| What | Where in dashboard | Env var name |
|------|--------------------|--------------|
| **API Key** | Shown at top of Overview | `STREAM_API_KEY` |
| **API Secret** | Click "Show Secret" button | `STREAM_API_SECRET` |

### Step 3 — Add to your `.env` file
Open `eng/.env` and add:
```
STREAM_API_KEY=your_key_here
STREAM_API_SECRET=your_secret_here
```

### Step 4 — No webhook setup needed for MVP
Stream Chat does not require a webhook for basic messaging. Webhooks are only needed for moderation/event mirroring — skip for now.

### Free tier limits (more than enough for MVP)
| Limit | Free tier |
|-------|-----------|
| Monthly Active Users | 100 |
| Messages / month | Unlimited (with MAU limit) |
| Channels | Unlimited |
| Cost | **$0** |

---

---

## Pre-flight checks (run before starting)

```bash
cd eng/shared && npm install && echo "shared OK"
curl http://localhost:8080/actuator/health  # must return {"status":"UP"}
```

---

## TASK 1 — Stream Chat backend token service

**Files to create:**
- `eng/src/main/java/com/dhanvanthri/chat/controller/ChatController.java`
- `eng/src/main/java/com/dhanvanthri/chat/service/StreamChatService.java`
- `eng/src/main/java/com/dhanvanthri/chat/dto/ChatTokenResponse.java`

**Files to edit:**
- `eng/pom.xml` (add stream-chat dependency)
- `eng/src/main/resources/application.yml` (add stream config block)
- `eng/src/main/java/com/dhanvanthri/shared/config/SecurityConfig.java` (protect `/api/v1/chat/**`)
- `eng/.env.example` (add STREAM_API_KEY, STREAM_API_SECRET)

**Rules:**
- Add to `pom.xml`:
  ```xml
  <!-- Stream Chat server-side Java SDK -->
  <!-- Correct artifact: io.getstream:stream-java (NOT stream-chat) -->
  <dependency>
    <groupId>io.getstream</groupId>
    <artifactId>stream-java</artifactId>
    <version>1.1.0</version>
  </dependency>
  ```
- `StreamChatService.generateToken(Long userId, String userName, String role)`:
  - Use `io.getstream.client.Client` to create a server-side client:
    ```java
    Client client = Client.builder(apiKey, apiSecret).build();
    UserToken token = client.createUserToken(userId.toString());
    return token.getToken();
    ```
  - Also upsert the user on Stream so their name/role is set:
    ```java
    client.upsertUsers(UserRequestObject.builder()
        .id(userId.toString())
        .name(userName)
        .role(role.toLowerCase())
        .build());
    ```
- `GET /api/v1/chat/token` — protected by JWT auth — returns `{ token, userId, apiKey }`
- `application.yml` additions:
  ```yaml
  stream:
    api-key: ${STREAM_API_KEY:STUB_KEY}
    api-secret: ${STREAM_API_SECRET:STUB_SECRET}
  ```
- If `STREAM_API_KEY` is `STUB_KEY`, return a stub token response without calling Stream (graceful local dev)

---

## TASK 2 — Stream Chat UI (Web doctor panel + Mobile patient screen)

**Web files to create:**
- `eng/web-app/src/components/ChatPanel.tsx`

**Web files to edit:**
- `eng/web-app/package.json` (add `stream-chat@^8.x`, `stream-chat-react@^12.x`)
- `eng/web-app/src/components/DoctorDashboard.tsx` (replace right-column "Peer Contacts" with ChatPanel)

**Mobile files to edit:**
- `eng/mobile-app/src/screens/patient/PatientChatScreen.tsx` (replace MOCK_THREADS with real Stream Chat)
- `eng/mobile-app/package.json` (add `stream-chat@^8.x`, `stream-chat-react-native@^5.x`)

> ⚠️ **Correct package names:**
> - Web: `stream-chat` + `stream-chat-react` (NOT stream-chat-js)
> - Mobile: `stream-chat` + `stream-chat-react-native` (NOT stream-chat-expo)
> - Both use the same `stream-chat` core JS SDK; only the UI layer differs

**Rules for `ChatPanel.tsx` (web):**
- Fetch Stream token from `GET /api/v1/chat/token`
- Init `StreamChat` client with `apiKey` from response
- Show channel list: threads `"Doctor: {doctorName}"` and `"Pharmacy: {pharmacyName}"`, type: `messaging`
- Use `<Chat>`, `<ChannelList>`, `<Channel>`, `<MessageList>`, `<MessageInput>` from `stream-chat-react`
- Style override: monospace font, black borders, 0 border-radius — match Neo-Brutalist theme

**Rules for `PatientChatScreen.tsx` (mobile):**
- Fetch token from `GET /api/v1/chat/token` using stored JWT
- Use `stream-chat-react-native`: `<OverlayProvider>`, `<Chat>`, `<ChannelList>`, `<Channel>`, `<MessageList>`, `<MessageInput>`
- Import from `'stream-chat-react-native'` (NOT `'stream-chat-expo'`)
- Tapping a thread navigates to a full-screen Channel view with `<MessageList>` + `<MessageInput>`
- Keep existing Neo-Brutalist styles (monospace, black borders)

---

## Completion Checklist

- [ ] `GET /api/v1/chat/token` returns `{ token, userId, apiKey }` for authenticated users
- [ ] Doctor Dashboard right column shows ChatPanel (not static "Peer Contacts")
- [ ] PatientChatScreen shows real channel list (not MOCK_THREADS)
- [ ] `npm install` completes cleanly in both `web-app` and `mobile-app`

## Commit

```bash
git add -A
git commit -m "feat(chat): Stream Chat integration — web panel + mobile patient screen"
git push origin main
```

