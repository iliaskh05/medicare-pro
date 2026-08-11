import { anomalies } from "@/data/mock-audit";
import type {
  FraudCaseRecord,
  FraudClusteringResponse,
  FraudSignal,
  FraudSignalKey,
} from "@/types/fraud";

import { isMlApiConfigured, mlApi } from "./config";

/** Seuils métier validés par la direction du Centre d'Imagerie Médicale. */
export const FRAUD_THRESHOLDS: Record<FraudSignalKey, number> = {
  /** Délai maximal toléré entre impression des clichés et règlement (minutes). */
  time_to_pay: 45,
  /** Remise maximale autorisée à l'accueil sans validation direction (%). */
  discount_rate: 10,
  /** Toute annulation post-acte est une alerte. */
  post_exam_cancellation: 1,
};

/**
 * Scoring de la fraude caisse par clustering (K-Means + règles métier).
 * TODO microservice Python : POST /fraud/clustering
 */
export async function fetchFraudClustering(
  params: { sensitivity: number } = { sensitivity: 70 },
): Promise<FraudClusteringResponse> {
  if (isMlApiConfigured()) {
    return mlApi<FraudClusteringResponse>("/fraud/clustering", {
      method: "POST",
      body: { sensitivity: params.sensitivity, thresholds: FRAUD_THRESHOLDS },
    });
  }
  return buildLocalClustering(params.sensitivity);
}

/**
 * Décision humaine sur un dossier (réentraînement supervisé).
 * TODO microservice Python : POST /fraud/feedback
 */
export async function submitFraudDecision(payload: {
  caseId: string;
  decision: "confirmed" | "dismissed";
  reviewer: string;
}): Promise<void> {
  if (isMlApiConfigured()) {
    await mlApi<void>("/fraud/feedback", { method: "POST", body: payload });
  }
}

/* ------------------------------------------------------------------ */
/* Jeu de données local — remplacé par la réponse Python en production */
/* ------------------------------------------------------------------ */

function signal(
  key: FraudSignalKey,
  value: number,
  contribution: number,
  comment: string,
): FraudSignal {
  const threshold = FRAUD_THRESHOLDS[key];
  return { key, value, threshold, contribution, breached: value >= threshold, comment };
}

function buildLocalClustering(sensitivity: number): FraudClusteringResponse {
  const cases: FraudCaseRecord[] = anomalies.map((a, index) => {
    const ecart = Math.max(0, a.montant - a.bareme);
    const remise = a.montant > 0 ? Math.round((ecart / a.montant) * 1000) / 10 : 0;
    const delai = 20 + ((a.score * 3 + index * 7) % 220);
    const annulation = a.motifs.includes("Doublon de saisie") || a.score >= 90 ? 1 : 0;

    return {
      case_id: a.id,
      invoice_ref: a.id,
      patient_name: a.patient,
      cashier: index % 3 === 0 ? "Accueil — Souad B." : "Accueil — Imane R.",
      exam_label: a.acte,
      recorded_at: a.date,
      amount_mad: a.montant,
      reference_amount_mad: a.bareme,
      risk_score: a.score,
      cluster_id: index % 3,
      cluster_label: a.cluster,
      distance_to_centroid: Math.round((a.score / 100) * 250) / 100,
      signals: [
        signal("time_to_pay", delai, 0.42, "Délai impression clichés → règlement du solde."),
        signal("discount_rate", remise, 0.35, "Remise saisie à l'accueil sur le tarif barème."),
        signal(
          "post_exam_cancellation",
          annulation,
          0.23,
          annulation ? "Facture annulée après réalisation de l'acte." : "Aucune annulation détectée.",
        ),
      ],
      status: a.statut,
    };
  });

  const retenus = cases.filter((c) => c.risk_score >= sensitivity);

  return {
    model_version: "kmeans-caisse-1.4.0",
    generated_at: new Date().toISOString(),
    analyzed_count: cases.length,
    alert_count: retenus.length,
    sensitivity,
    thresholds: FRAUD_THRESHOLDS,
    cases,
  };
}
