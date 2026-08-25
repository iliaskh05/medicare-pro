import { javaApi, javaApiBlob, javaApiForm } from "./config";

export type DocumentItem = {
  id: number;
  examenId?: number | null;
  patientId: number;
  type: string;
  nomOriginal: string;
  contentType: string;
  taille: number;
  createdAt?: string | null;
  createdBy?: string | null;
};

export async function fetchPatientDocuments(
  patientId: string,
  signal?: AbortSignal,
): Promise<DocumentItem[]> {
  return javaApi<DocumentItem[]>(
    `/api/documents/patient/${encodeURIComponent(patientId)}`,
    signal ? { signal } : {},
  );
}

export async function fetchExamenDocuments(
  examenId: string,
  signal?: AbortSignal,
): Promise<DocumentItem[]> {
  return javaApi<DocumentItem[]>(
    `/api/documents/examen/${encodeURIComponent(examenId)}`,
    signal ? { signal } : {},
  );
}

export async function uploadDocument(params: {
  patientId: string;
  examenId?: string | null;
  type?: string;
  file: File;
}): Promise<DocumentItem> {
  const form = new FormData();
  form.set("patientId", params.patientId);
  if (params.examenId) form.set("examenId", params.examenId);
  if (params.type) form.set("type", params.type);
  form.set("file", params.file);
  return javaApiForm<DocumentItem>("/api/documents", form);
}

export async function downloadDocumentFile(id: number): Promise<Blob> {
  return javaApiBlob(`/api/documents/${id}/fichier`);
}

export function isImageDocument(doc: DocumentItem): boolean {
  return (
    doc.contentType.startsWith("image/") ||
    /\.(jpe?g|png)$/i.test(doc.nomOriginal)
  );
}

export function isDicomDocument(doc: DocumentItem): boolean {
  return (
    doc.contentType.includes("dicom") ||
    /\.(dcm|dicom)$/i.test(doc.nomOriginal)
  );
}
