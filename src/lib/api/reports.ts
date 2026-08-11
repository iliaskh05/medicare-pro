import { isJavaApiConfigured, javaApi } from "./config";

export type ReportSummary = {
  id: string;
  patientId: string;
  patientName: string;
  examLabel: string;
  createdAt: string;
  status: "draft" | "validated" | "sent";
  radiologist: string;
};

/**
 * Liste des comptes rendus.
 * TODO backend Java : GET /api/comptes-rendus
 */
export async function fetchReports(patientId?: string): Promise<ReportSummary[] | null> {
  if (isJavaApiConfigured()) {
    const query = patientId ? `?patientId=${encodeURIComponent(patientId)}` : "";
    return javaApi<ReportSummary[]>(`/api/comptes-rendus${query}`);
  }
  return null;
}

/**
 * Téléchargement du PDF d'un compte rendu / d'une facture.
 * TODO backend Java : GET /api/documents/{id}/pdf (réponse application/pdf)
 *
 * Retourne `null` lorsque l'API n'est pas configurée : l'appelant se rabat
 * alors sur la génération locale du document.
 */
export async function downloadReport(documentId: string): Promise<Blob | null> {
  if (!isJavaApiConfigured()) return null;
  const blob = await javaApi<Blob>(`/api/documents/${encodeURIComponent(documentId)}/pdf`);
  return blob;
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

/**
 * Analyse d'imagerie par le microservice Python.
 * TODO microservice Python : POST /imaging/analyze
 */
export async function requestImageAnalysis(studyId: string) {
  if (!isJavaApiConfigured()) return null;
  return javaApi(`/api/imagerie/${encodeURIComponent(studyId)}/analyse`, { method: "POST" });
}
