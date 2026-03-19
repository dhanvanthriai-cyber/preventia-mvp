package com.preventia.admin.service;

import com.preventia.admin.dto.AdminDashboardResponse;
import com.preventia.appointment.domain.Appointment;
import com.preventia.appointment.domain.AppointmentStatus;
import com.preventia.appointment.repository.AppointmentRepository;
import com.preventia.auth.repository.UserRepository;
import com.preventia.family.domain.User;
import com.preventia.lab.domain.LabOrder;
import com.preventia.lab.domain.LabOrderStatus;
import com.preventia.lab.repository.LabOrderRepository;
import com.preventia.payment.domain.Payment;
import com.preventia.payment.domain.PaymentStatus;
import com.preventia.payment.repository.PaymentRepository;
import com.preventia.pharmacy.domain.Medication;
import com.preventia.pharmacy.domain.RefillUrgency;
import com.preventia.pharmacy.repository.MedicationRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class AdminDashboardService {

    private static final ZoneId OPS_ZONE = ZoneId.of("Asia/Kolkata");

    private final UserRepository userRepository;
    private final AppointmentRepository appointmentRepository;
    private final MedicationRepository medicationRepository;
    private final LabOrderRepository labOrderRepository;
    private final PaymentRepository paymentRepository;
    private final JdbcTemplate jdbc;

    public AdminDashboardService(UserRepository userRepository,
                                 AppointmentRepository appointmentRepository,
                                 MedicationRepository medicationRepository,
                                 LabOrderRepository labOrderRepository,
                                 PaymentRepository paymentRepository,
                                 JdbcTemplate jdbc) {
        this.userRepository = userRepository;
        this.appointmentRepository = appointmentRepository;
        this.medicationRepository = medicationRepository;
        this.labOrderRepository = labOrderRepository;
        this.paymentRepository = paymentRepository;
        this.jdbc = jdbc;
    }

    public AdminDashboardResponse getDashboard() {
        ZonedDateTime nowInOpsZone = ZonedDateTime.now(OPS_ZONE);
        OffsetDateTime now = nowInOpsZone.toOffsetDateTime();
        LocalDate today = nowInOpsZone.toLocalDate();
        Instant dayStart = today.atStartOfDay(OPS_ZONE).toInstant();
        Instant last24Hours = nowInOpsZone.minusHours(24).toInstant();

        List<User> users = userRepository.findAll();
        Map<Long, User> userById = users.stream()
            .collect(Collectors.toMap(User::getId, Function.identity()));

        List<Appointment> appointments = appointmentRepository.findAll();
        List<Appointment> todayAppointments = appointments.stream()
            .filter(appointment -> isSameOpsDay(appointment.getStartTime(), today))
            .toList();
        List<Medication> medications = medicationRepository.findAll();
        List<LabOrder> labOrders = labOrderRepository.findAll();
        List<Payment> payments = paymentRepository.findAll();

        int patients = countUsersByRole(users, User.Role.RECIPIENT);
        int doctors = countUsersByRole(users, User.Role.DOCTOR);
        int pharmacists = countUsersByRole(users, User.Role.PHARMACIST);
        int sponsors = countUsersByRole(users, User.Role.SPONSOR);
        int admins = countUsersByRole(users, User.Role.ADMIN);

        int liveConsultations = (int) appointments.stream()
            .filter(appointment -> appointment.getStatus() == AppointmentStatus.ACTIVE)
            .count();
        int scheduledToday = (int) todayAppointments.stream()
            .filter(appointment -> appointment.getStatus() == AppointmentStatus.SCHEDULED
                || appointment.getStatus() == AppointmentStatus.ACTIVE)
            .count();
        int upcomingAppointments = (int) appointments.stream()
            .filter(appointment -> appointment.getStatus() == AppointmentStatus.SCHEDULED)
            .filter(appointment -> appointment.getStartTime().isAfter(now))
            .count();
        int completedToday = (int) todayAppointments.stream()
            .filter(appointment -> appointment.getStatus() == AppointmentStatus.COMPLETED
                || appointment.getStatus() == AppointmentStatus.LOCKED)
            .count();
        int missingRoomLinks = (int) appointments.stream()
            .filter(appointment -> appointment.getStatus() == AppointmentStatus.SCHEDULED
                || appointment.getStatus() == AppointmentStatus.ACTIVE)
            .filter(appointment -> appointment.getEndTime().isAfter(now))
            .filter(appointment -> isBlank(appointment.getDailyRoomUrl()))
            .count();

        int criticalRefills = (int) medications.stream()
            .filter(medication -> medication.getRefillUrgency() == RefillUrgency.CRITICAL)
            .count();

        List<AdminDashboardResponse.PrescriptionItem> prescriptionQueue = loadPrescriptionQueue();
        int pendingPrescriptions = (int) prescriptionQueue.stream()
            .filter(item -> "PENDING_VERIFICATION".equals(item.status()))
            .count();
        int awaitingClarification = (int) prescriptionQueue.stream()
            .filter(item -> "AWAITING_CLARIFICATION".equals(item.status()))
            .count();
        int slaBreaches = (int) prescriptionQueue.stream()
            .filter(AdminDashboardResponse.PrescriptionItem::slaBreached)
            .count();

        List<AdminDashboardResponse.LabOrderItem> labWatchlist = buildLabWatchlist(labOrders, userById, now);
        int openLabOrders = (int) labOrders.stream()
            .filter(order -> order.getStatus() != LabOrderStatus.RESULTED)
            .count();
        int coldChainBreaches = (int) labOrders.stream()
            .filter(LabOrder::isColdChainBreached)
            .count();
        int labExceptions = (int) labWatchlist.stream()
            .filter(AdminDashboardResponse.LabOrderItem::requiresAttention)
            .count();

        int paymentsCapturedToday = (int) payments.stream()
            .filter(payment -> payment.getStatus() == PaymentStatus.CAPTURED)
            .filter(payment -> payment.getUpdatedAt() != null && !payment.getUpdatedAt().toInstant().isBefore(dayStart))
            .count();

        int prescriptionEventsToday = safeCount("""
            SELECT COUNT(*)
            FROM prescription_audit_log
            WHERE created_at >= ?
            """, Timestamp.from(dayStart));
        int inventoryEventsToday = safeCount("""
            SELECT COUNT(*)
            FROM inventory_audit_log
            WHERE created_at >= ?
            """, Timestamp.from(dayStart));
        int webhookEventsToday = safeCount("""
            SELECT COUNT(*)
            FROM webhook_event_log
            WHERE created_at >= ?
            """, Timestamp.from(dayStart));

        int totalWebhooksLast24Hours = safeCount("""
            SELECT COUNT(*)
            FROM webhook_event_log
            WHERE created_at >= ?
            """, Timestamp.from(last24Hours));
        int failedWebhooksLast24Hours = safeCount("""
            SELECT COUNT(*)
            FROM webhook_event_log
            WHERE created_at >= ?
              AND status_code >= 400
            """, Timestamp.from(last24Hours));
        int invalidSignaturesLast24Hours = safeCount("""
            SELECT COUNT(*)
            FROM webhook_event_log
            WHERE created_at >= ?
              AND signature_valid = FALSE
            """, Timestamp.from(last24Hours));

        List<AdminDashboardResponse.WebhookEventItem> recentWebhookEvents = loadRecentWebhookEvents();
        List<AdminDashboardResponse.AppointmentItem> liveAppointments = appointments.stream()
            .filter(appointment -> appointment.getStatus() == AppointmentStatus.ACTIVE)
            .sorted(Comparator.comparing(Appointment::getStartTime))
            .limit(8)
            .map(appointment -> toAppointmentItem(appointment, userById))
            .toList();
        List<AdminDashboardResponse.AppointmentItem> upcoming = appointments.stream()
            .filter(appointment -> appointment.getStatus() == AppointmentStatus.SCHEDULED)
            .filter(appointment -> appointment.getStartTime().isAfter(now))
            .sorted(Comparator.comparing(Appointment::getStartTime))
            .limit(8)
            .map(appointment -> toAppointmentItem(appointment, userById))
            .toList();

        List<AdminDashboardResponse.ManagedUserItem> directory = buildUserDirectory(users, appointments);
        List<AdminDashboardResponse.ManagedUserItem> recentUsers = users.stream()
            .sorted(Comparator.comparing(User::getCreatedAt).reversed())
            .limit(8)
            .map(user -> directory.stream()
                .filter(item -> Objects.equals(item.userId(), user.getId()))
                .findFirst()
                .orElse(toManagedUserItem(user, null, 0)))
            .toList();

        List<AdminDashboardResponse.PaperTrailEventItem> paperTrail = loadPaperTrailEvents();

        List<String> watchlist = buildWatchlist(
            missingRoomLinks,
            pendingPrescriptions,
            awaitingClarification,
            labExceptions,
            failedWebhooksLast24Hours,
            criticalRefills
        );

        return new AdminDashboardResponse(
            now.toString(),
            new AdminDashboardResponse.PulseMetrics(
                users.size(),
                patients,
                doctors,
                pharmacists,
                admins,
                liveConsultations,
                scheduledToday,
                upcomingAppointments,
                pendingPrescriptions,
                awaitingClarification,
                labExceptions,
                missingRoomLinks,
                criticalRefills,
                paymentsCapturedToday,
                failedWebhooksLast24Hours,
                prescriptionEventsToday + inventoryEventsToday + webhookEventsToday,
                watchlist
            ),
            new AdminDashboardResponse.UnifiedUserManagement(
                new AdminDashboardResponse.UserCounts(
                    users.size(),
                    patients,
                    doctors,
                    pharmacists,
                    sponsors,
                    admins
                ),
                recentUsers,
                directory
            ),
            new AdminDashboardResponse.ClinicalVerification(
                new AdminDashboardResponse.VerificationCounts(
                    pendingPrescriptions,
                    awaitingClarification,
                    slaBreaches,
                    openLabOrders,
                    coldChainBreaches
                ),
                prescriptionQueue,
                labWatchlist
            ),
            new AdminDashboardResponse.VideoOperations(
                new AdminDashboardResponse.VideoMetrics(
                    liveConsultations,
                    scheduledToday,
                    upcomingAppointments,
                    completedToday,
                    missingRoomLinks
                ),
                new AdminDashboardResponse.WebhookMetrics(
                    totalWebhooksLast24Hours,
                    failedWebhooksLast24Hours,
                    invalidSignaturesLast24Hours
                ),
                liveAppointments,
                upcoming,
                recentWebhookEvents
            ),
            new AdminDashboardResponse.PaperTrail(
                new AdminDashboardResponse.PaperTrailCounts(
                    prescriptionEventsToday,
                    inventoryEventsToday,
                    webhookEventsToday,
                    paymentsCapturedToday
                ),
                paperTrail
            )
        );
    }

    @Transactional
    public User updateUserRole(Long userId, User.Role role) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found: " + userId));

        if (user.getRole() == User.Role.ADMIN && role != User.Role.ADMIN
            && userRepository.countByRole(User.Role.ADMIN) <= 1) {
            throw new UnsupportedOperationException("At least one admin must remain on the platform.");
        }

        user.setRole(role);
        return userRepository.save(user);
    }

    private List<String> buildWatchlist(int missingRoomLinks,
                                        int pendingPrescriptions,
                                        int awaitingClarification,
                                        int labExceptions,
                                        int failedWebhooksLast24Hours,
                                        int criticalRefills) {
        List<String> items = new ArrayList<>();
        items.add(missingRoomLinks > 0
            ? missingRoomLinks + " consults still need room links before go-live."
            : "Room provisioning looks clean across the consultation queue.");
        items.add(pendingPrescriptions > 0
            ? pendingPrescriptions + " prescriptions are still waiting for clinical verification."
            : "Prescription verification queue is currently clear.");
        items.add(awaitingClarification > 0
            ? awaitingClarification + " prescriptions are blocked on doctor clarification."
            : "No active clarification loop is blocking pharmacy handoffs.");
        items.add(labExceptions > 0
            ? labExceptions + " lab orders need attention across breaches or non-resulted states."
            : "Lab order flow is calm with no active exception watchlist.");
        items.add(failedWebhooksLast24Hours > 0
            ? failedWebhooksLast24Hours + " webhook events failed in the last 24 hours."
            : "Webhook delivery has been clean over the last 24 hours.");
        items.add(criticalRefills > 0
            ? criticalRefills + " medications are in the critical refill window."
            : "No medications are sitting in the critical refill window right now.");
        return items;
    }

    private List<AdminDashboardResponse.ManagedUserItem> buildUserDirectory(List<User> users,
                                                                            List<Appointment> appointments) {
        Map<Long, Integer> appointmentCounts = new HashMap<>();
        Map<Long, Instant> lastAppointmentAt = new HashMap<>();
        for (Appointment appointment : appointments) {
            recordActivity(appointmentCounts, lastAppointmentAt, appointment.getDoctorId(), appointment.getStartTime());
            recordActivity(appointmentCounts, lastAppointmentAt, appointment.getRecipientId(), appointment.getStartTime());
            recordActivity(appointmentCounts, lastAppointmentAt, appointment.getSponsorId(), appointment.getStartTime());
        }

        Map<Long, Integer> prescriptionActionCounts = new HashMap<>();
        Map<Long, Instant> prescriptionActionAt = new HashMap<>();
        for (Map<String, Object> row : jdbc.queryForList("""
            SELECT actor_id, COUNT(*) AS action_count, MAX(created_at) AS last_action_at
            FROM prescription_audit_log
            WHERE actor_id IS NOT NULL
            GROUP BY actor_id
            """)) {
            Long actorId = longValue(row.get("actor_id"));
            if (actorId == null) {
                continue;
            }
            prescriptionActionCounts.put(actorId, integerValue(row.get("action_count"), 0));
            prescriptionActionAt.put(actorId, temporalToInstant(row.get("last_action_at")));
        }

        return users.stream()
            .sorted(Comparator
                .comparing((User user) -> lastActivityForUser(user, lastAppointmentAt, prescriptionActionAt), Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(User::getCreatedAt, Comparator.reverseOrder()))
            .map(user -> {
                Instant lastActivity = lastActivityForUser(user, lastAppointmentAt, prescriptionActionAt);
                int activityCount = activityCountForUser(user, appointmentCounts, prescriptionActionCounts);
                return toManagedUserItem(user, lastActivity, activityCount);
            })
            .toList();
    }

    private Instant lastActivityForUser(User user,
                                        Map<Long, Instant> appointmentActivity,
                                        Map<Long, Instant> prescriptionActivity) {
        Instant lastAppointment = appointmentActivity.get(user.getId());
        Instant lastPrescription = prescriptionActivity.get(user.getId());
        if (lastAppointment == null) return lastPrescription;
        if (lastPrescription == null) return lastAppointment;
        return lastAppointment.isAfter(lastPrescription) ? lastAppointment : lastPrescription;
    }

    private int activityCountForUser(User user,
                                     Map<Long, Integer> appointmentCounts,
                                     Map<Long, Integer> prescriptionCounts) {
        if (user.getRole() == User.Role.PHARMACIST) {
            return prescriptionCounts.getOrDefault(user.getId(), 0);
        }
        return appointmentCounts.getOrDefault(user.getId(), 0);
    }

    private AdminDashboardResponse.ManagedUserItem toManagedUserItem(User user,
                                                                     Instant lastActivity,
                                                                     int activityCount) {
        return new AdminDashboardResponse.ManagedUserItem(
            user.getId(),
            user.getName(),
            user.getEmail(),
            user.getRole().name(),
            temporalToString(user.getCreatedAt()),
            temporalToString(lastActivity),
            activityCount,
            activityLabel(user.getRole(), activityCount)
        );
    }

    private String activityLabel(User.Role role, int activityCount) {
        return switch (role) {
            case RECIPIENT -> activityCount + " appointments";
            case SPONSOR -> activityCount + " care follow-ups";
            case DOCTOR -> activityCount + " consultations";
            case PHARMACIST -> activityCount + " pharmacy actions";
            case ADMIN -> "Platform administration";
        };
    }

    private void recordActivity(Map<Long, Integer> counts,
                                Map<Long, Instant> lastActivity,
                                Long userId,
                                OffsetDateTime timestamp) {
        if (userId == null || timestamp == null) {
            return;
        }
        counts.merge(userId, 1, Integer::sum);
        Instant instant = timestamp.toInstant();
        Instant current = lastActivity.get(userId);
        if (current == null || instant.isAfter(current)) {
            lastActivity.put(userId, instant);
        }
    }

    private List<AdminDashboardResponse.PrescriptionItem> loadPrescriptionQueue() {
        List<Map<String, Object>> rows = jdbc.queryForList("""
            SELECT
                sn.id AS soap_note_id,
                patient.name AS patient_name,
                doctor.name AS doctor_name,
                sn.prescription_status::text AS prescription_status,
                sn.prescription_uploaded_at AS prescription_uploaded_at,
                sn.prescription_uploaded_at <= NOW() - INTERVAL '4 hours' AS sla_breached,
                m.days_remaining AS days_remaining
            FROM soap_notes sn
            JOIN users patient ON patient.id = sn.patient_id
            JOIN users doctor ON doctor.id = sn.doctor_id
            LEFT JOIN LATERAL (
                SELECT (total_quantity / NULLIF(daily_dosage, 0)) AS days_remaining
                FROM medications
                WHERE patient_id = sn.patient_id
                ORDER BY days_remaining ASC
                LIMIT 1
            ) m ON true
            WHERE sn.prescription_status IN ('PENDING_VERIFICATION', 'AWAITING_CLARIFICATION')
              AND sn.prescription_s3_key IS NOT NULL
            ORDER BY sn.prescription_uploaded_at ASC
            LIMIT 8
            """);

        return rows.stream()
            .map(row -> new AdminDashboardResponse.PrescriptionItem(
                longValue(row.get("soap_note_id")),
                stringValue(row.get("patient_name"), "Patient"),
                stringValue(row.get("doctor_name"), "Doctor"),
                stringValue(row.get("prescription_status"), "PENDING_VERIFICATION"),
                temporalToString(row.get("prescription_uploaded_at")),
                integerValue(row.get("days_remaining"), null),
                booleanValue(row.get("sla_breached"))
            ))
            .toList();
    }

    private List<AdminDashboardResponse.LabOrderItem> buildLabWatchlist(List<LabOrder> labOrders,
                                                                        Map<Long, User> userById,
                                                                        OffsetDateTime now) {
        return labOrders.stream()
            .map(order -> {
                boolean requiresAttention = order.isColdChainBreached()
                    || order.getStatus() == LabOrderStatus.FAILED
                    || (order.getStatus() != LabOrderStatus.RESULTED && order.getScheduledAt() != null
                    && order.getScheduledAt().isBefore(now.toInstant()));
                String patientName = userById.getOrDefault(order.getPatientId(), fallbackUser("Patient")).getName();
                String testName = order.getTestName() != null && !order.getTestName().isBlank()
                    ? order.getTestName()
                    : order.getTestCode();

                return new AdminDashboardResponse.LabOrderItem(
                    order.getId(),
                    patientName,
                    testName,
                    order.getLabPartner().name(),
                    order.getStatus().name(),
                    temporalToString(order.getScheduledAt()),
                    temporalToString(order.getCollectedAt()),
                    temporalToString(order.getResultedAt()),
                    order.isColdChainBreached(),
                    requiresAttention
                );
            })
            .sorted(Comparator
                .comparing(AdminDashboardResponse.LabOrderItem::requiresAttention, Comparator.reverseOrder())
                .thenComparing(AdminDashboardResponse.LabOrderItem::scheduledAt, Comparator.nullsLast(Comparator.naturalOrder())))
            .limit(8)
            .toList();
    }

    private List<AdminDashboardResponse.WebhookEventItem> loadRecentWebhookEvents() {
        List<Map<String, Object>> rows = jdbc.queryForList("""
            SELECT
                id,
                provider,
                endpoint,
                event_type,
                reference_id,
                room_name,
                status_code,
                signature_valid,
                payload_summary,
                created_at
            FROM webhook_event_log
            ORDER BY created_at DESC
            LIMIT 8
            """);

        return rows.stream()
            .map(row -> new AdminDashboardResponse.WebhookEventItem(
                longValue(row.get("id")),
                stringValue(row.get("provider"), "unknown"),
                stringValue(row.get("endpoint"), ""),
                stringValue(row.get("event_type"), "unknown"),
                stringValue(row.get("reference_id"), null),
                stringValue(row.get("room_name"), null),
                integerValue(row.get("status_code"), 0),
                nullableBoolean(row.get("signature_valid")),
                stringValue(row.get("payload_summary"), null),
                temporalToString(row.get("created_at"))
            ))
            .toList();
    }

    private List<AdminDashboardResponse.PaperTrailEventItem> loadPaperTrailEvents() {
        List<AdminDashboardResponse.PaperTrailEventItem> events = new ArrayList<>();

        for (Map<String, Object> row : jdbc.queryForList("""
            SELECT
                'PRESCRIPTION' AS source,
                pal.action::text AS action,
                COALESCE(actor.name, 'System') AS actor_name,
                COALESCE(patient.name, 'Patient') AS subject,
                pal.reason AS detail,
                pal.created_at AS created_at
            FROM prescription_audit_log pal
            LEFT JOIN users actor ON actor.id = pal.actor_id
            LEFT JOIN soap_notes sn ON sn.id = pal.soap_note_id
            LEFT JOIN users patient ON patient.id = sn.patient_id
            ORDER BY pal.created_at DESC
            LIMIT 10
            """)) {
            events.add(new AdminDashboardResponse.PaperTrailEventItem(
                stringValue(row.get("source"), "PRESCRIPTION"),
                stringValue(row.get("action"), "UNKNOWN"),
                stringValue(row.get("actor_name"), "System"),
                stringValue(row.get("subject"), "Patient"),
                stringValue(row.get("detail"), "Prescription workflow updated."),
                temporalToString(row.get("created_at"))
            ));
        }

        for (Map<String, Object> row : jdbc.queryForList("""
            SELECT
                'INVENTORY' AS source,
                'STOCK_UPDATED' AS action,
                COALESCE(actor.name, 'System') AS actor_name,
                CONCAT(patient.name, ' · ', medication.drug_name) AS subject,
                CONCAT(ial.quantity_before, ' → ', ial.quantity_after, ' units') AS detail,
                ial.created_at AS created_at
            FROM inventory_audit_log ial
            JOIN medications medication ON medication.id = ial.medication_id
            JOIN users patient ON patient.id = medication.patient_id
            LEFT JOIN users actor ON actor.id = ial.actor_id
            ORDER BY ial.created_at DESC
            LIMIT 10
            """)) {
            events.add(new AdminDashboardResponse.PaperTrailEventItem(
                stringValue(row.get("source"), "INVENTORY"),
                stringValue(row.get("action"), "STOCK_UPDATED"),
                stringValue(row.get("actor_name"), "System"),
                stringValue(row.get("subject"), "Medication inventory"),
                stringValue(row.get("detail"), "Inventory updated."),
                temporalToString(row.get("created_at"))
            ));
        }

        for (Map<String, Object> row : jdbc.queryForList("""
            SELECT
                'WEBHOOK' AS source,
                event_type AS action,
                provider AS actor_name,
                COALESCE(reference_id, endpoint) AS subject,
                CONCAT('HTTP ', status_code, COALESCE(CONCAT(' · ', payload_summary), '')) AS detail,
                created_at AS created_at
            FROM webhook_event_log
            ORDER BY created_at DESC
            LIMIT 10
            """)) {
            events.add(new AdminDashboardResponse.PaperTrailEventItem(
                stringValue(row.get("source"), "WEBHOOK"),
                stringValue(row.get("action"), "EVENT"),
                stringValue(row.get("actor_name"), "Webhook"),
                stringValue(row.get("subject"), "Webhook event"),
                stringValue(row.get("detail"), "Webhook event logged."),
                temporalToString(row.get("created_at"))
            ));
        }

        for (Map<String, Object> row : jdbc.queryForList("""
            SELECT
                'PAYMENT' AS source,
                status::text AS action,
                COALESCE(payer.name, 'Unknown payer') AS actor_name,
                COALESCE(payment_type::text, 'PAYMENT') AS subject,
                CONCAT(currency, ' ', amount_cents / 100.0, ' via ', gateway::text) AS detail,
                updated_at AS created_at
            FROM payments p
            LEFT JOIN users payer ON payer.id = p.payer_id
            WHERE status = 'CAPTURED'
            ORDER BY updated_at DESC
            LIMIT 10
            """)) {
            events.add(new AdminDashboardResponse.PaperTrailEventItem(
                stringValue(row.get("source"), "PAYMENT"),
                stringValue(row.get("action"), "CAPTURED"),
                stringValue(row.get("actor_name"), "Unknown payer"),
                stringValue(row.get("subject"), "PAYMENT"),
                stringValue(row.get("detail"), "Captured payment."),
                temporalToString(row.get("created_at"))
            ));
        }

        return events.stream()
            .sorted(Comparator.comparing(AdminDashboardResponse.PaperTrailEventItem::createdAt, Comparator.nullsLast(Comparator.reverseOrder())))
            .limit(16)
            .toList();
    }

    private AdminDashboardResponse.AppointmentItem toAppointmentItem(Appointment appointment,
                                                                     Map<Long, User> userById) {
        String patientName = userById.getOrDefault(appointment.getRecipientId(), fallbackUser("Patient")).getName();
        String doctorName = userById.getOrDefault(appointment.getDoctorId(), fallbackUser("Doctor")).getName();

        return new AdminDashboardResponse.AppointmentItem(
            appointment.getId(),
            patientName,
            doctorName,
            appointment.getStatus().name(),
            appointment.getStartTime().toString(),
            appointment.getEndTime().toString(),
            appointment.getDailyRoomName(),
            !isBlank(appointment.getDailyRoomUrl())
        );
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

    private Integer integerValue(Object value, Integer fallback) {
        return value instanceof Number number ? number.intValue() : fallback;
    }

    private String stringValue(Object value, String fallback) {
        if (value == null) {
            return fallback;
        }
        String text = String.valueOf(value);
        return text.isBlank() ? fallback : text;
    }

    private boolean booleanValue(Object value) {
        return value instanceof Boolean bool && bool;
    }

    private Boolean nullableBoolean(Object value) {
        return value instanceof Boolean bool ? bool : null;
    }

    private String temporalToString(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof OffsetDateTime offsetDateTime) {
            return offsetDateTime.toString();
        }
        if (value instanceof Instant instant) {
            return instant.toString();
        }
        if (value instanceof Timestamp timestamp) {
            return timestamp.toInstant().toString();
        }
        return String.valueOf(value);
    }

    private Instant temporalToInstant(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Instant instant) {
            return instant;
        }
        if (value instanceof OffsetDateTime offsetDateTime) {
            return offsetDateTime.toInstant();
        }
        if (value instanceof Timestamp timestamp) {
            return timestamp.toInstant();
        }
        return null;
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
