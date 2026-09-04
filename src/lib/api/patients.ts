import { javaApi } from "./config";
import type { AppointmentDto } from "./appointments";

export type PatientDto = {
  id: number | string;
  nomComplet: string;
  cin: string;
  age: number;
  telephone: string;
  mutuelle: string;
  email?: string | undefined;
  sexe?: string | undefined;
  numAffiliation?: string | undefined;
  medecinTraitant?: string | undefined;
  ville?: string | undefined;
  quartier?: string | undefined;
  adresse?: string | undefined;
  dateNaissance?: string | undefined;
  numeroDossier?: string | undefined;
  prochainRdv?: string | undefined;
  titre?: string | undefined;
  telephoneDomicile?: string | undefined;
  telephoneTravail?: string | undefined;
  fax?: string | undefined;
  pays?: string | undefined;
  conventionType?: string | undefined;
  vip?: boolean | undefined;
  pacemaker?: boolean | undefined;
  pregnant?: boolean | undefined;
  contrastAllergy?: boolean | undefined;
  medicalAlerts?: string | undefined;
};

export type PatientRow = {
  id: string;
  nomComplet: string;
  cin: string;
  age: number;
  telephone: string;
  mutuelle: string;
  email?: string | undefined;
  sexe?: string | undefined;
  numAffiliation?: string | undefined;
  medecinTraitant?: string | undefined;
  ville?: string | undefined;
  quartier?: string | undefined;
  adresse?: string | undefined;
  dateNaissance?: string | undefined;
  numeroDossier?: string | undefined;
  prochainRdv?: string | undefined;
  titre?: string | undefined;
  telephoneDomicile?: string | undefined;
  telephoneTravail?: string | undefined;
  fax?: string | undefined;
  pays?: string | undefined;
  conventionType?: string | undefined;
  vip?: boolean | undefined;
  pacemaker?: boolean | undefined;
  pregnant?: boolean | undefined;
  contrastAllergy?: boolean | undefined;
  medicalAlerts?: string | undefined;
};

export type HistoryItem = {
  date: string;
  type: string;
  intitule: string;
  praticien: string;
  note: string;
  tone: "primary" | "warning" | "success" | "destructive" | "neutral";
};

export type PatientPrescription = {
  id: string;
  date: string;
  prescripteur: string;
  lignes: string[];
};

export type PatientBilling = {
  id: string;
  acte: string;
  date: string;
  total: number;
  mutuelle: number;
  acompte?: number;
  reste?: number;
  statut: string;
  tone: "success" | "warning" | "destructive" | "primary" | "neutral";
};

export type PatientDuplicateMatch = {
  patientId: string;
  score: number;
  champsIdentiques: string[];
  nomComplet: string;
  numeroDossier?: string;
};

export type PatientWritePayload = {
  nomComplet?: string;
  nom?: string;
  prenom?: string;
  cin: string;
  telephone?: string;
  email?: string;
  mutuelle?: string;
  sexe?: string;
  numAffiliation?: string;
  medecinTraitant?: string;
  ville?: string;
  quartier?: string;
  adresse?: string;
  dateNaissance?: string;
  age?: number;
  titre?: string;
  telephoneDomicile?: string;
  telephoneTravail?: string;
  fax?: string;
  pays?: string;
  conventionType?: string;
  vip?: boolean;
  pacemaker?: boolean;
  pregnant?: boolean;
  contrastAllergy?: boolean;
  medicalAlerts?: string;
  force?: boolean;
};

