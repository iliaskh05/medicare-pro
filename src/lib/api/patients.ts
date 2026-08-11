import { javaApi } from "./config";

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
  prochainRdv?: string | undefined;
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
  prochainRdv?: string | undefined;
};

export type HistoryItem = {
  date: string;
  type: string;
  intitule: string;
  praticien: string;
  note: string;
  tone: "primary" | "warning" | "success" | "destructive" | "neutral";
};

export type PatientImaging = {
  id: string;
  examen: string;
  modalite: string;
  date: string;
  radiologue: string;
  statut: string;
  tone: "success" | "warning" | "destructive" | "primary" | "neutral";
  conclusion: string;
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
  statut: string;
  tone: "success" | "warning" | "destructive" | "primary" | "neutral";
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
    prochainRdv: dto.prochainRdv,
  };
}

export async function fetchPatients(signal?: AbortSignal): Promise<PatientRow[]> {
  const rows = await javaApi<PatientDto[]>("/api/patients", signal ? { signal } : {});
  return (rows ?? []).map(mapPatient);
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

export async function fetchPatientImaging(
  patientId: string,
  signal?: AbortSignal,
): Promise<PatientImaging[]> {
  const rows = await javaApi<PatientImaging[]>(
    `/api/patients/${encodeURIComponent(patientId)}/imagerie`,
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

export async function createPatient(payload: Omit<PatientRow, "id">): Promise<PatientRow> {
  const dto = await javaApi<PatientDto>("/api/patients", { method: "POST", body: payload });
  return mapPatient(dto);
}
