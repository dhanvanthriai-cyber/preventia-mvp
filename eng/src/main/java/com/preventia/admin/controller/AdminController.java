package com.preventia.admin.controller;

import com.preventia.admin.dto.AdminDashboardResponse;
import com.preventia.admin.dto.UpdateUserRoleRequest;
import com.preventia.admin.service.AdminDashboardService;
import com.preventia.family.domain.User;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminDashboardService adminDashboardService;

    public AdminController(AdminDashboardService adminDashboardService) {
        this.adminDashboardService = adminDashboardService;
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

    @ExceptionHandler(UnsupportedOperationException.class)
    public ResponseEntity<String> handleUnsupportedOperation(UnsupportedOperationException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(ex.getMessage());
    }
}
