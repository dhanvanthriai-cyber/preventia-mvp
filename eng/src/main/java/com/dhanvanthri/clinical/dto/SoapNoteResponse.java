package com.dhanvanthri.clinical.dto;

/**
 * Outbound DTO returned after a SOAP note is successfully created.
 *
 * Extend with clinical fields (subjective, objective, assessment, plan)
 * once the SoapNote entity is fully mapped.
 */
public record SoapNoteResponse(
        Long id
) {}
