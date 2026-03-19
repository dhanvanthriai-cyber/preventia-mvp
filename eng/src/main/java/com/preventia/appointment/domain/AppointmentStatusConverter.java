package com.preventia.appointment.domain;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * Converts AppointmentStatus enum ↔ VARCHAR(20).
 * Not actively used — status column was converted to VARCHAR in V10 migration,
 * so @Enumerated(EnumType.STRING) on the entity handles it directly.
 * Kept here for reference.
 */
@Converter
public class AppointmentStatusConverter implements AttributeConverter<AppointmentStatus, String> {

    @Override
    public String convertToDatabaseColumn(AppointmentStatus attribute) {
        if (attribute == null) return null;
        return attribute.name();
    }

    @Override
    public AppointmentStatus convertToEntityAttribute(String dbData) {
        if (dbData == null) return null;
        return AppointmentStatus.valueOf(dbData);
    }
}
