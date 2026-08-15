/**
 * Couche d'accès PACS / imagerie DICOM (simulateur).
 * Backend : GET {JAVA_API_BASE}/api/imagerie/examen/{id}
 */
import { api } from "./client";

export type ImagerieImage = {
  instanceNumber: number;
  sopInstanceUID: string;
  url: string;
};

export type ImagerieSeries = {
  seriesInstanceUID: string;
  seriesDescription: string;
  modality: string;
  numberOfInstances: number;
  thumbnailUrl: string;
  images: ImagerieImage[];
};

export type ImagerieStudy = {
  examenId: string;
  studyInstanceUID: string;
  patientName: string;
  patientId: string;
  modality: string;
  studyDescription: string;
  studyDate: string;
  numberOfImages: number;
  series: ImagerieSeries[];
};

/** GET /api/imagerie/examen/{id} — métadonnées DICOM simulées (JWT). */
export async function fetchImagerieExamen(
  examenId: string,
  signal?: AbortSignal,
): Promise<ImagerieStudy> {
  return api.get<ImagerieStudy>(
    `/api/imagerie/examen/${encodeURIComponent(examenId)}`,
    signal ? { signal } : {},
  );
}
