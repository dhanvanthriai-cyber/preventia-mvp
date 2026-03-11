package com.dhanvanthri.clinical.controller;

import com.dhanvanthri.clinical.domain.SoapNote;
import com.dhanvanthri.clinical.dto.SoapNoteRequest;
import com.dhanvanthri.clinical.service.ClinicalService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/clinical")
public class ClinicalController {

    private final ClinicalService clinicalService;

    public ClinicalController(ClinicalService clinicalService) {
        this.clinicalService = clinicalService;
    }

    /** DOCTOR creates a SOAP note during a locked virtual session. */
    @PostMapping("/notes")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('DOCTOR')")
    public SoapNote createNote(@Valid @RequestBody SoapNoteRequest request) {
        return clinicalService.createNote(request);
    }

    /** DOCTOR or SPONSOR (with GRANTED consent) reads patient history. */
    @GetMapping("/notes/patient/{patientId}")
    @PreAuthorize("hasRole('DOCTOR') or hasRole('SPONSOR')")
    public List<SoapNote> getPatientHistory(@PathVariable Long patientId) {
        return clinicalService.getPatientHistory(patientId);
    }
}
