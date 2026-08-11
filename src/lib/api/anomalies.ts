import { javaApi } from "./config";

/**
 * Modèle renvoyé par le module d'analyse de conformité (clustering).
 * Endpoint de production : GET {JAVA_API_BASE}/api/audit/fraude/anomalies
 */
export type AnomalieCaisseDto = {
  /** Délai entre l'impression des clichés et le règlement du solde (minutes). */
  delaiReglementMinutes: number;
  /** Pourcentage de remise appliqué à l'accueil. */
  tauxRemise: number;
  /** Statut d'annulation / modification de facture après réalisation de l'acte. */
  annulationPostActe: string;
  /** Seuils appliqués par le moteur (facultatifs). */
  seuilDelaiMinutes?: number;
  seuilRemise?: number;
  guichet?: string;
  scoreRisque?: number;
  message?: string;
  generatedAt?: string;
};

/** Récupère l'analyse d'anomalies financières du moteur de clustering. */
export async function fetchAnomaliesCaisse(signal?: AbortSignal): Promise<AnomalieCaisseDto> {
  return javaApi<AnomalieCaisseDto>("/api/audit/fraude/anomalies", signal ? { signal } : {});
}
