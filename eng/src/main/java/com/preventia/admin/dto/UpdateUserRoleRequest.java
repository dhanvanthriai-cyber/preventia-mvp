package com.preventia.admin.dto;

import com.preventia.family.domain.User;
import jakarta.validation.constraints.NotNull;

public record UpdateUserRoleRequest(
    @NotNull(message = "Role is required")
    User.Role role
) {}
