package com.preventia.auth.dto;

import com.preventia.family.domain.User.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Request body for social sign-in callbacks.
 * The browser supplies the provider-issued identity token; the backend verifies
 * it with the provider's public keys and then issues a Preventia JWT.
 */
public record SocialLoginRequest(

    @NotBlank(message = "Identity token is required")
    String idToken,

    @NotNull(message = "Role is required")
    Role role,

    String firstName,

    String lastName
) {
    public String fullName() {
        String first = firstName == null ? "" : firstName.trim();
        String last = lastName == null ? "" : lastName.trim();
        return (first + " " + last).trim();
    }
}
