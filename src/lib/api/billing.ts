import { factures, type Facture } from "@/data/mock";

import { isJavaApiConfigured, javaApi } from "./config";

export type InvoicePayload = {
  patientId: string;
  patientName: string;
  acte: string;
  montant: number;
  acompte: number;
  modePaiement: "espèces" | "carte" | "chèque" | "virement";
  remise?: number;
};

/**
 * Liste des factures du centre.
 * TODO backend Java : GET /api/factures
 */
export async function fetchInvoices(): Promise<Facture[]> {
  if (isJavaApiConfigured()) return javaApi<Facture[]>("/api/factures");
  return factures;
}

/**
 * Enregistre une facture / un règlement caisse.
 * TODO backend Java : POST /api/factures
 */
export async function submitInvoice(payload: InvoicePayload): Promise<{ reference: string }> {
  if (isJavaApiConfigured()) {
    return javaApi<{ reference: string }>("/api/factures", { method: "POST", body: payload });
  }
  return { reference: `FCT-${Date.now().toString().slice(-4)}` };
}

/**
 * Marque une facture comme réglée.
 * TODO backend Java : PATCH /api/factures/{reference}/reglement
 */
export async function settleInvoice(reference: string): Promise<void> {
  if (isJavaApiConfigured()) {
    await javaApi<void>(`/api/factures/${encodeURIComponent(reference)}/reglement`, {
      method: "PATCH",
    });
  }
}

/**
 * Export comptable des dossiers validés (flux CSV renvoyé par le backend).
 * TODO backend Java : GET /api/factures/export?format=csv
 */
export async function fetchAccountingExport(params: {
  format: "csv" | "pdf";
  from?: string;
  to?: string;
}): Promise<Blob | null> {
  if (!isJavaApiConfigured()) return null;
  const search = new URLSearchParams({
    format: params.format,
    ...(params.from ? { from: params.from } : {}),
    ...(params.to ? { to: params.to } : {}),
  });
  const res = await fetch(`/api/factures/export?${search.toString()}`);
  return res.ok ? res.blob() : null;
}
