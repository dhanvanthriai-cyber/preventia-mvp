-- V9: Convert role column from user_role enum to VARCHAR(20).
--
-- Hibernate's @Enumerated(EnumType.STRING) sends role values as varchar parameters.
-- PostgreSQL rejects assigning varchar to a custom ENUM column without an explicit cast.
-- Converting to VARCHAR(20) eliminates the cast entirely — Hibernate just works.
-- Application-level validation (Spring Security + @PreAuthorize) enforces valid values.

ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(20) USING role::text;
