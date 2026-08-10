import { factures, patients } from "@/data/mock";
import type { FraudFeatureVector } from "../store/types";

/** Official-ish barèmes MAD used for baremeRatio feature. */
export const BAREMES: Record<string, number> = {
  "IRM Cérébrale": 2500,
  "IRM Lombaire": 2500,
  "IRM Genou": 2200,
  "IRM Épaule": 2200,
  "Scanner Thoracique": 1400,
  "Scanner Abdominal": 1600,
  "Scanner Cérébral": 1500,
  "Échographie Abdominale": 450,
  "Échographie Pelvienne": 400,
  "Échographie Thyroïde": 400,
  Mammographie: 700,
  "Radio Thorax": 250,
  "Radio Genou": 280,
  "Radio Poignet": 250,
};

const MALE_HINT = /\b(karim|youssef|abdelkrim|hicham|rachid|omar|mehdi)\b/i;
const FEMALE_PELVIC = /pelvienne|mammographie/i;

export type InvoiceLike = {
  id: string;
  patient: string;
  examen: string;
  total: number;
  partMutuelle?: number;
  date?: string;
};

export function extractFeatures(
  invoice: InvoiceLike,
  all: InvoiceLike[] = factures,
): FraudFeatureVector {
  const patient = patients.find((p) => p.nom === invoice.patient);
  const bareme = BAREMES[invoice.examen] ?? invoice.total;
  const samePatient = all.filter((f) => f.patient === invoice.patient);
  const sameExam = samePatient.filter((f) => f.examen === invoice.examen);

  const examsLast30Days = samePatient.length;
  const isDuplicate =
    samePatient.filter((f) => f.examen === invoice.examen && f.total === invoice.total).length > 1
      ? 1
      : 0;

  const genderMale = patient ? MALE_HINT.test(patient.nom) : MALE_HINT.test(invoice.patient);
  const isGenderIncoherent = genderMale && FEMALE_PELVIC.test(invoice.examen) ? 1 : 0;

  // Flag expired cover when mutuelle share is claimed but patient mutuelle looks stale in mock
  const mutuelleExpired = (invoice.partMutuelle ?? 0) > 0 && /expir/i.test(invoice.id) ? 1 : 0;

  // Stable-ish synthetic signals from id hash for demo continuity
  const idHash = [...invoice.id].reduce((a, c) => a + c.charCodeAt(0), 0);
  const daysSinceLastSameExam = sameExam.length > 1 ? (idHash % 12) + 1 : 40 + (idHash % 20);

  return {
    invoiceId: invoice.id,
    patientId: patient?.id ?? "UNK",
    patientName: invoice.patient,
    examType: invoice.examen,
    amount: invoice.total,
    mutuelleShare: invoice.partMutuelle ?? 0,
    daysSinceLastSameExam,
    examsLast30Days,
    isGenderIncoherent,
    isDuplicate,
    mutuelleExpired,
    baremeRatio: invoice.total / Math.max(1, bareme),
    hourOfDay: 8 + (idHash % 10),
    weekday: idHash % 7,
  };
}

export function featureArray(v: FraudFeatureVector): number[] {
  return [
    v.amount / 10000,
    v.mutuelleShare / 10000,
    v.daysSinceLastSameExam / 60,
    v.examsLast30Days / 10,
    v.isGenderIncoherent,
    v.isDuplicate,
    v.mutuelleExpired,
    Math.min(v.baremeRatio, 4) / 4,
    v.hourOfDay / 24,
    v.weekday / 7,
  ];
}

export const FEATURE_NAMES = [
  "amount_norm",
  "mutuelle_norm",
  "days_since_same_exam",
  "exams_30d",
  "gender_incoherent",
  "duplicate",
  "mutuelle_expired",
  "bareme_ratio",
  "hour",
  "weekday",
] as const;
