package com.preventia.clinical.controller;

import com.preventia.clinical.dto.SoapNoteRequest;
import com.preventia.clinical.dto.SoapNoteResponse;
import com.preventia.clinical.domain.SoapNote;
import com.preventia.clinical.service.ClinicalService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/clinical")
public class ClinicalController {

    private final ClinicalService clinicalService;

    public ClinicalController(ClinicalService clinicalService) {
        this.clinicalService = clinicalService;
    }

    /**
     * DOCTOR creates a SOAP note during an ACTIVE virtual session.
     * Session-lock and temporal-lock are enforced in ClinicalService.
     */
    @PostMapping("/appointments/{appointmentId}/notes")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('DOCTOR')")
    public SoapNoteResponse createNote(
            @PathVariable Long appointmentId,
            @Valid @RequestBody SoapNoteRequest request,
            Authentication authentication) {
        return clinicalService.createSoapNote(appointmentId, request, authentication.getName());
    }

    /** DOCTOR or SPONSOR (with GRANTED consent) reads patient history. */
    @GetMapping("/notes/patient/{patientId}")
    @PreAuthorize("hasRole('DOCTOR') or hasRole('SPONSOR')")
    public List<SoapNote> getPatientHistory(@PathVariable Long patientId) {
        return clinicalService.getPatientHistory(patientId);
    }
}


