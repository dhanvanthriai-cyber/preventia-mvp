package com.preventia.insights.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request DTO for POST /api/v1/insights.
 *
 * category is optional; defaults to "GENERAL" in the service layer.
 */
public record InsightRequest(

    String category,

    @NotBlank(message = "title must not be blank")
    @Size(max = 255, message = "title must be at most 255 characters")
    String title,

    @NotBlank(message = "body must not be blank")
    String body
) {}
