import { patients, type Patient } from "@/data/mock";

import { isJavaApiConfigured, javaApi } from "./config";

/**
 * Récupère la liste des patients.
 * TODO backend Java : GET /api/patients
 */
export async function fetchPatients(params: { search?: string } = {}): Promise<Patient[]> {
  if (isJavaApiConfigured()) {
    const query = params.search ? `?search=${encodeURIComponent(params.search)}` : "";
    return javaApi<Patient[]>(`/api/patients${query}`);
  }
  const q = params.search?.trim().toLowerCase();
  return patients.filter(
    (p) => !q || p.nom.toLowerCase().includes(q) || p.id.toLowerCase().includes(q),
  );
}

/**
 * Charge le dossier complet d'un patient (identité, examens, facturation).
 * TODO backend Java : GET /api/patients/{id}
 */
export async function fetchPatientData(patientId: string): Promise<Patient | null> {
  if (isJavaApiConfigured()) {
    return javaApi<Patient>(`/api/patients/${encodeURIComponent(patientId)}`);
  }
  return patients.find((p) => p.id === patientId) ?? null;
}

/**
 * Création d'un patient depuis l'accueil.
 * TODO backend Java : POST /api/patients
 */
export async function createPatient(payload: Omit<Patient, "id">): Promise<Patient> {
  if (isJavaApiConfigured()) {
    return javaApi<Patient>("/api/patients", { method: "POST", body: payload });
  }
  return { ...(payload as Patient), id: `PAT-${Date.now().toString().slice(-4)}` };
}
