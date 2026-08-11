import { type Referent } from "@/data/mock-referents";

import { javaApi } from "./config";

/** Modèle exact renvoyé par le backend Spring Boot : GET /api/medecins */
export type MedecinDto = {
  id: number | string;
  nom: string;
  telephone: string;
  email: string;
  specialite: string;
  adresse: string;
  ville: string;
  quartier: string;
};

/**
 * Répertoire des médecins correspondants — appel API de production.
 * GET {JAVA_API_BASE}/api/medecins
 */
export async function fetchMedecins(signal?: AbortSignal): Promise<Referent[]> {
  const rows = await javaApi<MedecinDto[]>("/api/medecins", signal ? { signal } : {});
  return (rows ?? []).map((m) => ({
    id: String(m.id),
    nom: m.nom,
    telephone: m.telephone,
    email: m.email,
    specialite: m.specialite,
    adresse: m.adresse,
    ville: m.ville,
    quartier: m.quartier,
  })) as Referent[];
}

/**
 * Envoi du compte rendu au correspondant (mail sécurisé / dépôt PACS).
 * TODO backend Java : POST /api/correspondants/{id}/comptes-rendus
 */
export async function sendReportToReferent(referentId: string, reportId?: string): Promise<void> {
  await javaApi<void>(`/api/medecins/${encodeURIComponent(referentId)}/comptes-rendus`, {
    method: "POST",
    body: { reportId: reportId ?? null },
  });
}

/**
 * Création / mise à jour d'un correspondant.
 * TODO backend Java : POST /api/correspondants
 */
export async function saveReferent(payload: Omit<Referent, "id"> & { id?: string }) {
  return javaApi<Referent>("/api/medecins", { method: "POST", body: payload });
}
