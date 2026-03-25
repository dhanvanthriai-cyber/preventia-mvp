/**
 * types/index.ts — Shared TypeScript types
 * Project Preventia
 *
 * Must stay in sync with the Spring Boot domain / DTO layer.
 * No React Native or DOM dependencies.
 */

// ─── Auth ─────────────────────────────────────────────────────────────────────

export type UserRole = 'RECIPIENT' | 'SPONSOR' | 'DOCTOR' | 'PHARMACIST' | 'ADMIN';

export interface AuthUser {
  token: string;
  role: UserRole;
  userId: number;
  name: string;
}

// ─── Appointments ─────────────────────────────────────────────────────────────

/** Must match com.preventia.appointment.domain.AppointmentStatus */
export type AppointmentStatus = 'SCHEDULED' | 'ACTIVE' | 'CANCELLED' | 'COMPLETED' | 'LOCKED';

export interface Appointment {
  id: number;
  /** Daily.co room URL (from DailyRoomService) */
  dailyRoomUrl: string;
  doctorToken: string;
  recipientToken: string;
  sponsorToken?: string;
  startTime: string; // ISO-8601
  endTime: string;   // ISO-8601
  status: AppointmentStatus;
  doctorId?: number;
  recipientId?: number;
  sponsorId?: number;
  recipientName?: string;
  doctorName?: string;
  /** S3 URL for the attached prescription PDF, if any */
  prescriptionUrl?: string;
}

export interface CreateAppointmentRequest {
  doctorId: number;
  recipientId: number;
  sponsorId?: number;
  startTime: string; // ISO-8601
  endTime: string;   // ISO-8601
}

/**
 * Response returned by POST /api/v1/appointments
 * and GET /api/v1/appointments/{id}
 */
export interface AppointmentResponse {
  id: number;
  status: AppointmentStatus;
  startTime: string;
  endTime: string;
  doctorId: number;
  recipientId: number;
  sponsorId?: number;
  /** Daily.co room URL assigned to this appointment */
  roomUrl: string;
  /** JWT token for the doctor to join the Daily room */
  doctorToken: string;
  /** JWT token for the recipient (patient) to join the Daily room */
  recipientToken: string;
  /** JWT token for the sponsor to join as observer (nullable) */
  sponsorToken?: string;
}

// ─── Medications ──────────────────────────────────────────────────────────────

export type RefillUrgency = 'CRITICAL' | 'WARNING' | 'OK';

export interface Medication {
  medicationId: number;
  medicationName: string;
  dosage: string;
  daysRemaining: number;
  urgency: RefillUrgency;
  prescribedBy?: string;
}

// ─── Clinical / SOAP ──────────────────────────────────────────────────────────

export interface SoapNote {
  id: number;
  appointmentId: number;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  createdAt: string; // ISO-8601
  doctorId: number;
  patientId: number;
}

// ─── Family Members ───────────────────────────────────────────────────────────

export type RelationshipType = 'CHILD' | 'PARENT' | 'SPOUSE' | 'OTHER';

export type FamilyMemberCareStatus =
  | 'ACTIVE'
  | 'CARE_UPDATED'
  | 'PENDING_LAB'
  | 'UP_TO_DATE';

export interface FamilyMember {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  initials: string;
  dateOfBirth?: string;   // ISO date "YYYY-MM-DD"
  phone?: string;
  email?: string;
  address?: string;
  relationship: RelationshipType;
  photoUrl?: string;
  careStatus: FamilyMemberCareStatus;
  createdAt: string;      // ISO-8601 instant
}

export interface AddFamilyMemberRequest {
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  phone?: string;
  email?: string;
  address?: string;
  relationship: RelationshipType;
}

// ─── Service Enrollment ───────────────────────────────────────────────────────

export interface WellnessProgram {
  id: string;
  name: string;
  description: string;
  priceMonthly: number;
  currency: string;
}

export interface EnrollmentRequest {
  programId: string;
  memberIds: number[];
  addOns: string[];
}
