import { factures, facturesSuspectes } from "@/data/mock";
import type { InvoiceLike } from "./features";

/**
 * Historical fraud labels derived from the existing audit mock dataset.
 * Positive labels = invoices previously flagged as suspectes.
 */
export type LabeledInvoice = InvoiceLike & { label: 0 | 1; raison?: string };

export function loadHistoricalLabeledInvoices(): LabeledInvoice[] {
  const suspectIds = new Set(facturesSuspectes.map((f) => f.id));
  const raisonById = new Map(facturesSuspectes.map((f) => [f.id, f.raison]));

  const fromNormal: LabeledInvoice[] = factures.map((f) => ({
    id: f.id,
    patient: f.patient,
    examen: f.examen,
    total: f.total,
    partMutuelle: f.partMutuelle,
    date: f.date,
    label: suspectIds.has(f.id) ? 1 : 0,
    ...(raisonById.get(f.id) ? { raison: raisonById.get(f.id) as string } : {}),
  }));

  const fromSuspects: LabeledInvoice[] = facturesSuspectes.map((f) => ({
    id: f.id,
    patient: f.patient,
    examen: guessExam(f.raison, f.montant),
    total: f.montant,
    partMutuelle: Math.round(f.montant * 0.6),
    date: f.date,
    label: 1 as const,
    raison: f.raison,
  }));

  // Deduplicate by id (suspects win)
  const map = new Map<string, LabeledInvoice>();
  for (const row of [...fromNormal, ...fromSuspects]) map.set(row.id, row);

  // Synthetic negatives for class balance (legitimate barème invoices)
  const syntheticNeg: LabeledInvoice[] = [
    {
      id: "FCT-SYN-01",
      patient: "Salma Chraibi",
      examen: "Échographie Abdominale",
      total: 450,
      partMutuelle: 0,
      label: 0,
    },
    {
      id: "FCT-SYN-02",
      patient: "Youssef El Amrani",
      examen: "Radio Thorax",
      total: 250,
      partMutuelle: 150,
      label: 0,
    },
    {
      id: "FCT-SYN-03",
      patient: "Amina Hakimi",
      examen: "Radio Poignet",
      total: 250,
      partMutuelle: 175,
      label: 0,
    },
    {
      id: "FCT-SYN-04",
      patient: "Zineb Sekkat",
      examen: "IRM Genou",
      total: 2200,
      partMutuelle: 1540,
      label: 0,
    },
    {
      id: "FCT-SYN-05",
      patient: "Nadia Berrada",
      examen: "Mammographie",
      total: 700,
      partMutuelle: 490,
      label: 0,
    },
  ];

  for (const row of syntheticNeg) map.set(row.id, row);
  return [...map.values()];
}

function guessExam(raison: string, montant: number): string {
  if (/échographie|pelvienne/i.test(raison)) return "Échographie Pelvienne";
  if (/scanner/i.test(raison)) return "Scanner Thoracique";
  if (montant >= 4000) return "IRM Cérébrale";
  if (montant >= 2000) return "IRM Lombaire";
  if (montant >= 1000) return "Scanner Abdominal";
  return "Radio Thorax";
}
