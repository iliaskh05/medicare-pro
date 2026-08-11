/**
 * Contrats de données du microservice Python de détection de fraude caisse.
 * Ces types reflètent exactement le JSON renvoyé par le modèle de clustering
 * (aucune transformation côté frontend hormis l'affichage).
 */

/** Variable critique surveillée par le modèle. */
export type FraudSignalKey = "time_to_pay" | "discount_rate" | "post_exam_cancellation";

export type FraudSignal = {
  key: FraudSignalKey;
  /** Valeur observée (minutes, pourcentage, ou 0/1 booléen selon la variable). */
  value: number;
  /** Seuil au-delà duquel le modèle lève une alerte. */
  threshold: number;
  /** Contribution de la variable au score global (0 → 1). */
  contribution: number;
  /** Vrai si la variable dépasse son seuil. */
  breached: boolean;
  /** Commentaire textuel renvoyé par le moteur Python. */
  comment?: string;
};

export type FraudCaseRecord = {
  case_id: string;
  invoice_ref: string;
  patient_name: string;
  cashier: string;
  exam_label: string;
  recorded_at: string;
  amount_mad: number;
  reference_amount_mad: number;
  /** Score de risque normalisé (0 → 100). */
  risk_score: number;
  /** Identifiant du cluster attribué par K-Means. */
  cluster_id: number;
  cluster_label: string;
  /** Distance au centroïde : plus elle est grande, plus le dossier est atypique. */
  distance_to_centroid: number;
  signals: FraudSignal[];
  status: "pending" | "confirmed" | "dismissed";
};

export type FraudClusteringResponse = {
  model_version: string;
  generated_at: string;
  analyzed_count: number;
  alert_count: number;
  /** Seuil de sensibilité appliqué côté modèle. */
  sensitivity: number;
  thresholds: Record<FraudSignalKey, number>;
  cases: FraudCaseRecord[];
};

export const fraudSignalMeta: Record<
  FraudSignalKey,
  { label: string; description: string; unit: string; format: (v: number) => string }
> = {
  time_to_pay: {
    label: "Délai de règlement",
    description: "Temps entre l'impression des clichés et le règlement du solde patient.",
    unit: "min",
    format: (v) => `${Math.round(v)} min`,
  },
  discount_rate: {
    label: "Taux de remise",
    description: "Remise appliquée par l'accueil sans validation de la direction.",
    unit: "%",
    format: (v) => `${v.toFixed(1)} %`,
  },
  post_exam_cancellation: {
    label: "Annulation post-acte",
    description: "Facture annulée après réalisation effective de l'examen.",
    unit: "",
    format: (v) => (v >= 1 ? "Oui" : "Non"),
  },
};
