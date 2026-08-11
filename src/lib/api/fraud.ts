import type { FraudClusteringResponse, FraudSignalKey } from "@/types/fraud";

import { mlApi } from "./config";

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
 * Scoring de la fraude caisse par clustering (microservice Python).
 * POST {ML_API_BASE}/fraud/clustering
 */
export async function fetchFraudClustering(
  params: { sensitivity: number } = { sensitivity: 70 },
): Promise<FraudClusteringResponse> {
  return mlApi<FraudClusteringResponse>("/fraud/clustering", {
    method: "POST",
    body: { sensitivity: params.sensitivity, thresholds: FRAUD_THRESHOLDS },
  });
}

/**
 * Décision humaine sur un dossier (réentraînement supervisé).
 * POST {ML_API_BASE}/fraud/feedback
 */
export async function submitFraudDecision(payload: {
  caseId: string;
  decision: "confirmed" | "dismissed";
  reviewer: string;
}): Promise<void> {
  await mlApi<void>("/fraud/feedback", { method: "POST", body: payload });
}
