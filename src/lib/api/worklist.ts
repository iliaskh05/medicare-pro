/**
 * Couche d'accès à la worklist (file d'attente du jour) du RIS.
 * Backend Java : GET/POST {JAVA_API_BASE}/api/worklist
 */
import { api } from "./client";

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

type WorklistApiRow = Partial<WorklistItem> & {
  id?: string | number;
  montant?: number | string | null;
  historique?: { date?: string; auteur?: string; action?: string }[] | null;
};

function asEtat(value: unknown): EtatPatient {
  const allowed: EtatPatient[] = ["attendu", "arrive", "retard", "attente_longue"];
  return allowed.includes(value as EtatPatient) ? (value as EtatPatient) : "attendu";
}

function asStatutCr(value: unknown): StatutCompteRendu {
  const allowed: StatutCompteRendu[] = ["a_faire", "en_redaction", "signe", "imprime"];
  return allowed.includes(value as StatutCompteRendu) ? (value as StatutCompteRendu) : "a_faire";
}

function asPaiement(value: unknown): StatutPaiement {
  const allowed: StatutPaiement[] = ["impaye", "cote", "paye"];
  return allowed.includes(value as StatutPaiement) ? (value as StatutPaiement) : "impaye";
}

function formatDateExamen(value: unknown): string {
  if (value == null) return "";
  const raw = String(value);
  // Affichage compact : 2026-08-15 09:30
  if (raw.includes("T")) return raw.replace("T", " ").slice(0, 16);
  return raw;
}

/** Normalise un enregistrement API → ligne de tableau UI. */
export function mapWorklistItem(row: WorklistApiRow): WorklistItem {
  return {
    id: String(row.id ?? ""),
    numSejour: row.numSejour ?? "",
    patient: row.patient ?? "",
    cin: row.cin ?? undefined,
    telephone: row.telephone ?? undefined,
    age: typeof row.age === "number" ? row.age : undefined,
    sexe: row.sexe ?? undefined,
    medecin: row.medecin ?? "",
    prescripteur: row.prescripteur ?? undefined,
    dateExamen: formatDateExamen(row.dateExamen),
    salle: row.salle ?? "",
    description: row.description ?? "",
    modalite: row.modalite ?? "",
    etatPatient: asEtat(row.etatPatient),
    statutCr: asStatutCr(row.statutCr),
    paiement: asPaiement(row.paiement),
    montant:
      row.montant == null || row.montant === ""
        ? undefined
        : typeof row.montant === "number"
          ? row.montant
          : Number(row.montant),
    compteRendu: row.compteRendu ?? undefined,
    historique: (row.historique ?? []).map((h) => ({
      date: formatDateExamen(h.date),
      auteur: h.auteur ?? "",
      action: h.action ?? "",
    })),
  };
}

/** GET {JAVA_API_BASE}/api/worklist?date=&search=&status= */
export async function fetchWorklist(
  params: { date: string; search?: string; status?: string },
  signal?: AbortSignal,
): Promise<WorklistItem[]> {
  const qs = new URLSearchParams();
  qs.set("date", params.date);
  if (params.search?.trim()) qs.set("search", params.search.trim());
  if (params.status && params.status !== "tous") qs.set("status", params.status);

  const rows = await api.get<WorklistApiRow[]>(
    `/api/worklist?${qs.toString()}`,
    signal ? { signal } : {},
  );
  return (rows ?? []).map(mapWorklistItem);
}

/** POST {JAVA_API_BASE}/api/worklist */
export async function createExamen(payload: NouvelExamenPayload): Promise<WorklistItem> {
  const dateHeure = payload.dateHeure.length === 16 ? payload.dateHeure : payload.dateHeure;
  const created = await api.post<WorklistApiRow>("/api/worklist", {
    ...payload,
    dateHeure,
    prescripteurId: payload.prescripteurId || null,
  });
  return mapWorklistItem(created);
}

/** PATCH {JAVA_API_BASE}/api/worklist/{id}/status */
export async function updateExamenStatus(
  id: string,
  nouveauStatut: EtatPatient,
): Promise<WorklistItem> {
  const updated = await api.patch<WorklistApiRow>(
    `/api/worklist/${encodeURIComponent(id)}/status`,
    { nouveauStatut },
  );
  return mapWorklistItem(updated);
}

/** PATCH {JAVA_API_BASE}/api/worklist/{id} — champs partiels (CR / paiement) */
export async function updateWorklistStatut(
  id: string,
  patch: Partial<Pick<WorklistItem, "etatPatient" | "statutCr" | "paiement">>,
): Promise<void> {
  if (patch.etatPatient) {
    await updateExamenStatus(id, patch.etatPatient);
    return;
  }
  await api.patch<void>(`/api/worklist/${encodeURIComponent(id)}`, patch);
}

/** PUT {JAVA_API_BASE}/api/worklist/{id}/compte-rendu */
export async function saveCompteRendu(id: string, texte: string): Promise<void> {
  await api.put<void>(`/api/worklist/${encodeURIComponent(id)}/compte-rendu`, { texte });
}
