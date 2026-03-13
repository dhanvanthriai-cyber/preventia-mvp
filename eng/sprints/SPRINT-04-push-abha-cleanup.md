# SPRINT-04 — Push Notifications + ABHA Profile + Legacy Cleanup
**Agent:** eng | **Priority:** 🟡 MEDIUM | **Estimated time:** 3.5h
**Status:** ⬜ NOT STARTED
**Depends on:** SPRINT-03 committed ✅

---

## TASK 1 — Remove legacy directory

```bash
git rm -r eng/healthcare-mvp-mobile/
grep -r "healthcare-mvp-mobile" eng/mobile-app eng/web-app eng/shared  # must return nothing
git commit -m "chore: remove superseded healthcare-mvp-mobile directory"
```

---

## TASK 2 — Push notifications (backend + mobile)

**Backend files to create:**
- `eng/src/main/java/com/dhanvanthri/notification/service/NotificationService.java`
- `eng/src/main/java/com/dhanvanthri/notification/domain/DeviceToken.java`
- `eng/src/main/java/com/dhanvanthri/notification/repository/DeviceTokenRepository.java`
- `eng/src/main/java/com/dhanvanthri/notification/controller/DeviceTokenController.java`
- `eng/src/main/resources/db/migration/V9__device_tokens.sql`

**Backend files to edit:**
- `eng/pom.xml` (add `firebase-admin`)
- `eng/src/main/resources/application.yml` (add firebase config)
- `eng/src/main/java/com/dhanvanthri/clinical/scheduler/PrescriptionSlaScheduler.java` (notify on SLA breach)
- `eng/src/main/java/com/dhanvanthri/appointment/service/AppointmentService.java` (notify 24h before)

**Mobile files to create:**
- `eng/mobile-app/src/hooks/useNotifications.ts`

**Mobile files to edit:**
- `eng/mobile-app/App.tsx` (register for push on startup)

**Backend rules:**
- Add to `pom.xml`:
  ```xml
  <dependency>
    <groupId>com.google.firebase</groupId>
    <artifactId>firebase-admin</artifactId>
    <version>9.3.0</version>
  </dependency>
  ```
- `DeviceToken` entity: `id`, `userId` (FK), `token` (FCM string), `platform` (ANDROID/IOS), `createdAt`, `updatedAt`
- `POST /api/v1/devices/token` — JWT-protected — saves/updates FCM token for logged-in user
- `NotificationService.sendToUser(Long userId, String title, String body)`:
  - Looks up all `DeviceToken`s for `userId`
  - Sends via `FirebaseMessaging.getInstance().send(message)`
  - Removes invalid tokens from DB on `UNREGISTERED` error
- V9 migration:
  ```sql
  CREATE TABLE device_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(512) NOT NULL,
    platform VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, platform)
  );
  ```
- `application.yml`: `firebase.credentials-path: ${FIREBASE_CREDENTIALS_PATH:classpath:firebase-stub.json}`
- Triggers:
  - `AppointmentService`: schedule notification 24h before `startTime` using Spring's `TaskScheduler`
  - `PrescriptionSlaScheduler`: on SLA breach → `notificationService.sendToUser(pharmacistId, "SLA BREACH", "Prescription review overdue")`

**Mobile `useNotifications.ts` rules:**
- Request permissions via `expo-notifications`
- Get push token via `Notifications.getExpoPushTokenAsync()`
- `POST /api/v1/devices/token` with `Authorization` header
- Listen with `Notifications.addNotificationReceivedListener`
- Return `{ expoPushToken, permissionGranted }`
- Call from `App.tsx` root after auth

---

## TASK 3 — ABHA / NRI Profile fields UI (mobile)

**Files to create:**
- `eng/mobile-app/src/screens/patient/PatientProfileEditScreen.tsx`

**Files to edit:**
- `eng/mobile-app/src/screens/patient/PatientProfileScreen.tsx` (add "Edit Profile" button)
- `eng/mobile-app/src/navigation/types.ts` (add `ProfileEdit` to Patient nav params)
- `eng/mobile-app/src/navigation/PatientNavigator.tsx` (register `ProfileEdit` screen)

**`PatientProfileEditScreen.tsx` rules:**
- Fields: Full Name, ABHA ID (format `##-####-####-####`, inline hint), Phone (+91), Country of Residence (dropdown: India/USA/UK/Canada/Australia/Other), NRI toggle
- `PUT /api/v1/users/{userId}/profile` (check `FamilyController` first; add if missing)
- Validate ABHA ID with regex: `/^\d{2}-\d{4}-\d{4}-\d{4}$/`
- "SAVE PROFILE" button in Neo-Brutalist ActionCard style
- On save: navigate back to ProfileScreen with success banner

---

## Completion Checklist

- [ ] `eng/healthcare-mvp-mobile/` is gone from repo
- [ ] `POST /api/v1/devices/token` saves FCM token
- [ ] `NotificationService` sends FCM messages (log output confirms in stub mode)
- [ ] V9 migration applied cleanly
- [ ] `PatientProfileEditScreen` renders and validates ABHA ID format
- [ ] All migrations: `podman exec dhanvanthri-postgres psql -U dhan_dev -d dhanvanthri_db -c "SELECT version, description FROM flyway_schema_history ORDER BY installed_rank;"`

## Commit

```bash
git add -A
git commit -m "feat(notifications+profile): FCM push, ABHA profile edit, remove legacy mobile dir"
git push origin main
```

