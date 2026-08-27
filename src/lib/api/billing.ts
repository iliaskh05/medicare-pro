import { formatMAD } from "@/types/domain";
import { javaApi } from "./config";

/** Statuts alignés sur InvoiceStatus Java (source de vérité). */
export type InvoiceStatus =
  | "DRAFT"
  | "ISSUED"
  | "PARTIALLY_PAID"
  | "PAID"
  | "CANCELLED"
  | "REFUNDED";

export type InvoiceItem = {
  id?: string;
  examenId?: string | null;
  catalogueId?: string | null;
  label: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type Invoice = {
  id: string;
  reference: string;
  patientId: string;
  patientName: string;
  examen: string;
  acte: string;
  /** Statut technique backend */
  statut: InvoiceStatus;
  total: number;
  amountPaid: number;
  amountRefunded: number;
  /** Reste global (total - payé + remboursé) */
  reste: number;
  insuranceShare: number;
  patientShare: number;
  /** Alias UI part mutuelle */
  partMutuelle: number;
  /** Alias UI reste patient (patientShare - payé net) */
  resteACharge: number;
  remise: number;
  modePaiement: string;
  date: string;
  createdAt?: string;
  notes?: string | null;
  items: InvoiceItem[];
};

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

export type InvoicePaymentPayload = {
  montant: number;
  mode: string;
  idempotencyKey?: string;
};

export type InvoiceRefundPayload = {
  montant: number;
  reason: string;
};

type InvoiceApiRow = {
  id?: string | number;
  reference?: string;
  patientId?: string | number;
  patient?: string;
  patientName?: string;
  examen?: string;
  acte?: string;
  statut?: string;
  status?: string;
  total?: number | string;
  amountPaid?: number | string;
  amountRefunded?: number | string;
  reste?: number | string;
  partMutuelle?: number | string;
  insuranceShare?: number | string;
  patientShare?: number | string;
  resteACharge?: number | string;
  remise?: number | string;
  modePaiement?: string;
  paiement?: string;
  date?: string;
  createdAt?: string;
  notes?: string | null;
  items?: Array<Partial<InvoiceItem> & { id?: string | number }>;
};

function asNumber(value: unknown): number {
  if (value == null || String(value).trim() === "") return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeStatus(raw: string | undefined | null): InvoiceStatus {
  const s = String(raw ?? "").trim().toUpperCase();
  if (
    s === "DRAFT" ||
    s === "ISSUED" ||
    s === "PARTIALLY_PAID" ||
    s === "PAID" ||
    s === "CANCELLED" ||
    s === "REFUNDED"
  ) {
    return s;
  }
  // Labels français legacy éventuels
  if (s === "PAYÉ" || s === "PAYE") return "PAID";
  if (s === "ANNULÉ" || s === "ANNULE") return "CANCELLED";
  if (s.includes("PARTIEL")) return "PARTIALLY_PAID";
  if (s.includes("ATTENTE") || s.includes("MUTUELLE")) return "ISSUED";
  return "ISSUED";
}

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  DRAFT: "Brouillon",
  ISSUED: "Émise",
  PARTIALLY_PAID: "Partiellement payée",
  PAID: "Payée",
  CANCELLED: "Annulée",
  REFUNDED: "Remboursée",
};

export function invoiceStatusTone(
  statut: InvoiceStatus,
): "success" | "warning" | "destructive" | "neutral" | "info" | "primary" {
  switch (statut) {
    case "PAID":
      return "success";
    case "PARTIALLY_PAID":
      return "warning";
    case "ISSUED":
    case "DRAFT":
      return "info";
    case "CANCELLED":
    case "REFUNDED":
      return "destructive";
    default:
      return "neutral";
  }
}

export function mapInvoice(row: InvoiceApiRow): Invoice {
  const statut = normalizeStatus(row.statut ?? row.status);
  const total = asNumber(row.total);
  const amountPaid = asNumber(row.amountPaid);
  const amountRefunded = asNumber(row.amountRefunded);
  const insuranceShare = asNumber(row.insuranceShare ?? row.partMutuelle);
  const patientShare = asNumber(row.patientShare ?? Math.max(0, total - insuranceShare));
  const reste = asNumber(row.reste ?? Math.max(0, total - amountPaid + amountRefunded));
  const resteACharge = asNumber(
    row.resteACharge ?? Math.max(0, patientShare - amountPaid + amountRefunded),
  );

  return {
    id: String(row.id ?? row.reference ?? ""),
    reference: String(row.reference ?? row.id ?? ""),
    patientId: String(row.patientId ?? ""),
    patientName: row.patientName ?? row.patient ?? "",
    examen: row.examen ?? row.acte ?? "",
    acte: row.acte ?? row.examen ?? "",
    statut,
    total,
    amountPaid,
    amountRefunded,
    reste: statut === "CANCELLED" || statut === "REFUNDED" ? 0 : reste,
    insuranceShare,
    patientShare,
    partMutuelle: insuranceShare,
    resteACharge: statut === "CANCELLED" || statut === "REFUNDED" ? 0 : resteACharge,
    remise: asNumber(row.remise),
    modePaiement: row.modePaiement ?? row.paiement ?? "",
    date: row.date ?? "",
    createdAt: row.createdAt,
    notes: row.notes ?? null,
    items: (row.items ?? []).map((it) => {
      const item: InvoiceItem = {
        label: it.label ?? "",
        quantity: asNumber(it.quantity ?? 1),
        unitPrice: asNumber(it.unitPrice),
        lineTotal: asNumber(it.lineTotal),
        examenId: it.examenId != null ? String(it.examenId) : null,
        catalogueId: it.catalogueId != null ? String(it.catalogueId) : null,
      };
      if (it.id != null) item.id = String(it.id);
      return item;
    }),
  };
}

/** @deprecated Prefer Invoice + mapInvoice — compat types/domain Facture */
export type FactureCompat = {
  id: string;
  date: string;
  patient: string;
  examen: string;
  total: number;
  partMutuelle: number;
  resteACharge: number;
  paiement: "Espèces" | "Carte bancaire" | "Chèque" | "Virement";
  statut: string;
};

export function invoiceToLegacyFacture(inv: Invoice): FactureCompat {
  const mode = inv.modePaiement.toLowerCase();
  const paiement: FactureCompat["paiement"] = mode.includes("carte")
    ? "Carte bancaire"
    : mode.includes("chèque") || mode.includes("cheque")
      ? "Chèque"
      : mode.includes("virement")
        ? "Virement"
        : "Espèces";
  return {
    id: inv.reference || inv.id,
    date: inv.date,
    patient: inv.patientName,
    examen: inv.examen || inv.acte,
    total: inv.total,
    partMutuelle: inv.partMutuelle,
    resteACharge: inv.resteACharge,
    paiement,
    statut: INVOICE_STATUS_LABEL[inv.statut],
  };
}

/** GET /api/factures */
export async function fetchInvoices(signal?: AbortSignal): Promise<Invoice[]> {
  const rows = await javaApi<InvoiceApiRow[]>("/api/factures", signal ? { signal } : {});
  return (rows ?? []).map(mapInvoice);
}

/** GET /api/factures/{id} */
export async function fetchInvoice(id: string, signal?: AbortSignal): Promise<Invoice> {
  const row = await javaApi<InvoiceApiRow>(
    `/api/factures/${encodeURIComponent(id)}`,
    signal ? { signal } : {},
  );
  return mapInvoice(row);
}

/** POST /api/factures — unwrap { facture } si présent */
export async function submitInvoice(
  payload: InvoicePayload,
): Promise<{ reference: string; invoice: Invoice }> {
  const body = {
    ...payload,
    patientId: Number(payload.patientId),
    examenId: payload.examenId != null ? Number(payload.examenId) : undefined,
  };
  const res = await javaApi<{
    reference?: string;
    id?: string;
    facture?: InvoiceApiRow;
  } & InvoiceApiRow>("/api/factures", { method: "POST", body });

  const invoice = mapInvoice(res.facture ?? res);
  return {
    reference: String(res.reference ?? invoice.reference),
    invoice,
  };
}

/** POST /api/factures/{id}/paiements */
export async function payInvoice(id: string, payload: InvoicePaymentPayload): Promise<Invoice> {
  const row = await javaApi<InvoiceApiRow>(
    `/api/factures/${encodeURIComponent(id)}/paiements`,
    { method: "POST", body: payload },
  );
  return mapInvoice(row);
}

/** POST /api/factures/{id}/refund */
export async function refundInvoice(id: string, payload: InvoiceRefundPayload): Promise<Invoice> {
  const row = await javaApi<InvoiceApiRow>(
    `/api/factures/${encodeURIComponent(id)}/refund`,
    { method: "POST", body: payload },
  );
  return mapInvoice(row);
}

/** POST /api/factures/{id}/cancel */
export async function cancelInvoice(id: string): Promise<Invoice> {
  const row = await javaApi<InvoiceApiRow>(
    `/api/factures/${encodeURIComponent(id)}/cancel`,
    { method: "POST" },
  );
  return mapInvoice(row);
}

/** PATCH /api/factures/{reference}/reglement — règle le reste */
export async function settleInvoice(reference: string): Promise<Invoice> {
  const row = await javaApi<InvoiceApiRow>(
    `/api/factures/${encodeURIComponent(reference)}/reglement`,
    { method: "PATCH" },
  );
  return mapInvoice(row);
}

export function formatInvoiceMoney(n: number): string {
  return formatMAD(n);
}

export function canPayInvoice(inv: Invoice): boolean {
  return (
    (inv.statut === "ISSUED" || inv.statut === "PARTIALLY_PAID" || inv.statut === "DRAFT") &&
    inv.resteACharge > 0
  );
}

export function canCancelInvoice(inv: Invoice): boolean {
  return inv.statut === "DRAFT" || inv.statut === "ISSUED";
}

export function canRefundInvoice(inv: Invoice): boolean {
  return (
    (inv.statut === "PAID" || inv.statut === "PARTIALLY_PAID") &&
    inv.amountPaid - inv.amountRefunded > 0
  );
}
