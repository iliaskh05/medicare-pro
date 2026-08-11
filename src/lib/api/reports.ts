import { javaApi } from "./config";

export type ReportSummary = {
  id: string;
  patientId: string;
  patientName: string;
  examLabel: string;
  createdAt: string;
  status: "draft" | "validated" | "sent";
  radiologist: string;
};

/** GET {JAVA_API_BASE}/api/comptes-rendus */
export async function fetchReports(
  patientId?: string,
  signal?: AbortSignal,
): Promise<ReportSummary[]> {
  const query = patientId ? `?patientId=${encodeURIComponent(patientId)}` : "";
  const rows = await javaApi<ReportSummary[]>(
    `/api/comptes-rendus${query}`,
    signal ? { signal } : {},
  );
  return rows ?? [];
}

/** GET {JAVA_API_BASE}/api/documents/{id}/pdf */
export async function downloadReport(documentId: string): Promise<Blob | null> {
  return javaApi<Blob>(`/api/documents/${encodeURIComponent(documentId)}/pdf`);
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

/** POST {JAVA_API_BASE}/api/imagerie/{studyId}/analyse */
export async function requestImageAnalysis(studyId: string) {
  return javaApi(`/api/imagerie/${encodeURIComponent(studyId)}/analyse`, { method: "POST" });
}
