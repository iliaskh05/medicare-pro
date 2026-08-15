/**
 * Couche d'accès à la worklist (file d'attente du jour) du RIS.
 * Backend Java : GET/POST {JAVA_API_BASE}/api/worklist
 */
import { javaApi } from "./config";

export type EtatPatient = "attendu" | "arrive" | "retard" | "attente_longue";
export type StatutCompteRendu = "a_faire" | "en_redaction" | "signe" | "imprime";
export type StatutPaiement = "impaye" | "cote" | "paye";
export type Modalite = "Scanner" | "IRM" | "Mammographie" | "Radiologie" | "Échographie";

export type WorklistItem = {
  id: string;
  numSejour: string;
  patient: string;
  cin?: string | undefined;
  telephone?: string | undefined;
  age?: number | undefined;
  sexe?: string | undefined;
  medecin: string;
  prescripteur?: string | undefined;
  dateExamen: string;
  salle: string;
  description: string;
  modalite: Modalite | string;
  etatPatient: EtatPatient;
  statutCr: StatutCompteRendu;
  paiement: StatutPaiement;
  montant?: number | undefined;
  compteRendu?: string | undefined;
  historique?: { date: string; auteur: string; action: string }[] | undefined;
};

export type NouvelExamenPayload = {
  nom: string;
  prenom: string;
  cin: string;
  naissance: string;
  sexe: string;
  telephone: string;
  typeExamen: string;
  modalite: string;
  salle: string;
  dateHeure: string;
  prescripteurId: string | null;
  prescripteurNom: string;
};

export const MODALITES: Modalite[] = [
  "Scanner",
  "IRM",
  "Mammographie",
  "Radiologie",
  "Échographie",
];

export const SALLES = ["Salle 1 — Scanner", "Salle 2 — IRM", "Salle 3 — Radio", "Salle 4 — Écho"];

/** GET {JAVA_API_BASE}/api/worklist?date=YYYY-MM-DD */
export async function fetchWorklist(date: string, signal?: AbortSignal): Promise<WorklistItem[]> {
  const rows = await javaApi<WorklistItem[]>(
    `/api/worklist?date=${encodeURIComponent(date)}`,
    signal ? { signal } : {},
  );
  return rows ?? [];
}

/** POST {JAVA_API_BASE}/api/worklist */
export async function createExamen(payload: NouvelExamenPayload): Promise<WorklistItem> {
  return javaApi<WorklistItem>("/api/worklist", { method: "POST", body: payload });
}

/** PATCH {JAVA_API_BASE}/api/worklist/{id} */
export async function updateWorklistStatut(
  id: string,
  patch: Partial<Pick<WorklistItem, "etatPatient" | "statutCr" | "paiement">>,
): Promise<void> {
  await javaApi<void>(`/api/worklist/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: patch,
  });
}

/** PUT {JAVA_API_BASE}/api/worklist/{id}/compte-rendu */
export async function saveCompteRendu(id: string, texte: string): Promise<void> {
  await javaApi<void>(`/api/worklist/${encodeURIComponent(id)}/compte-rendu`, {
    method: "PUT",
    body: { texte },
  });
}
