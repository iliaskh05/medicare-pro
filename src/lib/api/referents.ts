import { referents, type Referent } from "@/data/mock-referents";

import { isJavaApiConfigured, javaApi } from "./config";

/**
 * Base des médecins correspondants (importée depuis le SI du centre).
 * TODO backend Java : GET /api/correspondants
 */
export async function fetchReferents(): Promise<Referent[]> {
  if (isJavaApiConfigured()) return javaApi<Referent[]>("/api/correspondants");
  return referents;
}

/**
 * Répertoire des médecins correspondants pour le DataTable.
 * Stub prêt pour l'API Java : GET {JAVA_API_BASE}/api/medecins
 * (retour attendu : Referent[] avec ville, quartier et adresse).
 */
export async function fetchMedecins(): Promise<Referent[]> {
  if (isJavaApiConfigured()) return javaApi<Referent[]>("/api/medecins");
  return referents;
}

/**
 * Envoi du compte rendu au correspondant (mail sécurisé / dépôt PACS).
 * TODO backend Java : POST /api/correspondants/{id}/comptes-rendus
 */
export async function sendReportToReferent(referentId: string, reportId?: string): Promise<void> {
  if (isJavaApiConfigured()) {
    await javaApi<void>(`/api/correspondants/${encodeURIComponent(referentId)}/comptes-rendus`, {
      method: "POST",
      body: { reportId: reportId ?? null },
    });
  }
}

/**
 * Création / mise à jour d'un correspondant.
 * TODO backend Java : POST /api/correspondants
 */
export async function saveReferent(payload: Omit<Referent, "id"> & { id?: string }) {
  if (isJavaApiConfigured()) {
    return javaApi<Referent>("/api/correspondants", { method: "POST", body: payload });
  }
  return { ...payload, id: payload.id ?? `REF-${Date.now().toString().slice(-3)}` } as Referent;
}
