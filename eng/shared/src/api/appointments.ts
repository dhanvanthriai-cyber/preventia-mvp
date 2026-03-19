/**
 * appointments.ts — Typed API wrappers for the Appointment resource
 * Project Preventia
 *
 * Endpoints (Spring Boot):
 *  POST /api/v1/appointments                    → AppointmentResponse
 *  GET  /api/v1/appointments?doctorId={id}      → Appointment[]
 *  GET  /api/v1/appointments?recipientId={id}   → Appointment[]
 *  PUT  /api/v1/appointments/{id}/activate      → AppointmentResponse
 *  PUT  /api/v1/appointments/{id}/complete      → AppointmentResponse
 */

import { getApiClient } from './client';
import type { Appointment, AppointmentResponse, CreateAppointmentRequest } from '../types';

/** Create a new appointment (Sponsor books on behalf of Recipient) */
export async function createAppointment(
  request: CreateAppointmentRequest,
): Promise<AppointmentResponse> {
  return getApiClient().post<AppointmentResponse>('/api/v1/appointments', request);
}

/** Fetch appointments filtered by query params (doctorId, recipientId, sponsorId, status…) */
export async function getAppointments(
  params: Record<string, string | number>,
): Promise<Appointment[]> {
  const query = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)]),
  ).toString();
  return getApiClient().get<Appointment[]>(`/api/v1/appointments?${query}`);
}

/** Activate an appointment (called when doctor joins Daily.co room) */
export async function activateAppointment(
  appointmentId: number,
): Promise<AppointmentResponse> {
  return getApiClient().put<AppointmentResponse>(
    `/api/v1/appointments/${appointmentId}/activate`,
  );
}

/** Complete an appointment (called when all participants leave) */
export async function completeAppointment(
  appointmentId: number,
): Promise<AppointmentResponse> {
  return getApiClient().put<AppointmentResponse>(
    `/api/v1/appointments/${appointmentId}/complete`,
  );
}
