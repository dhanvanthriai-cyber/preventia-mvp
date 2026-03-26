-- V24: Add missing doctor_name column to lifestyle_insights.
--
-- The V23 migration omitted doctor_name which is mapped by the LifestyleInsight
-- JPA entity. Hibernate schema-validation fails without it.
-- This migration adds the column (nullable for existing rows, populated going forward).

ALTER TABLE lifestyle_insights
    ADD COLUMN IF NOT EXISTS doctor_name VARCHAR(255);
