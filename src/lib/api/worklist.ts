/**
 * Couche d'accès à la worklist (file d'attente du jour) du RIS.
 * Backend Java : GET/POST {JAVA_API_BASE}/api/worklist
 */
import { api } from "./client";
import { javaApiBlob } from "./config";

export type EtatPatient = "attendu" | "arrive" | "retard" | "attente_longue";
export type StatutCompteRendu = "a_faire" | "en_redaction" | "signe" | "imprime";
export type StatutPaiement = "impaye" | "cote" | "paye";
export type Modalite = "Scanner" | "IRM" | "Mammographie" | "Radiologie" | "Échographie";
export type DossierStatut = "a_preparer" | "pret" | "remis" | "non_remis" | "envoye";

export type WorklistItem = {
  id: string;
  numSejour: string;
  patientId?: string | undefined;
  patient: string;
  cin?: string | undefined;
  telephone?: string | undefined;
  age?: number | undefined;
  sexe?: string | undefined;
  medecin: string;
  radiologueId?: string | undefined;
  resourceId?: string | undefined;
  prescripteur?: string | undefined;
  dateExamen: string;
  dateExamenRaw?: string | undefined;
  salle: string;
  description: string;
  modalite: Modalite | string;
  etatPatient: EtatPatient;
  statutCr: StatutCompteRendu;
  paiement: StatutPaiement;
  montant?: number | undefined;
  acompte?: number | undefined;
  reste?: number | undefined;
  catalogueId?: number | undefined;
  dossierStatut?: DossierStatut | undefined;
  dossierRemisAt?: string | undefined;
  dossierRemisPar?: string | undefined;
  priorite?: string | undefined;
  indication?: string | undefined;
  technique?: string | undefined;
  resultats?: string | undefined;
  conclusion?: string | undefined;
  passageSansRdv?: boolean | undefined;
  compteRendu?: string | undefined;
  arrivedAt?: string | undefined;
  startedAt?: string | undefined;
  completedAt?: string | undefined;
  workflowStatus?: string | undefined;
  weightKg?: number | undefined;
  heightCm?: number | undefined;
  generalAnesthesia?: boolean | undefined;
  inpatient?: boolean | undefined;
  urgent?: boolean | undefined;
  technologistName?: string | undefined;
  nurseName?: string | undefined;
  assistantName?: string | undefined;
  parentExamenId?: string | undefined;
  historique?: { date: string; auteur: string; action: string }[] | undefined;
};

export type PaiementItem = {
  id: number;
  montant: number;
  mode: string;
  createdAt?: string | null;
  createdBy?: string | null;
};

export type NouvelExamenPayload = {
  nom?: string;
  prenom?: string;
  cin?: string;
  naissance?: string;
  sexe?: string;
  telephone?: string;
  typeExamen?: string;
  modalite?: string;
  salle?: string;
  resourceId?: number | string | null;
  dateHeure: string;
  prescripteurId: string | null;
  prescripteurNom: string;
  patientId?: string | number | null;
  catalogueId?: number | null;
  passageSansRdv?: boolean;
  acompte?: number;
  priorite?: string;
};

export const MODALITES: Modalite[] = [
  "Scanner",
  "IRM",
  "Mammographie",
  "Radiologie",
  "Échographie",
];

export { fetchResources } from "./appointments";

