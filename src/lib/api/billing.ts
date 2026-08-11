import type { Facture } from "@/types/domain";

import { javaApi } from "./config";

export type InvoicePayload = {
  patientId: string;
  patientName: string;
  acte: string;
  montant: number;
  acompte: number;
  modePaiement: "espèces" | "carte" | "chèque" | "virement";
  remise?: number;
};

/** GET {JAVA_API_BASE}/api/factures */
export async function fetchInvoices(signal?: AbortSignal): Promise<Facture[]> {
  const rows = await javaApi<Facture[]>("/api/factures", signal ? { signal } : {});
  return rows ?? [];
}

/** POST {JAVA_API_BASE}/api/factures */
export async function submitInvoice(payload: InvoicePayload): Promise<{ reference: string }> {
  return javaApi<{ reference: string }>("/api/factures", { method: "POST", body: payload });
}

/** PATCH {JAVA_API_BASE}/api/factures/{reference}/reglement */
export async function settleInvoice(reference: string): Promise<void> {
  await javaApi<void>(`/api/factures/${encodeURIComponent(reference)}/reglement`, {
    method: "PATCH",
  });
}
