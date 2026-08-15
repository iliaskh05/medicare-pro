import type { Referent } from "@/types/referent";

import { javaApi } from "./config";

/** Modèle exact renvoyé par le backend Spring Boot : GET /api/medecins */
export type MedecinDto = {
  id: number | string;
  nom?: string | null;
  telephone?: string | null;
  email?: string | null;
  specialite?: string | null;
  adresse?: string | null;
  ville?: string | null;
  quartier?: string | null;
};

export function mapMedecinDto(m: MedecinDto): Referent {
  return {
    id: String(m.id),
    nom: m.nom ?? "",
    telephone: m.telephone ?? "",
    email: m.email ?? "",
    specialite: m.specialite ?? "",
    adresse: m.adresse ?? "",
    ville: m.ville ?? "",
    quartier: m.quartier ?? "",
  };
}

/** GET {JAVA_API_BASE}/api/medecins */
export async function fetchMedecins(signal?: AbortSignal): Promise<Referent[]> {
  const rows = await javaApi<MedecinDto[]>("/api/medecins", signal ? { signal } : {});
  return (rows ?? []).map(mapMedecinDto);
}

/** POST {JAVA_API_BASE}/api/medecins/{id}/comptes-rendus */
export async function sendReportToReferent(referentId: string, reportId?: string): Promise<void> {
  await javaApi<void>(`/api/medecins/${encodeURIComponent(referentId)}/comptes-rendus`, {
    method: "POST",
    body: { reportId: reportId ?? null },
  });
}

/** POST {JAVA_API_BASE}/api/medecins */
export async function saveReferent(payload: Omit<Referent, "id"> & { id?: string }) {
  return javaApi<Referent>("/api/medecins", { method: "POST", body: payload });
}
