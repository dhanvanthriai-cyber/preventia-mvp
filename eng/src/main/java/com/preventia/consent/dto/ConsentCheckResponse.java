package com.preventia.consent.dto;

/**
 * Response for {@code GET /api/v1/consent/check?appointmentId={id}}.
 *
 * {@code required = true} means the user has not yet consented for this
 * appointment and must see the consent gate before joining.
 */
public record ConsentCheckResponse(boolean required) {}
