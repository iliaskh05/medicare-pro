/** Types du module Audit & Conformité (anomalies de facturation). */

export type TypeExamen = "IRM" | "Scanner" | "Échographie" | "Mammographie" | "Radiologie";

export type MotifSuspect =
  | "Montant atypique"
  | "Fréquence rapprochée"
  | "Fréquence anormale"
  | "Horaire atypique"
  | "Doublon de saisie"
  | "Acte non prescrit"
  | "Incohérence dossier"
  | "Mutuelle expirée"
  | "Signal faible"
  | "Comportement nominal";

export type StatutAnomalie = "pending" | "confirmed" | "dismissed";

export type Anomalie = {
  id: string;
  patient: string;
  cin: string;
  acte: string;
  typeExamen: TypeExamen;
  date: string; // ISO
  montant: number;
  bareme: number;
  score: number; // 0 → 100
  motifs: MotifSuspect[];
  cluster: string;
  prescripteur: string;
  mutuelle: string;
  statut: StatutAnomalie;
};

export type TendanceAnomalie = { semaine: string; anomalies: number; confirmees: number };

export type AuditKpis = {
  dossiersAnalyses: number;
  dossiersAnalysesDelta: number;
  tauxConformite: number;
  tauxConformiteDelta: number;
  montantEnJeu: number;
};

/** Référentiel des familles d'examens (filtre). */
export const typesExamen: TypeExamen[] = [
  "IRM",
  "Scanner",
  "Échographie",
  "Mammographie",
  "Radiologie",
];
