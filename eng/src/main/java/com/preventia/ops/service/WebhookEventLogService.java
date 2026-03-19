package com.preventia.ops.service;

import com.preventia.ops.domain.WebhookEventLog;
import com.preventia.ops.repository.WebhookEventLogRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class WebhookEventLogService {

    private final WebhookEventLogRepository webhookEventLogRepository;

    public WebhookEventLogService(WebhookEventLogRepository webhookEventLogRepository) {
        this.webhookEventLogRepository = webhookEventLogRepository;
    }

    public void record(String provider,
                       String endpoint,
                       String eventType,
                       String referenceId,
                       String roomName,
                       int statusCode,
                       Boolean signatureValid,
                       String payloadSummary) {
        WebhookEventLog event = new WebhookEventLog();
        event.setProvider(provider);
        event.setEndpoint(endpoint);
        event.setEventType(eventType);
        event.setReferenceId(referenceId);
        event.setRoomName(roomName);
        event.setStatusCode(statusCode);
        event.setSignatureValid(signatureValid);
        event.setPayloadSummary(payloadSummary);
        webhookEventLogRepository.save(event);
    }
}
