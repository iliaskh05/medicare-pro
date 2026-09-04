import { javaApi } from "./config";

export type AppointmentStatus =
  | "SCHEDULED"
  | "CONFIRMED"
  | "CANCELLED"
  | "RESCHEDULED"
  | "NO_SHOW"
  | "CHECKED_IN";

export type AppointmentDto = {
  id: string;
  patientId: string;
  patient: string;
  catalogueId?: string | null;
  examenLibelle?: string | null;
  resourceId?: string | null;
  resourceCode?: string | null;
  resourceLibelle?: string | null;
  salle?: string | null;
  modalite: string;
  prescripteurId?: string | null;
  prescripteur?: string | null;
  examenId?: string | null;
  statut: AppointmentStatus | string;
  priorite: string;
  dureeMinutes: number;
  motif?: string | null;
  notes?: string | null;
  startsAt: string;
  endsAt: string;
};

export type AppointmentWritePayload = {
  patientId: number | string;
  catalogueId?: number | string;
  resourceId?: number | string;
  prescripteurId?: number | string;
  dateHeure: string;
  dureeMinutes?: number;
  modalite?: string;
  priorite?: string;
  motif?: string;
  notes?: string;
  salle?: string;
};

export type ResourceDto = {
  id: string;
  code: string;
  libelle: string;
  modalite?: string | null;
  actif: boolean;
};

export async function fetchAppointments(
  params: {
    from?: string;
    to?: string;
    statut?: string;
    resourceId?: string;
    medecinId?: string;
    modalite?: string;
  } = {},
  signal?: AbortSignal,
): Promise<AppointmentDto[]> {
  const q = new URLSearchParams();
  if (params.from) q.set("from", params.from);
  if (params.to) q.set("to", params.to);
  if (params.statut) q.set("statut", params.statut);
  if (params.resourceId) q.set("resourceId", params.resourceId);
  if (params.medecinId) q.set("medecinId", params.medecinId);
  if (params.modalite) q.set("modalite", params.modalite);
  const suffix = q.toString() ? `?${q}` : "";
  const rows = await javaApi<AppointmentDto[]>(
    `/api/appointments${suffix}`,
    signal ? { signal } : {},
  );
  return rows ?? [];
}

export async function createAppointment(
  payload: AppointmentWritePayload,
): Promise<AppointmentDto> {
  return javaApi<AppointmentDto>("/api/appointments", {
    method: "POST",
    body: {
      ...payload,
      patientId: Number(payload.patientId),
      catalogueId: payload.catalogueId != null ? Number(payload.catalogueId) : undefined,
      resourceId: payload.resourceId != null ? Number(payload.resourceId) : undefined,
      prescripteurId: payload.prescripteurId != null ? Number(payload.prescripteurId) : undefined,
    },
  });
}

export async function confirmAppointment(id: string): Promise<AppointmentDto> {
  return javaApi<AppointmentDto>(`/api/appointments/${encodeURIComponent(id)}/confirm`, {
    method: "POST",
  });
}

export async function cancelAppointment(id: string, reason?: string): Promise<AppointmentDto> {
  return javaApi<AppointmentDto>(`/api/appointments/${encodeURIComponent(id)}/cancel`, {
    method: "POST",
    body: { reason },
  });
}

export async function checkInAppointment(id: string): Promise<AppointmentDto> {
  return javaApi<AppointmentDto>(`/api/appointments/${encodeURIComponent(id)}/check-in`, {
    method: "POST",
  });
}

export async function noShowAppointment(id: string): Promise<AppointmentDto> {
  return javaApi<AppointmentDto>(`/api/appointments/${encodeURIComponent(id)}/no-show`, {
    method: "POST",
  });
}

export async function rescheduleAppointment(
  id: string,
  payload: { dateHeure: string; dureeMinutes?: number; resourceId?: number | string; note?: string },
): Promise<AppointmentDto> {
  return javaApi<AppointmentDto>(`/api/appointments/${encodeURIComponent(id)}/reschedule`, {
    method: "POST",
    body: {
      dateHeure: payload.dateHeure,
      ...(payload.dureeMinutes != null ? { dureeMinutes: payload.dureeMinutes } : {}),
      ...(payload.resourceId != null ? { resourceId: Number(payload.resourceId) } : {}),
      ...(payload.note ? { note: payload.note } : {}),
    },
  });
}

export async function fetchResources(signal?: AbortSignal): Promise<ResourceDto[]> {
  const rows = await javaApi<ResourceDto[]>("/api/resources", signal ? { signal } : {});
  return rows ?? [];
}
