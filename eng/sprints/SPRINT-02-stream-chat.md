# SPRINT-02 — Stream Chat Integration (Web + Mobile)
**Agent:** eng | **Priority:** 🟠 HIGH | **Estimated time:** 4.5h
**Status:** ⬜ NOT STARTED
**Depends on:** SPRINT-01 committed ✅

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
  <dependency>
    <groupId>io.getstream</groupId>
    <artifactId>stream-chat</artifactId>
    <version>6.8.0</version>
  </dependency>
  ```
- `StreamChatService.generateToken(Long userId, String userName, String role)`:
  - Creates a Stream Chat user token using HMAC-SHA256 signed with `stream.api-secret`
  - Returns signed JWT string (Stream format — NOT the app's Spring JWT)
- `GET /api/v1/chat/token` — protected by JWT auth — returns `{ token, userId, apiKey }`
- `application.yml` additions:
  ```yaml
  stream:
    api-key: ${STREAM_API_KEY:STUB_KEY}
    api-secret: ${STREAM_API_SECRET:STUB_SECRET}
  ```

---

## TASK 2 — Stream Chat UI (Web doctor panel + Mobile patient screen)

**Web files to create:**
- `eng/web-app/src/components/ChatPanel.tsx`

**Web files to edit:**
- `eng/web-app/package.json` (add `stream-chat`, `stream-chat-react`)
- `eng/web-app/src/components/DoctorDashboard.tsx` (replace right-column "Peer Contacts" with ChatPanel)

**Mobile files to edit:**
- `eng/mobile-app/src/screens/patient/PatientChatScreen.tsx` (replace MOCK_THREADS with real Stream Chat)
- `eng/mobile-app/package.json` (add `stream-chat`, `stream-chat-expo`)

**Rules for `ChatPanel.tsx` (web):**
- Fetch Stream token from `GET /api/v1/chat/token`
- Init `StreamChat` client with `apiKey` from response
- Show channel list: threads `"Doctor: {doctorName}"` and `"Pharmacy: {pharmacyName}"`, type: `messaging`
- Use `<Chat>`, `<ChannelList>`, `<Channel>`, `<MessageList>`, `<MessageInput>` from `stream-chat-react`
- Style override: monospace font, black borders, 0 border-radius — match Neo-Brutalist theme

**Rules for `PatientChatScreen.tsx` (mobile):**
- Fetch token from `GET /api/v1/chat/token` using stored JWT
- Use `stream-chat-expo`: `<OverlayProvider>`, `<Chat>`, `<ChannelList>`
- Tapping a thread opens full-screen `<Channel>` with `<MessageList>` + `<MessageInput>`
- Keep existing Neo-Brutalist styles

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

