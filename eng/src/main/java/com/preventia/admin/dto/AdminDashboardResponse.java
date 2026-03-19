package com.preventia.admin.dto;

import java.util.List;

public record AdminDashboardResponse(
    String generatedAt,
    PulseMetrics pulseMetrics,
    UnifiedUserManagement unifiedUserManagement,
    ClinicalVerification clinicalVerification,
    VideoOperations videoOperations,
    PaperTrail paperTrail
) {
    public record PulseMetrics(
        int totalUsers,
        int patients,
        int doctors,
        int pharmacists,
        int admins,
        int liveConsultations,
        int scheduledToday,
        int upcomingAppointments,
        int pendingPrescriptions,
        int awaitingClarification,
        int labExceptions,
        int missingRoomLinks,
        int criticalRefills,
        int paymentsCapturedToday,
        int webhookFailuresLast24Hours,
        int auditEventsToday,
        List<String> watchlist
    ) {}

    public record UnifiedUserManagement(
        UserCounts counts,
        List<ManagedUserItem> recentUsers,
        List<ManagedUserItem> directory
    ) {}

    public record UserCounts(
        int total,
        int patients,
        int doctors,
        int pharmacists,
        int sponsors,
        int admins
    ) {}

    public record ManagedUserItem(
        Long userId,
        String name,
        String email,
        String role,
        String createdAt,
        String lastActivityAt,
        int activityCount,
        String activityLabel
    ) {}

    public record ClinicalVerification(
        VerificationCounts counts,
        List<PrescriptionItem> prescriptions,
        List<LabOrderItem> labOrders
    ) {}

    public record VerificationCounts(
        int pendingPrescriptions,
        int awaitingClarification,
        int slaBreaches,
        int openLabOrders,
        int coldChainBreaches
    ) {}

    public record PrescriptionItem(
        Long soapNoteId,
        String patientName,
        String doctorName,
        String status,
        String uploadedAt,
        Integer daysRemaining,
        boolean slaBreached
    ) {}

    public record LabOrderItem(
        Long labOrderId,
        String patientName,
        String testName,
        String partner,
        String status,
        String scheduledAt,
        String collectedAt,
        String resultedAt,
        boolean coldChainBreached,
        boolean requiresAttention
    ) {}

    public record VideoOperations(
        VideoMetrics metrics,
        WebhookMetrics webhookMetrics,
        List<AppointmentItem> liveAppointments,
        List<AppointmentItem> upcomingAppointments,
        List<WebhookEventItem> recentWebhookEvents
    ) {}

    public record VideoMetrics(
        int liveConsultations,
        int scheduledToday,
        int upcomingAppointments,
        int completedToday,
        int missingRoomLinks
    ) {}

    public record WebhookMetrics(
        int totalLast24Hours,
        int failedLast24Hours,
        int invalidSignaturesLast24Hours
    ) {}

    public record AppointmentItem(
        Long appointmentId,
        String patientName,
        String doctorName,
        String status,
        String startTime,
        String endTime,
        String roomName,
        boolean roomProvisioned
    ) {}

    public record WebhookEventItem(
        Long eventId,
        String provider,
        String endpoint,
        String eventType,
        String referenceId,
        String roomName,
        int statusCode,
        Boolean signatureValid,
        String payloadSummary,
        String createdAt
    ) {}

    public record PaperTrail(
        PaperTrailCounts counts,
        List<PaperTrailEventItem> recentEvents
    ) {}

    public record PaperTrailCounts(
        int prescriptionEventsToday,
        int inventoryEventsToday,
        int webhookEventsToday,
        int capturedPaymentsToday
    ) {}

    public record PaperTrailEventItem(
        String source,
        String action,
        String actorName,
        String subject,
        String detail,
        String createdAt
    ) {}
}