export type PatientsPage = {
  content: PatientRow[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type FinancialStatus = {
  examen: string;
  total: number;
  acompte: number;
  statutImpression: string;
  reste: number;
};

function mapPatient(dto: PatientDto): PatientRow {
  return {
    id: String(dto.id),
    nomComplet: dto.nomComplet,
    cin: dto.cin,
    age: Number(dto.age ?? 0),
    telephone: dto.telephone,
    mutuelle: dto.mutuelle,
    email: dto.email,
    sexe: dto.sexe,
    numAffiliation: dto.numAffiliation,
    medecinTraitant: dto.medecinTraitant,
    ville: dto.ville,
    quartier: dto.quartier,
    adresse: dto.adresse,
    dateNaissance: dto.dateNaissance,
    numeroDossier: dto.numeroDossier,
    prochainRdv: dto.prochainRdv,
    titre: dto.titre,
    telephoneDomicile: dto.telephoneDomicile,
    telephoneTravail: dto.telephoneTravail,
    fax: dto.fax,
    pays: dto.pays,
    conventionType: dto.conventionType,
    vip: dto.vip,
    pacemaker: dto.pacemaker,
    pregnant: dto.pregnant,
    contrastAllergy: dto.contrastAllergy,
    medicalAlerts: dto.medicalAlerts,
  };
}

export async function fetchPatients(signal?: AbortSignal): Promise<PatientRow[]> {
  const rows = await javaApi<PatientDto[]>("/api/patients", signal ? { signal } : {});
  return (rows ?? []).map(mapPatient);
}

/** Recherche serveur paginée — déclenche le contrat PageResponse côté backend. */
export async function searchPatients(
  params: {
    search?: string;
    mutuelle?: string;
    page?: number;
    size?: number;
  },
  signal?: AbortSignal,
): Promise<PatientsPage> {
  const qs = new URLSearchParams();
  if (params.search?.trim()) qs.set("search", params.search.trim());
  if (params.mutuelle?.trim()) qs.set("mutuelle", params.mutuelle.trim());
  qs.set("page", String(params.page ?? 0));
  qs.set("size", String(params.size ?? 20));
  // Toujours envoyer page pour forcer le contrat paginé même sans filtre
  const data = await javaApi<
    | { content?: PatientDto[]; page?: number; size?: number; totalElements?: number; totalPages?: number }
    | PatientDto[]
  >(`/api/patients?${qs.toString()}`, signal ? { signal } : {});

  if (Array.isArray(data)) {
    const content = data.map(mapPatient);
    return {
      content,
      page: 0,
      size: content.length,
      totalElements: content.length,
      totalPages: 1,
    };
  }
  const content = (data.content ?? []).map(mapPatient);
  return {
    content,
    page: data.page ?? 0,
    size: data.size ?? content.length,
    totalElements: data.totalElements ?? content.length,
    totalPages: data.totalPages ?? 1,
  };
}

export async function checkPatientDuplicates(
  params: { nom?: string; cin?: string; telephone?: string; naissance?: string },
  signal?: AbortSignal,
): Promise<PatientDuplicateMatch[]> {
  const qs = new URLSearchParams();
  if (params.nom?.trim()) qs.set("nom", params.nom.trim());
  if (params.cin?.trim()) qs.set("cin", params.cin.trim());
  if (params.telephone?.trim()) qs.set("telephone", params.telephone.trim());
  if (params.naissance?.trim()) qs.set("naissance", params.naissance.trim());
  if ([...qs.keys()].length === 0) return [];
  const rows = await javaApi<
    Array<{
      patientId?: string | number;
      score?: number;
      champsIdentiques?: string[];
      nomComplet?: string;
      numeroDossier?: string;
    }>
  >(`/api/patients/duplicates?${qs.toString()}`, signal ? { signal } : {});
  return (rows ?? []).map((r) => {
    const match: PatientDuplicateMatch = {
      patientId: String(r.patientId ?? ""),
      score: Number(r.score ?? 0),
      champsIdentiques: r.champsIdentiques ?? [],
      nomComplet: r.nomComplet ?? "",
    };
    if (r.numeroDossier != null && r.numeroDossier !== "") {
      match.numeroDossier = r.numeroDossier;
    }
    return match;
  });
}

export async function fetchPatientData(
  patientId: string,
  signal?: AbortSignal,
): Promise<PatientRow> {
  const dto = await javaApi<PatientDto>(
    `/api/patients/${encodeURIComponent(patientId)}`,
    signal ? { signal } : {},
  );
  return mapPatient(dto);
}

export async function fetchPatientHistory(
  patientId: string,
  signal?: AbortSignal,
): Promise<HistoryItem[]> {
  const rows = await javaApi<HistoryItem[]>(
    `/api/patients/${encodeURIComponent(patientId)}/historique`,
    signal ? { signal } : {},
  );
  return rows ?? [];
}

export async function fetchPatientPrescriptions(
  patientId: string,
  signal?: AbortSignal,
): Promise<PatientPrescription[]> {
  const rows = await javaApi<PatientPrescription[]>(
    `/api/patients/${encodeURIComponent(patientId)}/ordonnances`,
    signal ? { signal } : {},
  );
  return rows ?? [];
}

export async function fetchPatientBilling(
  patientId: string,
  signal?: AbortSignal,
): Promise<PatientBilling[]> {
  const rows = await javaApi<PatientBilling[]>(
    `/api/patients/${encodeURIComponent(patientId)}/factures`,
    signal ? { signal } : {},
  );
  return rows ?? [];
}

export async function fetchPatientFinancialStatus(
  patientId: string,
  signal?: AbortSignal,
): Promise<FinancialStatus> {
  return javaApi<FinancialStatus>(
    `/api/patients/${encodeURIComponent(patientId)}/dossier-financier`,
    signal ? { signal } : {},
  );
}

export type PatientTimelineEvent = {
  id: string;
  source: string;
  type: string;
  title: string;
  detail?: string | null;
  at?: string | null;
  actor?: string | null;
  action?: string | null;
};

export async function fetchPatientTimeline(
  patientId: string,
  signal?: AbortSignal,
): Promise<PatientTimelineEvent[]> {
  const rows = await javaApi<PatientTimelineEvent[]>(
    `/api/patients/${encodeURIComponent(patientId)}/timeline`,
    signal ? { signal } : {},
  );
  return rows ?? [];
}

export async function createPatient(payload: PatientWritePayload | Omit<PatientRow, "id">): Promise<PatientRow> {
  const dto = await javaApi<PatientDto>("/api/patients", { method: "POST", body: payload });
  return mapPatient(dto);
}

export async function updatePatient(
  id: string,
  payload: PatientWritePayload,
): Promise<PatientRow> {
  const dto = await javaApi<PatientDto>(`/api/patients/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: payload,
  });
  return mapPatient(dto);
}

export async function fetchPatientReports(patientId: string, signal?: AbortSignal) {
  return javaApi<unknown[]>(
    `/api/patients/${encodeURIComponent(patientId)}/reports`,
    signal ? { signal } : {},
  );
}

export async function fetchPatientAppointments(
  patientId: string,
  signal?: AbortSignal,
): Promise<AppointmentDto[]> {
  const rows = await javaApi<AppointmentDto[]>(
    `/api/patients/${encodeURIComponent(patientId)}/appointments`,
    signal ? { signal } : {},
  );
  return rows ?? [];
}
