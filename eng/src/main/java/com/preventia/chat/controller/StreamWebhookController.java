package com.preventia.chat.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.preventia.chat.domain.UrgentMessageAlert;
import com.preventia.chat.repository.UrgentMessageAlertRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.util.Map;

/**
 * Stream Chat webhook receiver.
 *
 * SPRINT-08 CHAT-005: Listens for message.new events with extraData.urgent=true
 * and records them in urgent_message_alerts for SLA monitoring.
 */
@RestController
@RequestMapping("/api/v1/webhooks/stream")
public class StreamWebhookController {

    private static final Logger log = LoggerFactory.getLogger(StreamWebhookController.class);

    @Value("${stream.webhook-secret:STUB_SECRET}")
    private String webhookSecret;

    private final UrgentMessageAlertRepository urgentAlertRepository;
    private final ObjectMapper objectMapper;

    public StreamWebhookController(UrgentMessageAlertRepository urgentAlertRepository,
                                   ObjectMapper objectMapper) {
        this.urgentAlertRepository = urgentAlertRepository;
        this.objectMapper          = objectMapper;
    }

    @PostMapping
    public ResponseEntity<Void> handle(HttpServletRequest request) {
        byte[] body;
        try {
            body = request.getInputStream().readAllBytes();
        } catch (IOException e) {
            log.warn("[StreamWebhook] Failed to read body: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }

        Map<String, Object> payload;
        try {
            payload = objectMapper.readValue(body, new TypeReference<>() {});
        } catch (IOException e) {
            log.warn("[StreamWebhook] Failed to parse payload: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }

        String type = String.valueOf(payload.getOrDefault("type", ""));
        log.info("[StreamWebhook] Received event type={}", type);

        if ("message.new".equals(type)) {
            handleNewMessage(payload);
        }

        return ResponseEntity.ok().build();
    }

    @SuppressWarnings("unchecked")
    private void handleNewMessage(Map<String, Object> payload) {
        try {
            Object messageObj = payload.get("message");
            if (!(messageObj instanceof Map<?, ?> messageMap)) return;

            Map<String, Object> message = (Map<String, Object>) messageMap;
            String messageId = String.valueOf(message.getOrDefault("id", ""));

            Object extraDataObj = message.get("extra_data");
            if (!(extraDataObj instanceof Map<?, ?> extraDataMap)) return;

            Map<String, Object> extraData = (Map<String, Object>) extraDataMap;
            Object urgentFlag = extraData.get("urgent");

            if (Boolean.TRUE.equals(urgentFlag) || "true".equals(String.valueOf(urgentFlag))) {
                // Extract channel_id from the payload
                Object channelObj = payload.get("channel_id");
                String channelId = channelObj != null ? String.valueOf(channelObj) : "unknown";

                if (!urgentAlertRepository.existsByChannelIdAndMessageId(channelId, messageId)) {
                    urgentAlertRepository.save(new UrgentMessageAlert(channelId, messageId));
                    log.info("[StreamWebhook] Urgent message registered: channel={} message={}", channelId, messageId);
                }
            }
        } catch (Exception e) {
            log.warn("[StreamWebhook] Error processing message.new event: {}", e.getMessage());
        }
    }
}
