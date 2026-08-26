/**
 * Navigation dossier patient — contrat unique pour listes opérationnelles.
 * Les pages File d'attente / Impayés / Dossiers doivent ouvrir /patient/$patientId
 * (jamais /dossiers/$examenId ni un numéro de séjour).
 */

export function patientDossierPath(patientId: string | number | null | undefined): string | null {
  if (patientId == null) return null;
  const id = String(patientId).trim();
  if (!id || id === "null" || id === "undefined") return null;
  return `/patient/${encodeURIComponent(id)}`;
}

export type PatientNavTarget = {
  to: "/patient/$patientId";
  params: { patientId: string };
};

/** Params TanStack Router pour Link / navigate. */
export function patientDossierLink(
  patientId: string | number | null | undefined,
): PatientNavTarget | null {
  const path = patientDossierPath(patientId);
  if (!path) return null;
  const patientIdParam = path.slice("/patient/".length);
  return {
    to: "/patient/$patientId",
    params: { patientId: decodeURIComponent(patientIdParam) },
  };
}
