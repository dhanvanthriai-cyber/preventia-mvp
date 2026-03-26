package com.preventia.admin.controller;

import com.preventia.admin.dto.AdminDashboardResponse;
import com.preventia.admin.dto.UpdateUserRoleRequest;
import com.preventia.admin.service.AdminDashboardService;
import com.preventia.family.domain.User;
import com.preventia.ops.repository.ConsultationFeedbackRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminDashboardService         adminDashboardService;
    private final ConsultationFeedbackRepository feedbackRepository;
    private final JdbcTemplate                  jdbc;

    public AdminController(AdminDashboardService adminDashboardService,
                           ConsultationFeedbackRepository feedbackRepository,
                           JdbcTemplate jdbc) {
        this.adminDashboardService = adminDashboardService;
        this.feedbackRepository    = feedbackRepository;
        this.jdbc                  = jdbc;
    }

    @GetMapping("/dashboard")
    public AdminDashboardResponse dashboard() {
        return adminDashboardService.getDashboard();
    }

    @PatchMapping("/users/{userId}/role")
    public ResponseEntity<Map<String, Object>> updateUserRole(@PathVariable Long userId,
                                                              @Valid @RequestBody UpdateUserRoleRequest request) {
        User user = adminDashboardService.updateUserRole(userId, request.role());

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("userId", user.getId());
        response.put("name", user.getName());
        response.put("email", user.getEmail());
        response.put("role", user.getRole().name());
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/v1/admin/feedback
     *
     * Satisfaction survey aggregate analytics for the admin dashboard.
     * Returns: total responses, average rating, per-star distribution,
     * and the 10 most recent comments.
     */
    @GetMapping("/feedback")
    public ResponseEntity<Map<String, Object>> getFeedbackAnalytics() {
        long totalResponses = feedbackRepository.count();

        // Average rating
        Double avgRating = jdbc.queryForObject(
            "SELECT AVG(rating::numeric) FROM consultation_feedback WHERE rating IS NOT NULL",
            Double.class
        );

        // Distribution per star (1–5)
        List<Map<String, Object>> distribution = jdbc.queryForList("""
            SELECT rating, COUNT(*) AS count
            FROM consultation_feedback
            WHERE rating IS NOT NULL
            GROUP BY rating
            ORDER BY rating
            """);

        // 10 most recent non-empty comments
        List<Map<String, Object>> recentComments = jdbc.queryForList("""
            SELECT cf.rating, cf.comment, cf.submitted_at,
                   u.name AS patient_name,
                   a.doctor_name
            FROM consultation_feedback cf
            JOIN users u   ON u.id  = cf.user_id
            JOIN appointments a ON a.id = cf.appointment_id
            WHERE cf.comment IS NOT NULL AND cf.comment <> ''
            ORDER BY cf.submitted_at DESC
            LIMIT 10
            """);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalResponses", totalResponses);
        result.put("averageRating",  avgRating != null ? Math.round(avgRating * 10.0) / 10.0 : null);
        result.put("distribution",   distribution);
        result.put("recentComments", recentComments);

        return ResponseEntity.ok(result);
    }

    @ExceptionHandler(UnsupportedOperationException.class)
    public ResponseEntity<String> handleUnsupportedOperation(UnsupportedOperationException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(ex.getMessage());
    }
}
