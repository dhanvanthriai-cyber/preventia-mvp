package com.preventia.ops.dto;

import java.util.List;

public record OperationsSummaryResponse(
    String generatedAt,
    UserCounts users,
    AppointmentCounts appointments,
    PharmacyCounts pharmacy,
    AuditCounts audit,
    List<DoctorLoadItem> doctorLoads,
    List<AppointmentItem> liveAppointments,
    List<AppointmentItem> upcomingAppointments,
    List<AppointmentItem> recentAppointments,
    List<PrescriptionQueueItem> prescriptionQueue,
    List<AuditEventItem> recentAuditEvents
) {
    public record UserCounts(
        int doctors,
        int patients,
        int pharmacists
    ) {}

    public record AppointmentCounts(
        int total,
        int active,
        int scheduledToday,
        int upcoming,
        int completedToday,
        int lockedToday,
        int uniquePatients,
        int uniquePatientsToday,
        int uniqueDoctorsToday,
        int missingRoomLinks
    ) {}

    public record PharmacyCounts(
        int pendingVerification,
        int awaitingClarification,
        int lowStockMedications,
        int criticalRefills
    ) {}

    public record AuditCounts(
        int eventsToday,
        int uploadsToday,
        int approvalsToday,
        int slaBreaches
    ) {}

    public record DoctorLoadItem(
        Long doctorId,
        String doctorName,
        int activeCount,
        int scheduledTodayCount,
        int upcomingCount,
        int totalAppointments,
        String nextStartTime
    ) {}

    public record AppointmentItem(
        Long appointmentId,
        String patientName,
        String doctorName,
        String status,
        String startTime,
        String endTime,
        boolean roomProvisioned
    ) {}

    public record PrescriptionQueueItem(
        Long soapNoteId,
        String patientName,
        String doctorName,
        String status,
        String uploadedAt,
        Integer daysRemaining
    ) {}

    public record AuditEventItem(
        Long soapNoteId,
        String action,
        String actorName,
        String patientName,
        String createdAt,
        String reason
    ) {}
}
