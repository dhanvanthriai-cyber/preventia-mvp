package com.preventia.shared.fhir;

import ca.uhn.fhir.context.FhirContext;
import com.preventia.clinical.domain.SoapNote;
import org.hl7.fhir.r4.model.*;
import org.springframework.stereotype.Component;

import java.util.Date;

/**
 * Converts internal domain objects to FHIR R4 resources.
 * SoapNote → Composition (type: clinical-note, LOINC 11488-4).
 *
 * ABDM Health Data Management Policy requires FHIR R4 for any
 * EMR data shared via Health Information Exchange (HIE-CM).
 */
@Component
public class FhirMapper {

    private final FhirContext fhirContext;

    public FhirMapper(FhirContext fhirContext) {
        this.fhirContext = fhirContext;
    }

    /**
     * Maps a SoapNote to a FHIR R4 Composition resource (JSON string).
     * TODO: Populate proper References once Patient/Practitioner FHIR IDs are tracked.
     */
    public String toFhirCompositionJson(SoapNote note) {
        Composition composition = new Composition();
        composition.setStatus(Composition.CompositionStatus.FINAL);
        composition.setDate(new Date());

        // LOINC code for clinical note
        composition.getType().addCoding()
            .setSystem("http://loinc.org")
            .setCode("11488-4")
            .setDisplay("Consult note");

        // SOAP sections
        addSection(composition, "Subjective", note.getSubjective());
        addSection(composition, "Objective", note.getObjective());
        addSection(composition, "Assessment", note.getAssessment());
        addSection(composition, "Plan", note.getPlan());

        return fhirContext.newJsonParser().setPrettyPrint(true).encodeResourceToString(composition);
    }

    private void addSection(Composition comp, String title, String text) {
        if (text == null || text.isBlank()) return;
        Composition.SectionComponent section = comp.addSection();
        section.setTitle(title);
        section.getText().setStatus(Narrative.NarrativeStatus.GENERATED);
        section.getText().setDivAsString("<div xmlns=\"http://www.w3.org/1999/xhtml\">" + text + "</div>");
    }
}
