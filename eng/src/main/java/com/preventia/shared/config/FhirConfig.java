package com.preventia.shared.config;

import ca.uhn.fhir.context.FhirContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * HAPI FHIR R4 context — singleton, expensive to create.
 * Used by FhirMapper to serialize SoapNote → FHIR Composition resource.
 * Aligned with ABDM (Ayushman Bharat Digital Mission) FHIR R4 profile.
 *
 * Dependency to add in pom.xml:
 *   <groupId>ca.uhn.hapi.fhir</groupId>
 *   <artifactId>hapi-fhir-structures-r4</artifactId>
 *   <version>7.x.x</version>
 */
@Configuration
public class FhirConfig {

    @Bean
    public FhirContext fhirContext() {
        return FhirContext.forR4();
    }
}