type WorklistApiRow = Partial<WorklistItem> & {
  id?: string | number;
  radiologueId?: string | number | null;
  resourceId?: string | number | null;
  montant?: number | string | null;
  acompte?: number | string | null;
  reste?: number | string | null;
  catalogueId?: number | string | null;
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

function asDossier(value: unknown): DossierStatut | undefined {
  const allowed: DossierStatut[] = ["a_preparer", "pret", "remis", "non_remis", "envoye"];
  return allowed.includes(value as DossierStatut) ? (value as DossierStatut) : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (value == null || String(value).trim() === "") return undefined;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function formatDateExamen(value: unknown): string {
  if (value == null) return "";
  const raw = String(value);
  if (raw.includes("T")) return raw.replace("T", " ").slice(0, 16);
  return raw;
}

export function mapWorklistItem(row: WorklistApiRow): WorklistItem {
  return {
    id: String(row.id ?? ""),
    numSejour: row.numSejour ?? "",
    patientId: row.patientId ? String(row.patientId) : undefined,
    patient: row.patient ?? "",
    cin: row.cin ?? undefined,
    telephone: row.telephone ?? undefined,
    age: typeof row.age === "number" ? row.age : undefined,
    sexe: row.sexe ?? undefined,
    medecin: row.medecin ?? "",
    radiologueId: row.radiologueId != null ? String(row.radiologueId) : undefined,
    resourceId: row.resourceId != null ? String(row.resourceId) : undefined,
    prescripteur: row.prescripteur ?? undefined,
    dateExamen: formatDateExamen(row.dateExamen),
    dateExamenRaw: row.dateExamen ? String(row.dateExamen) : undefined,
    salle: row.salle ?? "",
    description: row.description ?? "",
    modalite: row.modalite ?? "",
    etatPatient: asEtat(row.etatPatient),
    statutCr: asStatutCr(row.statutCr),
    paiement: asPaiement(row.paiement),
    montant: asNumber(row.montant),
    acompte: asNumber(row.acompte) ?? 0,
    reste: asNumber(row.reste),
    catalogueId: asNumber(row.catalogueId),
    dossierStatut: asDossier(row.dossierStatut),
    dossierRemisAt: row.dossierRemisAt ? formatDateExamen(row.dossierRemisAt) : undefined,
    dossierRemisPar: row.dossierRemisPar ?? undefined,
    priorite: row.priorite ?? undefined,
    indication: row.indication ?? undefined,
    technique: row.technique ?? undefined,
    resultats: row.resultats ?? undefined,
    conclusion: row.conclusion ?? undefined,
    passageSansRdv: Boolean(row.passageSansRdv),
    compteRendu: row.compteRendu ?? undefined,
    arrivedAt: row.arrivedAt ? String(row.arrivedAt) : undefined,
    startedAt: row.startedAt ? String(row.startedAt) : undefined,
    completedAt: row.completedAt ? String(row.completedAt) : undefined,
    workflowStatus: row.workflowStatus ?? undefined,
    weightKg: asNumber(row.weightKg),
    heightCm: asNumber(row.heightCm),
    generalAnesthesia: row.generalAnesthesia ?? undefined,
    inpatient: row.inpatient ?? undefined,
    urgent: row.urgent ?? undefined,
    technologistName: row.technologistName ?? undefined,
    nurseName: row.nurseName ?? undefined,
    assistantName: row.assistantName ?? undefined,
    parentExamenId: row.parentExamenId ? String(row.parentExamenId) : undefined,
    historique: (row.historique ?? []).map((h) => ({
      date: formatDateExamen(h.date),
      auteur: h.auteur ?? "",
      action: h.action ?? "",
    })),
  };
}

/** GET {JAVA_API_BASE}/api/worklist?date=&search=&status= */
export async function fetchWorklist(
  params: {
    date?: string;
    from?: string;
    to?: string;
    search?: string | undefined;
    status?: string | undefined;
    patientId?: string | undefined;
    modalite?: string | undefined;
    priorite?: string | undefined;
    radiologueId?: string | number | undefined;
    page?: number | undefined;
    size?: number | undefined;
  },
  signal?: AbortSignal,
): Promise<WorklistItem[]> {
  const qs = new URLSearchParams();
  if (params.date) qs.set("date", params.date);
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  if (params.search?.trim()) qs.set("search", params.search.trim());
  if (params.status && params.status !== "tous") qs.set("status", params.status);
  if (params.patientId) qs.set("patientId", params.patientId);
  if (params.modalite && params.modalite !== "tous") qs.set("modalite", params.modalite);
  if (params.priorite && params.priorite !== "tous") qs.set("priorite", params.priorite);
  if (params.radiologueId != null && String(params.radiologueId).trim() !== "") {
    qs.set("radiologueId", String(params.radiologueId));
  }
  if (params.page != null) qs.set("page", String(params.page));
  if (params.size != null) qs.set("size", String(params.size));

  const rows = await api.get<WorklistApiRow[]>(
    `/api/worklist?${qs.toString()}`,
    signal ? { signal } : {},
  );
  return (rows ?? []).map(mapWorklistItem);
}

export type StatusHistoryItem = {
  fromStatus?: string | null;
  toStatus: string;
  actor?: string | null;
  note?: string | null;
  at?: string | null;
};

export async function fetchWorklistStatusHistory(
  id: string,
  signal?: AbortSignal,
): Promise<StatusHistoryItem[]> {
  const rows = await api.get<StatusHistoryItem[]>(
    `/api/worklist/${encodeURIComponent(id)}/status-history`,
    signal ? { signal } : {},
  );
  return rows ?? [];
}

export async function fetchWorklistItem(id: string, signal?: AbortSignal): Promise<WorklistItem> {
  const row = await api.get<WorklistApiRow>(
    `/api/worklist/${encodeURIComponent(id)}`,
    signal ? { signal } : {},
  );
  return mapWorklistItem(row);
}

export async function fetchDossiers(
  statut?: string,
  signal?: AbortSignal,
): Promise<WorklistItem[]> {
  const qs = statut ? `?statut=${encodeURIComponent(statut)}` : "";
  const rows = await api.get<WorklistApiRow[]>(`/api/worklist/dossiers${qs}`, signal ? { signal } : {});
  return (rows ?? []).map(mapWorklistItem);
}

export async function fetchImpayes(signal?: AbortSignal): Promise<WorklistItem[]> {
  const rows = await api.get<WorklistApiRow[]>(`/api/worklist/impayes`, signal ? { signal } : {});
  return (rows ?? []).map(mapWorklistItem);
}

/** POST {JAVA_API_BASE}/api/worklist */
export async function createExamen(payload: NouvelExamenPayload): Promise<WorklistItem> {
  const created = await api.post<WorklistApiRow>("/api/worklist", {
    ...payload,
    patientId: payload.patientId ? Number(payload.patientId) : null,
    catalogueId: payload.catalogueId ?? null,
    prescripteurId: payload.prescripteurId || null,
    resourceId:
      payload.resourceId != null && String(payload.resourceId).trim() !== ""
        ? Number(payload.resourceId)
        : null,
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

/** PATCH {JAVA_API_BASE}/api/worklist/{id} — champs partiels */
export async function updateWorklistStatut(
  id: string,
  patch: Partial<
    Pick<
      WorklistItem,
      | "etatPatient"
      | "statutCr"
      | "paiement"
      | "dossierStatut"
      | "acompte"
      | "montant"
      | "priorite"
      | "indication"
      | "technique"
      | "resultats"
      | "conclusion"
      | "weightKg"
      | "heightCm"
      | "generalAnesthesia"
      | "inpatient"
      | "urgent"
      | "technologistName"
      | "nurseName"
      | "assistantName"
    >
  >,
): Promise<WorklistItem> {
  if (patch.etatPatient && Object.keys(patch).length === 1) {
    return updateExamenStatus(id, patch.etatPatient);
  }
  const updated = await api.patch<WorklistApiRow>(`/api/worklist/${encodeURIComponent(id)}`, patch);
  return mapWorklistItem(updated);
}

/** PUT {JAVA_API_BASE}/api/worklist/{id}/compte-rendu */
export async function saveCompteRendu(
  id: string,
  body: { texte?: string; indication?: string; technique?: string; resultats?: string; conclusion?: string },
): Promise<WorklistItem> {
  const updated = await api.put<WorklistApiRow>(
    `/api/worklist/${encodeURIComponent(id)}/compte-rendu`,
    body,
  );
  return mapWorklistItem(updated);
}

export async function fetchPaiements(id: string, signal?: AbortSignal): Promise<PaiementItem[]> {
  const rows = await api.get<PaiementItem[]>(
    `/api/worklist/${encodeURIComponent(id)}/paiements`,
    signal ? { signal } : {},
  );
  return rows ?? [];
}

export async function recordPaiement(
  id: string,
  payload: { montant: number; mode: string },
): Promise<WorklistItem> {
  const updated = await api.post<WorklistApiRow>(
    `/api/worklist/${encodeURIComponent(id)}/paiements`,
    payload,
  );
  return mapWorklistItem(updated);
}

export async function downloadCompteRenduPdf(id: string): Promise<Blob> {
  return javaApiBlob(`/api/worklist/${encodeURIComponent(id)}/compte-rendu.pdf`);
}
