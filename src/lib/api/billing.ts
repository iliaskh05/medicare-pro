import type { Facture } from "@/types/domain";

import { javaApi } from "./config";

export type InvoicePayload = {
  patientId: string | number;
  patientName?: string;
  examenId?: string | number;
  acte: string;
  montant: number;
  acompte?: number;
  modePaiement: "espèces" | "carte" | "chèque" | "virement" | string;
  remise?: number;
  notes?: string;
  idempotencyKey?: string;
};

type InvoiceApiRow = Partial<Facture> & {
  id?: string | number;
  reference?: string;
  patient?: string;
  patientName?: string;
  examen?: string;
  acte?: string;
  total?: number | string;
  partMutuelle?: number | string;
  resteACharge?: number | string;
  reste?: number | string;
  paiement?: string;
  status?: string;
  statut?: string;
  date?: string;
  modePaiement?: string;
};

function asNumber(value: unknown): number {
  if (value == null || String(value).trim() === "") return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function mapFacture(row: InvoiceApiRow): Facture {
  const resteACharge = asNumber(row.resteACharge ?? row.reste);
  const statutRaw = String(row.status ?? row.statut ?? "");
  const cancelled =
    statutRaw === "Annulé" ||
    statutRaw === "CANCELLED" ||
    statutRaw === "REFUNDED";
  const statut: Facture["statut"] = cancelled
    ? "Annulé"
    : resteACharge <= 0 || statutRaw === "Payé" || statutRaw === "PAID"
      ? "Payé"
      : "En attente de mutuelle";
  const paiementRaw = row.paiement ?? row.modePaiement ?? "Espèces";
  const paiement: Facture["paiement"] =
    paiementRaw.toLowerCase().includes("carte")
      ? "Carte bancaire"
      : paiementRaw.toLowerCase().includes("chèque") || paiementRaw.toLowerCase().includes("cheque")
        ? "Chèque"
        : paiementRaw.toLowerCase().includes("virement")
          ? "Virement"
          : "Espèces";
  return {
    id: String(row.reference ?? row.id ?? ""),
    date: row.date ?? "",
    patient: row.patient ?? row.patientName ?? "",
    examen: row.examen ?? row.acte ?? "",
    total: asNumber(row.total),
    partMutuelle: asNumber(row.partMutuelle),
    resteACharge: cancelled ? 0 : resteACharge,
    paiement,
    statut,
  };
}

/** GET {JAVA_API_BASE}/api/factures */
export async function fetchInvoices(signal?: AbortSignal): Promise<Facture[]> {
  const rows = await javaApi<InvoiceApiRow[]>("/api/factures", signal ? { signal } : {});
  return (rows ?? []).map(mapFacture);
}

/** POST {JAVA_API_BASE}/api/factures */
export async function submitInvoice(payload: InvoicePayload): Promise<{ reference: string }> {
  const body = {
    ...payload,
    patientId: Number(payload.patientId),
    examenId: payload.examenId != null ? Number(payload.examenId) : undefined,
  };
  return javaApi<{ reference: string }>("/api/factures", { method: "POST", body });
}

/** PATCH {JAVA_API_BASE}/api/factures/{reference}/reglement */
export async function settleInvoice(reference: string): Promise<void> {
  await javaApi<void>(`/api/factures/${encodeURIComponent(reference)}/reglement`, {
    method: "PATCH",
  });
}
