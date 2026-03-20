package com.preventia.shared.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.util.Map;

/**
 * PushNotificationService — FCM stub. Set FIREBASE_ENABLED=true and drop
 * firebase-credentials.json to activate. Stub mode logs all pushes safely.
 */
@Service
public class PushNotificationService {
    private static final Logger log = LoggerFactory.getLogger(PushNotificationService.class);

    @Value("${app.firebase.enabled:false}") private boolean firebaseEnabled;

    public void send(String fcmToken, String title, String body,
                     boolean highPriority, Map<String, String> data) {
        if (!firebaseEnabled || fcmToken == null || fcmToken.isBlank()) {
            log.info("[Push] STUB — '{}' highPriority={}", title, highPriority);
            return;
        }
        // Wire firebase-admin SDK here when credentials present:
        // Message.builder().setToken(fcmToken)
        //   .setNotification(Notification.builder().setTitle(title).setBody(body).build())
        //   .setAndroidConfig(AndroidConfig.builder()
        //     .setPriority(highPriority ? HIGH : NORMAL).build())
        //   .putAllData(data).build()
        // FirebaseMessaging.getInstance().send(message)
        log.info("[Push] Would send FCM to {}...: '{}'",
            fcmToken.length() > 8 ? fcmToken.substring(0, 8) : fcmToken, title);
    }
}
