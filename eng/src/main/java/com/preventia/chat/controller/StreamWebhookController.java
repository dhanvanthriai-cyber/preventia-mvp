package com.preventia.chat.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Stream Chat webhook receiver — stub; handlers wired in SPRINT-09. */
@RestController
@RequestMapping("/api/v1/webhooks/stream")
public class StreamWebhookController {
    private static final Logger log = LoggerFactory.getLogger(StreamWebhookController.class);

    @Value("${stream.webhook-secret:STUB_SECRET}") private String webhookSecret;

    @PostMapping
    public ResponseEntity<Void> handle(HttpServletRequest request) {
        log.info("[StreamWebhook] Received event (stub — not yet processed)");
        return ResponseEntity.ok().build();
    }
}
