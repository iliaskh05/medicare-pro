import type { Anomalie, AuditKpis, TendanceAnomalie } from "@/types/audit";

import { javaApi } from "./config";

export type AuditOverview = {
  kpis: AuditKpis;
  anomalies: Anomalie[];
  tendance: TendanceAnomalie[];
};

/** KPIs neutres utilisés tant que le backend n'a rien renvoyé. */
export const EMPTY_AUDIT_KPIS: AuditKpis = {
  dossiersAnalyses: 0,
  dossiersAnalysesDelta: 0,
  tauxConformite: 0,
  tauxConformiteDelta: 0,
  montantEnJeu: 0,
};

/** GET {JAVA_API_BASE}/api/audit/anomalies */
export async function fetchAnomalies(signal?: AbortSignal): Promise<Anomalie[]> {
  const rows = await javaApi<Anomalie[]>("/api/audit/anomalies", signal ? { signal } : {});
  return rows ?? [];
}

/** GET {JAVA_API_BASE}/api/patients/{id}/anomalies */
export async function fetchPatientAnomalies(patientId: string, signal?: AbortSignal): Promise<Anomalie[]> {
  const rows = await javaApi<Anomalie[]>(`/api/patients/${encodeURIComponent(patientId)}/anomalies`, signal ? { signal } : {});
  return rows ?? [];
}

/** GET {JAVA_API_BASE}/api/audit/kpis */
export async function fetchAuditKpis(signal?: AbortSignal): Promise<AuditKpis> {
  const kpis = await javaApi<AuditKpis>("/api/audit/kpis", signal ? { signal } : {});
  return kpis ?? EMPTY_AUDIT_KPIS;
}

/** GET {JAVA_API_BASE}/api/audit/tendance */
export async function fetchAuditTrend(signal?: AbortSignal): Promise<TendanceAnomalie[]> {
  const rows = await javaApi<TendanceAnomalie[]>("/api/audit/tendance", signal ? { signal } : {});
  return rows ?? [];
}

/** PATCH {JAVA_API_BASE}/api/audit/anomalies/{id} */
export async function updateAnomalieStatut(
  id: string,
  statut: "confirmed" | "dismissed",
): Promise<void> {
  await javaApi<void>(`/api/audit/anomalies/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: { statut },
  });
}
