import { javaApi } from "./config";

/** Modèle exact renvoyé par le backend Spring Boot : GET /api/patients */
export type PatientDto = {
  id: number | string;
  nomComplet: string;
  cin: string;
  age: number;
  telephone: string;
  mutuelle: string;
};

/** Ligne patient utilisée par l'interface (aucune donnée fictive). */
export type PatientRow = {
  id: string;
  nomComplet: string;
  cin: string;
  age: number;
  telephone: string;
  mutuelle: string;
};

function mapPatient(dto: PatientDto): PatientRow {
  return {
    id: String(dto.id),
    nomComplet: dto.nomComplet,
    cin: dto.cin,
    age: Number(dto.age ?? 0),
    telephone: dto.telephone,
    mutuelle: dto.mutuelle,
  };
}

/** GET {JAVA_API_BASE}/api/patients */
export async function fetchPatients(signal?: AbortSignal): Promise<PatientRow[]> {
  const rows = await javaApi<PatientDto[]>("/api/patients", signal ? { signal } : {});
  return (rows ?? []).map(mapPatient);
}

/** GET {JAVA_API_BASE}/api/patients/{id} */
export async function fetchPatientData(patientId: string): Promise<PatientRow> {
  const dto = await javaApi<PatientDto>(`/api/patients/${encodeURIComponent(patientId)}`);
  return mapPatient(dto);
}

/** POST {JAVA_API_BASE}/api/patients */
export async function createPatient(payload: Omit<PatientRow, "id">): Promise<PatientRow> {
  const dto = await javaApi<PatientDto>("/api/patients", { method: "POST", body: payload });
  return mapPatient(dto);
}
