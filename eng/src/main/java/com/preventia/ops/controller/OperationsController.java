package com.preventia.ops.controller;

import com.preventia.ops.dto.OperationsSummaryResponse;
import com.preventia.ops.service.OperationsSummaryService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/ops")
public class OperationsController {

    private final OperationsSummaryService operationsSummaryService;

    public OperationsController(OperationsSummaryService operationsSummaryService) {
        this.operationsSummaryService = operationsSummaryService;
    }

    @GetMapping("/summary")
    @PreAuthorize("hasAnyRole('DOCTOR', 'PHARMACIST')")
    public OperationsSummaryResponse summary() {
        return operationsSummaryService.getSummary();
    }
}
