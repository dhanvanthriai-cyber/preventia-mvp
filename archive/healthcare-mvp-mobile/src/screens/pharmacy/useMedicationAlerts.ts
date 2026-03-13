/**
 * useMedicationAlerts.ts
 * Project Dhanvanthri — Pharmacy Screen
 *
 * Custom hook: fetches medication refill alerts from the backend
 * and polls every 60 seconds to surface CRITICAL / WARNING urgency items.
 *
 * Endpoint: GET /api/v1/patients/{patientId}/medications/alerts
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type MedicationUrgency = 'CRITICAL' | 'WARNING' | 'OK';

export interface MedicationAlert {
  medicationId: number;
  medicationName: string;
  dosage: string;
  daysRemaining: number;
  urgency: MedicationUrgency;
  prescribedBy?: string;
}

export interface AlertSummary {
  criticalCount: number;
  warningCount: number;
  okCount: number;
  totalCount: number;
}

export interface UseMedicationAlertsResult {
  medications: MedicationAlert[];
  alertSummary: AlertSummary;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 60_000; // 60 seconds

const BASE_URL = process.env.REACT_NATIVE_API_BASE_URL ?? 'http://localhost:8080';

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useMedicationAlerts(
  patientId: number,
  authToken: string,
): UseMedicationAlertsResult {
  const [medications, setMedications] = useState<MedicationAlert[]>([]);
  const [alertSummary, setAlertSummary] = useState<AlertSummary>({
    criticalCount: 0,
    warningCount: 0,
    okCount: 0,
    totalCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use a ref for the token so the interval closure always sees the latest value
  const tokenRef = useRef(authToken);
  useEffect(() => {
    tokenRef.current = authToken;
  }, [authToken]);

  const fetchAlerts = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch(
        `${BASE_URL}/api/v1/patients/${patientId}/medications/alerts`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${tokenRef.current}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data: MedicationAlert[] = await response.json();

      // Derive summary from the array
      const summary: AlertSummary = data.reduce(
        (acc, med) => {
          if (med.urgency === 'CRITICAL') acc.criticalCount++;
          else if (med.urgency === 'WARNING') acc.warningCount++;
          else acc.okCount++;
          acc.totalCount++;
          return acc;
        },
        { criticalCount: 0, warningCount: 0, okCount: 0, totalCount: 0 },
      );

      setMedications(data);
      setAlertSummary(summary);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch alerts');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  // Initial fetch + 60-second polling
  useEffect(() => {
    setLoading(true);
    void fetchAlerts();

    const intervalId = setInterval(() => {
      void fetchAlerts();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [fetchAlerts]);

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    await fetchAlerts();
  }, [fetchAlerts]);

  return { medications, alertSummary, loading, error, refresh };
}

export default useMedicationAlerts;
