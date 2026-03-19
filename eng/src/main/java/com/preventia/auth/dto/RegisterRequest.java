package com.preventia.auth.dto;

import com.preventia.family.domain.User.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Request body for POST /api/v1/auth/register.
 * Validated by Spring's @Valid before reaching AuthService.
 */
public record RegisterRequest(

    @NotBlank(message = "Name is required")
    String name,

    @NotBlank(message = "Email is required")
    @Email(message = "Must be a valid email address")
    String email,

    @NotBlank(message = "Password is required")
    String password,

    @NotNull(message = "Role is required (SPONSOR, RECIPIENT, DOCTOR, PHARMACIST). ADMIN is internal-only.")
    Role role
) {}
