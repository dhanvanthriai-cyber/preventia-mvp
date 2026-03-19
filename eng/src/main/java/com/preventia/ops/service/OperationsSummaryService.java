package com.preventia.ops.service;

import com.preventia.appointment.domain.Appointment;
import com.preventia.appointment.domain.AppointmentStatus;
import com.preventia.appointment.repository.AppointmentRepository;
import com.preventia.auth.repository.UserRepository;
import com.preventia.family.domain.User;
import com.preventia.ops.dto.OperationsSummaryResponse;
import com.preventia.pharmacy.domain.Medication;
import com.preventia.pharmacy.domain.RefillUrgency;
import com.preventia.pharmacy.repository.MedicationRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class OperationsSummaryService {

    private static final ZoneId OPS_ZONE = ZoneId.of("Asia/Kolkata");

    private final UserRepository userRepository;
    private final AppointmentRepository appointmentRepository;
    private final MedicationRepository medicationRepository;
    private final JdbcTemplate jdbc;

    public OperationsSummaryService(UserRepository userRepository,
                                    AppointmentRepository appointmentRepository,
                                    MedicationRepository medicationRepository,
                                    JdbcTemplate jdbc) {
        this.userRepository = userRepository;
        this.appointmentRepository = appointmentRepository;
        this.medicationRepository = medicationRepository;
        this.jdbc = jdbc;
    }

    public OperationsSummaryResponse getSummary() {
        ZonedDateTime nowInOpsZone = ZonedDateTime.now(OPS_ZONE);
        OffsetDateTime now = nowInOpsZone.toOffsetDateTime();
        LocalDate today = nowInOpsZone.toLocalDate();
        Instant dayStart = today.atStartOfDay(OPS_ZONE).toInstant();

        List<User> users = userRepository.findAll();
        Map<Long, User> userById = users.stream()
            .collect(Collectors.toMap(User::getId, Function.identity()));

        int doctors = countUsersByRole(users, User.Role.DOCTOR);
        int patients = countUsersByRole(users, User.Role.RECIPIENT);
        int pharmacists = countUsersByRole(users, User.Role.PHARMACIST);

        List<Appointment> appointments = appointmentRepository.findAll();
        List<Appointment> todayAppointments = appointments.stream()
            .filter(appointment -> isSameOpsDay(appointment.getStartTime(), today))
            .toList();

        int active = (int) appointments.stream()
            .filter(appointment -> appointment.getStatus() == AppointmentStatus.ACTIVE)
            .count();

        int scheduledToday = (int) todayAppointments.stream()
            .filter(appointment -> appointment.getStatus() == AppointmentStatus.SCHEDULED
                || appointment.getStatus() == AppointmentStatus.ACTIVE)
            .count();

        int upcoming = (int) appointments.stream()
            .filter(appointment -> appointment.getStatus() == AppointmentStatus.SCHEDULED)
            .filter(appointment -> appointment.getStartTime().isAfter(now))
            .count();

        int completedToday = (int) todayAppointments.stream()
            .filter(appointment -> appointment.getStatus() == AppointmentStatus.COMPLETED)
            .count();

        int lockedToday = (int) todayAppointments.stream()
            .filter(appointment -> appointment.getStatus() == AppointmentStatus.LOCKED)
            .count();

        int uniquePatients = (int) appointments.stream()
            .map(Appointment::getRecipientId)
            .filter(Objects::nonNull)
            .distinct()
            .count();

        int uniquePatientsToday = (int) todayAppointments.stream()
            .map(Appointment::getRecipientId)
            .filter(Objects::nonNull)
            .distinct()
            .count();

        int uniqueDoctorsToday = (int) todayAppointments.stream()
            .filter(appointment -> appointment.getStatus() == AppointmentStatus.SCHEDULED
                || appointment.getStatus() == AppointmentStatus.ACTIVE)
            .map(Appointment::getDoctorId)
            .filter(Objects::nonNull)
            .distinct()
            .count();

        int missingRoomLinks = (int) appointments.stream()
            .filter(appointment -> appointment.getStatus() == AppointmentStatus.SCHEDULED
                || appointment.getStatus() == AppointmentStatus.ACTIVE)
            .filter(appointment -> appointment.getEndTime().isAfter(now))
            .filter(appointment -> isBlank(appointment.getDailyRoomUrl()))
            .count();

        List<Medication> medications = medicationRepository.findAll();
        int lowStockMedications = (int) medications.stream()
            .filter(Medication::isRefillRequired)
            .count();
        int criticalRefills = (int) medications.stream()
            .filter(medication -> medication.getRefillUrgency() == RefillUrgency.CRITICAL)
            .count();

        List<OperationsSummaryResponse.PrescriptionQueueItem> prescriptionQueue = loadPrescriptionQueue();
        int pendingVerification = (int) prescriptionQueue.stream()
            .filter(item -> "PENDING_VERIFICATION".equals(item.status()))
            .count();
        int awaitingClarification = (int) prescriptionQueue.stream()
            .filter(item -> "AWAITING_CLARIFICATION".equals(item.status()))
            .count();

        int auditEventsToday = safeCount("""
            SELECT COUNT(*)
            FROM prescription_audit_log
            WHERE created_at >= ?
            """, Timestamp.from(dayStart));

        int uploadsToday = safeCount("""
            SELECT COUNT(*)
            FROM prescription_audit_log
            WHERE action = 'UPLOADED'
              AND created_at >= ?
            """, Timestamp.from(dayStart));

        int approvalsToday = safeCount("""
            SELECT COUNT(*)
            FROM prescription_audit_log
            WHERE action = 'APPROVED'
              AND created_at >= ?
            """, Timestamp.from(dayStart));

        int slaBreaches = safeCount("""
            SELECT COUNT(*)
            FROM soap_notes
            WHERE prescription_s3_key IS NOT NULL
              AND prescription_status IN ('PENDING_VERIFICATION', 'AWAITING_CLARIFICATION')
              AND prescription_uploaded_at <= NOW() - INTERVAL '4 hours'
            """);

        List<OperationsSummaryResponse.DoctorLoadItem> doctorLoads = users.stream()
            .filter(user -> user.getRole() == User.Role.DOCTOR)
            .map(doctor -> buildDoctorLoad(doctor, appointments, now, today))
            .sorted(
                Comparator.comparingInt(OperationsSummaryResponse.DoctorLoadItem::activeCount).reversed()
                    .thenComparing(Comparator.comparingInt(OperationsSummaryResponse.DoctorLoadItem::scheduledTodayCount).reversed())
                    .thenComparing(Comparator.comparingInt(OperationsSummaryResponse.DoctorLoadItem::upcomingCount).reversed())
                    .thenComparing(Comparator.comparingInt(OperationsSummaryResponse.DoctorLoadItem::totalAppointments).reversed())
                    .thenComparing(OperationsSummaryResponse.DoctorLoadItem::doctorName, String.CASE_INSENSITIVE_ORDER)
            )
            .limit(6)
            .toList();

        List<OperationsSummaryResponse.AppointmentItem> liveAppointments = appointments.stream()
            .filter(appointment -> appointment.getStatus() == AppointmentStatus.ACTIVE)
            .sorted(Comparator.comparing(Appointment::getStartTime))
            .limit(6)
            .map(appointment -> toAppointmentItem(appointment, userById))
            .toList();

        List<OperationsSummaryResponse.AppointmentItem> upcomingAppointments = appointments.stream()
            .filter(appointment -> appointment.getStatus() == AppointmentStatus.SCHEDULED)
            .filter(appointment -> appointment.getStartTime().isAfter(now))
            .sorted(Comparator.comparing(Appointment::getStartTime))
            .limit(6)
            .map(appointment -> toAppointmentItem(appointment, userById))
            .toList();

        List<OperationsSummaryResponse.AppointmentItem> recentAppointments = appointments.stream()
            .sorted(Comparator.comparing(Appointment::getStartTime).reversed())
            .limit(8)
            .map(appointment -> toAppointmentItem(appointment, userById))
            .toList();

        return new OperationsSummaryResponse(
            now.toString(),
            new OperationsSummaryResponse.UserCounts(doctors, patients, pharmacists),
            new OperationsSummaryResponse.AppointmentCounts(
                appointments.size(),
                active,
                scheduledToday,
                upcoming,
                completedToday,
                lockedToday,
                uniquePatients,
                uniquePatientsToday,
                uniqueDoctorsToday,
                missingRoomLinks
            ),
            new OperationsSummaryResponse.PharmacyCounts(
                pendingVerification,
                awaitingClarification,
                lowStockMedications,
                criticalRefills
            ),
            new OperationsSummaryResponse.AuditCounts(
                auditEventsToday,
                uploadsToday,
                approvalsToday,
                slaBreaches
            ),
            doctorLoads,
            liveAppointments,
            upcomingAppointments,
            recentAppointments,
            prescriptionQueue.stream().limit(6).toList(),
            loadRecentAuditEvents()
        );
    }

    private OperationsSummaryResponse.DoctorLoadItem buildDoctorLoad(User doctor,
                                                                     List<Appointment> appointments,
                                                                     OffsetDateTime now,
                                                                     LocalDate today) {
        List<Appointment> doctorAppointments = appointments.stream()
            .filter(appointment -> Objects.equals(appointment.getDoctorId(), doctor.getId()))
            .toList();

        int activeCount = (int) doctorAppointments.stream()
            .filter(appointment -> appointment.getStatus() == AppointmentStatus.ACTIVE)
            .count();

        int scheduledTodayCount = (int) doctorAppointments.stream()
            .filter(appointment -> isSameOpsDay(appointment.getStartTime(), today))
            .filter(appointment -> appointment.getStatus() == AppointmentStatus.SCHEDULED
                || appointment.getStatus() == AppointmentStatus.ACTIVE)
            .count();

        int upcomingCount = (int) doctorAppointments.stream()
            .filter(appointment -> appointment.getStatus() == AppointmentStatus.SCHEDULED)
            .filter(appointment -> appointment.getStartTime().isAfter(now))
            .count();

        String nextStartTime = doctorAppointments.stream()
            .filter(appointment -> appointment.getStartTime().isAfter(now))
            .map(Appointment::getStartTime)
            .min(Comparator.naturalOrder())
            .map(OffsetDateTime::toString)
            .orElse(null);

        return new OperationsSummaryResponse.DoctorLoadItem(
            doctor.getId(),
            doctor.getName(),
            activeCount,
            scheduledTodayCount,
            upcomingCount,
            doctorAppointments.size(),
            nextStartTime
        );
    }

    private OperationsSummaryResponse.AppointmentItem toAppointmentItem(Appointment appointment,
                                                                        Map<Long, User> userById) {
        String patientName = userById.getOrDefault(appointment.getRecipientId(), fallbackUser("Patient")).getName();
        String doctorName = userById.getOrDefault(appointment.getDoctorId(), fallbackUser("Doctor")).getName();

        return new OperationsSummaryResponse.AppointmentItem(
            appointment.getId(),
            patientName,
            doctorName,
            appointment.getStatus().name(),
            appointment.getStartTime().toString(),
            appointment.getEndTime().toString(),
            !isBlank(appointment.getDailyRoomUrl())
        );
    }

    private List<OperationsSummaryResponse.PrescriptionQueueItem> loadPrescriptionQueue() {
        List<Map<String, Object>> rows = jdbc.queryForList("""
            SELECT
                sn.id                       AS soap_note_id,
                u_patient.name              AS patient_name,
                u_doctor.name               AS doctor_name,
                sn.prescription_status::text AS prescription_status,
                sn.prescription_uploaded_at AS prescription_uploaded_at,
                m.days_remaining            AS days_remaining
            FROM soap_notes sn
            JOIN users u_patient ON u_patient.id = sn.patient_id
            JOIN users u_doctor  ON u_doctor.id  = sn.doctor_id
            LEFT JOIN LATERAL (
                SELECT (total_quantity / NULLIF(daily_dosage, 0)) AS days_remaining
                FROM medications
                WHERE patient_id = sn.patient_id
                ORDER BY days_remaining ASC LIMIT 1
            ) m ON true
            WHERE sn.prescription_status IN ('PENDING_VERIFICATION','AWAITING_CLARIFICATION')
              AND sn.prescription_s3_key IS NOT NULL
            ORDER BY sn.prescription_uploaded_at ASC
            """);

        return rows.stream()
            .map(row -> new OperationsSummaryResponse.PrescriptionQueueItem(
                longValue(row.get("soap_note_id")),
                stringValue(row.get("patient_name"), "Patient"),
                stringValue(row.get("doctor_name"), "Doctor"),
                stringValue(row.get("prescription_status"), "PENDING_VERIFICATION"),
                temporalToString(row.get("prescription_uploaded_at")),
                integerValue(row.get("days_remaining"))
            ))
            .toList();
    }

    private List<OperationsSummaryResponse.AuditEventItem> loadRecentAuditEvents() {
        List<Map<String, Object>> rows = jdbc.queryForList("""
            SELECT
                pal.soap_note_id         AS soap_note_id,
                pal.action::text         AS action,
                COALESCE(actor.name, 'System')   AS actor_name,
                COALESCE(patient.name, 'Patient') AS patient_name,
                pal.created_at           AS created_at,
                pal.reason               AS reason
            FROM prescription_audit_log pal
            LEFT JOIN users actor ON actor.id = pal.actor_id
            LEFT JOIN soap_notes sn ON sn.id = pal.soap_note_id
            LEFT JOIN users patient ON patient.id = sn.patient_id
            ORDER BY pal.created_at DESC
            LIMIT 6
            """);

        return rows.stream()
            .map(row -> new OperationsSummaryResponse.AuditEventItem(
                longValue(row.get("soap_note_id")),
                stringValue(row.get("action"), "UNKNOWN"),
                stringValue(row.get("actor_name"), "System"),
                stringValue(row.get("patient_name"), "Patient"),
                temporalToString(row.get("created_at")),
                stringValue(row.get("reason"), null)
            ))
            .toList();
    }

    private int countUsersByRole(List<User> users, User.Role role) {
        return (int) users.stream().filter(user -> user.getRole() == role).count();
    }

    private boolean isSameOpsDay(OffsetDateTime time, LocalDate day) {
        return time.atZoneSameInstant(OPS_ZONE).toLocalDate().equals(day);
    }

    private int safeCount(String sql, Object... args) {
        Long value = jdbc.queryForObject(sql, Long.class, args);
        return value == null ? 0 : value.intValue();
    }

    private Long longValue(Object value) {
        return value instanceof Number number ? number.longValue() : null;
    }

    private Integer integerValue(Object value) {
        return value instanceof Number number ? number.intValue() : null;
    }

    private String stringValue(Object value, String fallback) {
        if (value == null) return fallback;
        String text = String.valueOf(value);
        return text.isBlank() ? fallback : text;
    }

    private String temporalToString(Object value) {
        if (value == null) return null;
        if (value instanceof OffsetDateTime offsetDateTime) return offsetDateTime.toString();
        if (value instanceof Instant instant) return instant.toString();
        if (value instanceof Timestamp timestamp) return timestamp.toInstant().toString();
        return String.valueOf(value);
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private User fallbackUser(String name) {
        User fallback = new User();
        fallback.setName(name);
        return fallback;
    }
}
