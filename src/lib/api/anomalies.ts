import { mlApi } from "./config";

/**
 * Objet renvoyé par le modèle de clustering Python.
 * Endpoint de production : GET {ML_API_BASE}/api/ia/anomalies
 */
export type AnomalieCaisseDto = {
  /** Délai entre l'impression des clichés et l'encaissement du solde (minutes). */
  delai_encaissement: number;
  /** Pourcentage de remise appliqué à l'accueil. */
  taux_remise: number;
  /** Statut d'annulation / modification de facture après réalisation de l'acte. */
  statut_annulation: string;
  /** Seuils appliqués par le moteur (facultatifs). */
  seuil_delai?: number;
  seuil_remise?: number;
  guichet?: string;
  score_risque?: number;
  message?: string;
  generated_at?: string;
};

/** Récupère l'analyse d'anomalies financières du modèle Python. */
export async function fetchAnomaliesCaisse(signal?: AbortSignal): Promise<AnomalieCaisseDto> {
  return mlApi<AnomalieCaisseDto>("/api/ia/anomalies", signal ? { signal } : {});
}
