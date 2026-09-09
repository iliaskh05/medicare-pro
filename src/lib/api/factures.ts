/**
 * Factures PDF — GET {JAVA_API_BASE}/api/factures/{id}/pdf
 * (et /api/factures/examen/{id} pour la worklist)
 */
import { javaApiBlob } from "./config";

function slugPatient(name: string): string {
  return (
    name
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 60) || "patient"
  );
}

/** Télécharge la facture commerciale PDF par id de facture (sans examen requis). */
export async function downloadFacture(
  invoiceId: string,
  reference: string,
  patientNom: string,
): Promise<void> {
  const blob = await javaApiBlob(`/api/factures/${encodeURIComponent(invoiceId)}/pdf`);
  const ref = slugPatient(reference || invoiceId);
  triggerDownload(blob, `FACTURE_${ref}_${slugPatient(patientNom)}.pdf`);
}

/** Télécharge la facture PDF d'un examen (JWT + blob). */
export async function downloadFactureExamen(
  examenId: string,
  patientNom: string,
): Promise<void> {
  const blob = await javaApiBlob(`/api/factures/examen/${encodeURIComponent(examenId)}`);
  triggerDownload(blob, `FACTURE_${slugPatient(patientNom)}.pdf`);
}

export async function previewFactureExamen(examenId: string): Promise<void> {
  const blob = await javaApiBlob(`/api/factures/examen/${encodeURIComponent(examenId)}`);
  openBlob(blob);
}

export async function downloadCompteRenduExamen(
  examenId: string,
  patientNom: string,
): Promise<void> {
  const blob = await javaApiBlob(
    `/api/worklist/${encodeURIComponent(examenId)}/compte-rendu.pdf`,
  );
  triggerDownload(blob, `compte_rendu_${slugPatient(patientNom)}.pdf`);
}

export async function previewCompteRenduExamen(examenId: string): Promise<void> {
  const blob = await javaApiBlob(
    `/api/worklist/${encodeURIComponent(examenId)}/compte-rendu.pdf`,
  );
  openBlob(blob);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    window.URL.revokeObjectURL(url);
  }
}

function openBlob(blob: Blob) {
  const url = window.URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener");
}
