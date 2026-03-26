import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';

type JwtPayload = {
  sub?: string;
  name?: string;
  role?: string;
};

export type AdminDashboard = {
  generatedAt: string;
  pulseMetrics: {
    totalUsers: number;
    patients: number;
    doctors: number;
    pharmacists: number;
    admins: number;
    liveConsultations: number;
    scheduledToday: number;
    upcomingAppointments: number;
    pendingPrescriptions: number;
    awaitingClarification: number;
    labExceptions: number;
    missingRoomLinks: number;
    criticalRefills: number;
    paymentsCapturedToday: number;
    webhookFailuresLast24Hours: number;
    auditEventsToday: number;
    watchlist: string[];
  };
  unifiedUserManagement: {
    counts: {
      total: number;
      patients: number;
      doctors: number;
      pharmacists: number;
      sponsors: number;
      admins: number;
    };
    recentUsers: AdminManagedUser[];
    directory: AdminManagedUser[];
  };
  clinicalVerification: {
    counts: {
      pendingPrescriptions: number;
      awaitingClarification: number;
      slaBreaches: number;
      openLabOrders: number;
      coldChainBreaches: number;
    };
    prescriptions: AdminPrescriptionItem[];
    labOrders: AdminLabOrderItem[];
  };
  videoOperations: {
    metrics: {
      liveConsultations: number;
      scheduledToday: number;
      upcomingAppointments: number;
      completedToday: number;
      missingRoomLinks: number;
    };
    webhookMetrics: {
      totalLast24Hours: number;
      failedLast24Hours: number;
      invalidSignaturesLast24Hours: number;
    };
    liveAppointments: AdminAppointmentItem[];
    upcomingAppointments: AdminAppointmentItem[];
    recentWebhookEvents: AdminWebhookEventItem[];
  };
  paperTrail: {
    counts: {
      prescriptionEventsToday: number;
      inventoryEventsToday: number;
      webhookEventsToday: number;
      capturedPaymentsToday: number;
    };
    recentEvents: AdminPaperTrailEvent[];
  };
};

export type AdminManagedUser = {
  userId: number;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  lastActivityAt?: string | null;
  activityCount: number;
  activityLabel: string;
};

export type AdminPrescriptionItem = {
  soapNoteId: number;
  patientName: string;
  doctorName: string;
  status: string;
  uploadedAt?: string | null;
  daysRemaining?: number | null;
  slaBreached: boolean;
};

export type AdminLabOrderItem = {
  labOrderId: number;
  patientName: string;
  testName: string;
  partner: string;
  status: string;
  scheduledAt?: string | null;
  collectedAt?: string | null;
  resultedAt?: string | null;
  coldChainBreached: boolean;
  requiresAttention: boolean;
};

export type AdminAppointmentItem = {
  appointmentId: number;
  patientName: string;
  doctorName: string;
  status: string;
  startTime: string;
  endTime: string;
  roomName?: string | null;
  roomProvisioned: boolean;
};

export type AdminWebhookEventItem = {
  eventId: number;
  provider: string;
  endpoint: string;
  eventType: string;
  referenceId?: string | null;
  roomName?: string | null;
  statusCode: number;
  signatureValid?: boolean | null;
  payloadSummary?: string | null;
  createdAt: string;
};

export type AdminPaperTrailEvent = {
  source: string;
  action: string;
  actorName: string;
  subject: string;
  detail: string;
  createdAt: string;
};

export type AdminSession = {
  token: string;
  role: 'ADMIN';
  name: string;
  email: string;
};

function getAppOrigin(): string {
  const requestHeaders = headers();
  const forwardedProto = requestHeaders.get('x-forwarded-proto');
  const forwardedHost = requestHeaders.get('x-forwarded-host');
  const host = requestHeaders.get('host');

  if (forwardedHost) {
    return `${forwardedProto ?? 'https'}://${forwardedHost}`;
  }

  if (host) {
    return `${forwardedProto ?? 'http'}://${host}`;
  }

  return process.env.NEXT_PUBLIC_APP_URL ?? API_BASE;
}

function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(Buffer.from(base64, 'base64').toString('utf8')) as JwtPayload;
  } catch {
    return null;
  }
}

function getRouteForRole(role: string) {
  switch (role) {
    case 'DOCTOR':
      return '/doctor';
    case 'PHARMACIST':
      return '/pharmacist';
    case 'SPONSOR':
      return '/sponsor';
    case 'RECIPIENT':
      return '/patient';
    default:
      return '/login';
  }
}

export function getAdminSession(nextPath = '/admin'): AdminSession {
  const token = cookies().get('preventia_token')?.value;
  if (!token) {
    redirect(`/login?role=ADMIN&next=${encodeURIComponent(nextPath)}`);
  }

  const payload = decodeJwtPayload(token);
  const role = payload?.role ?? '';

  if (role !== 'ADMIN') {
    redirect(getRouteForRole(role));
  }

  return {
    token,
    role: 'ADMIN',
    name: payload?.name ?? payload?.sub ?? 'Admin User',
    email: payload?.sub ?? 'unknown@preventia.app',
  };
}

export async function fetchAdminDashboard(token: string): Promise<AdminDashboard> {
  const res = await fetch(`${getAppOrigin()}/api/v1/admin/dashboard`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (res.status === 401 || res.status === 403) {
    redirect('/login?role=ADMIN&next=/admin');
  }

  if (!res.ok) {
    throw new Error(`Admin dashboard request failed: ${res.status}`);
  }

  return res.json() as Promise<AdminDashboard>;
}

export function formatAdminDateTime(
  value?: string | null,
  options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  },
) {
  if (!value) return 'No timestamp available';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No timestamp available';

  return date.toLocaleString('en-IN', options);
}

export function formatPercentage(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

export function humanizeEnum(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export interface FeedbackAnalytics {
  totalResponses: number;
  averageRating:  number | null;
  distribution:   Array<{ rating: number; count: number }>;
  recentComments: Array<{
    rating:       number;
    comment:      string;
    submitted_at: string;
    patient_name: string;
    doctor_name:  string;
  }>;
}

export async function fetchFeedbackAnalytics(token: string): Promise<FeedbackAnalytics | null> {
  try {
    const res = await fetch(`${getAppOrigin()}/api/v1/admin/feedback`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json() as Promise<FeedbackAnalytics>;
  } catch {
    return null;
  }
}
