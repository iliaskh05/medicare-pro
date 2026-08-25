import { javaApi } from "./config";

export type WaitingRoomItem = {
  id: string;
  patient: string;
  patientId?: string;
  examen: string;
  modalite?: string;
  priorite?: string;
  statut: string;
  workflowStatus?: string;
  operateur?: string | null;
  attenteMinutes?: number | null;
  heurePrevue?: string | null;
  heureArrivee?: string | null;
};

export async function fetchWaitingRoom(
  params: { statut?: string; priorite?: string } = {},
  signal?: AbortSignal,
): Promise<WaitingRoomItem[]> {
  const q = new URLSearchParams();
  if (params.statut) q.set("statut", params.statut);
  if (params.priorite) q.set("priorite", params.priorite);
  const suffix = q.toString() ? `?${q}` : "";
  const rows = await javaApi<WaitingRoomItem[]>(
    `/api/waiting-room${suffix}`,
    signal ? { signal } : {},
  );
  return rows ?? [];
}

export async function advanceWaitingRoom(examenId: string): Promise<WaitingRoomItem> {
  return javaApi<WaitingRoomItem>(
    `/api/waiting-room/${encodeURIComponent(examenId)}/advance`,
    { method: "POST" },
  );
}
