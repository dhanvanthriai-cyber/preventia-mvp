-- V13: Normalize legacy role names from older databases.
--
-- Earlier builds used PATIENT / PHARMACY before the platform standardized on
-- RECIPIENT / PHARMACIST. Older accounts can still carry those values in the
-- users.role VARCHAR column, which causes enum hydration failures at login.

UPDATE users
SET role = 'RECIPIENT'
WHERE role = 'PATIENT';

UPDATE users
SET role = 'PHARMACIST'
WHERE role = 'PHARMACY';
