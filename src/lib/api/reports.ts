import { javaApi, javaApiBlob } from "./config";

export type ReportStatus = "draft" | "in_review" | "validated" | "amended";

export const REPORT_STATUS_LABEL: Record<ReportStatus, string> = {
  draft: "Brouillon",
  in_review: "En relecture",
  validated: "Validé",
  amended: "Amendé",
};

export type ReportSummary = {
  id: string;
  examenId?: string;
  patientId: string;
  patientName: string;
  examLabel: string;
  createdAt: string;
  status: ReportStatus;
  radiologist: string;
  authorName?: string;
  currentVersion?: number;
  indication?: string;
  technique?: string;
  resultats?: string;
  conclusion?: string;
  body?: string;
  texte?: string;
};

export type ReportVersion = {
  id: string;
  versionNumber: number;
  indication?: string;
  technique?: string;
  resultats?: string;
  conclusion?: string;
  body?: string;
  authorName?: string;
  createdAt: string;
};

export type ReportWritePayload = {
  examenId?: string | number;
  indication?: string;
  technique?: string;
  resultats?: string;
  conclusion?: string;
  body?: string;
  texte?: string;
};

export type ReportAmendPayload = {
  reason: string;
  indication?: string;
  technique?: string;
  resultats?: string;
  conclusion?: string;
  body?: string;
  texte?: string;
};

function normalizeReport(row: ReportSummary): ReportSummary {
  return {
    ...row,
    patientId: row.patientId ?? "",
    patientName: row.patientName ?? "",
    examLabel: row.examLabel ?? "",
    radiologist: row.radiologist ?? row.authorName ?? "",
    status: (row.status?.toLowerCase() as ReportStatus) || "draft",
    createdAt: row.createdAt ?? "",
  };
}

/** GET {JAVA_API_BASE}/api/reports (alias /api/comptes-rendus) */
export async function fetchReports(
  patientId?: string,
  signal?: AbortSignal,
  status?: string,
): Promise<ReportSummary[]> {
  const params = new URLSearchParams();
  if (patientId) params.set("patientId", patientId);
  if (status) params.set("status", status);
  const query = params.toString() ? `?${params}` : "";
  const rows = await javaApi<ReportSummary[]>(
    `/api/reports${query}`,
    signal ? { signal } : {},
  );
  return (rows ?? []).map(normalizeReport);
}

/** GET {JAVA_API_BASE}/api/reports/{id} */
export async function getReport(id: string, signal?: AbortSignal): Promise<ReportSummary> {
  const row = await javaApi<ReportSummary>(
    `/api/reports/${encodeURIComponent(id)}`,
    signal ? { signal } : {},
  );
  return normalizeReport(row);
}

/** POST {JAVA_API_BASE}/api/reports — create draft */
export async function createReport(payload: ReportWritePayload): Promise<ReportSummary> {
  const row = await javaApi<ReportSummary>("/api/reports", {
    method: "POST",
    body: payload,
  });
  return normalizeReport(row);
}

/** PUT {JAVA_API_BASE}/api/reports/{id} — update draft / in_review */
export async function saveReportDraft(
  id: string,
  payload: ReportWritePayload,
): Promise<ReportSummary> {
  const row = await javaApi<ReportSummary>(`/api/reports/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: payload,
  });
  return normalizeReport(row);
}

/** POST {JAVA_API_BASE}/api/reports/{id}/submit — DRAFT → IN_REVIEW */
export async function submitReport(id: string): Promise<ReportSummary> {
  const row = await javaApi<ReportSummary>(
    `/api/reports/${encodeURIComponent(id)}/submit`,
    { method: "POST" },
  );
  return normalizeReport(row);
}

/** POST {JAVA_API_BASE}/api/reports/{id}/validate */
export async function validateReport(id: string): Promise<ReportSummary> {
  const row = await javaApi<ReportSummary>(
    `/api/reports/${encodeURIComponent(id)}/validate`,
    { method: "POST" },
  );
  return normalizeReport(row);
}

/** POST {JAVA_API_BASE}/api/reports/{id}/amend */
export async function amendReport(
  id: string,
  payload: ReportAmendPayload,
): Promise<ReportSummary> {
  const row = await javaApi<ReportSummary>(
    `/api/reports/${encodeURIComponent(id)}/amend`,
    { method: "POST", body: payload },
  );
  return normalizeReport(row);
}

/** GET {JAVA_API_BASE}/api/reports/{id}/versions */
export async function fetchReportVersions(
  id: string,
  signal?: AbortSignal,
): Promise<ReportVersion[]> {
  const rows = await javaApi<ReportVersion[]>(
    `/api/reports/${encodeURIComponent(id)}/versions`,
    signal ? { signal } : {},
  );
  return rows ?? [];
}

/** GET {JAVA_API_BASE}/api/reports/{id}/pdf */
export async function downloadReportPdf(id: string): Promise<Blob> {
  return javaApiBlob(`/api/reports/${encodeURIComponent(id)}/pdf`);
}

/** @deprecated Prefer downloadReportPdf — kept for viewer compatibility */
export async function downloadReport(documentId: string): Promise<Blob | null> {
  try {
    return await downloadReportPdf(documentId);
  } catch {
    return null;
  }
}

/** Déclenche l'enregistrement d'un Blob côté navigateur. */
export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
