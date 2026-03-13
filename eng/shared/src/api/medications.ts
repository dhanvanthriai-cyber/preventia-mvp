/**
 * medications.ts — Typed API wrappers for Medication / refill alerts
 * Project Dhanvanthri
 *
 * Endpoint:
 *  GET /api/v1/patients/{patientId}/medications/alerts → Medication[]
 */

import { getApiClient } from './client';
import type { Medication } from '../types';

/** Fetch medication refill alerts for a given patient */
export async function getMedicationAlerts(
  patientId: number,
): Promise<Medication[]> {
  return getApiClient().get<Medication[]>(
    `/api/v1/patients/${patientId}/medications/alerts`,
  );
}
