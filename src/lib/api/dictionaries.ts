import { javaApi } from "./config";

export type DictionaryItem = {
  id: number;
  code: string;
  label: string;
  active: boolean;
  familyId?: number | null;
  familyLabel?: string | null;
};

export async function fetchAnatomicalZones(activeOnly = true, signal?: AbortSignal) {
  return javaApi<DictionaryItem[]>(
    `/api/dictionaries/zones?activeOnly=${activeOnly}`,
    signal ? { signal } : {},
  );
}

export async function createAnatomicalZone(body: { code: string; label: string; active?: boolean }) {
  return javaApi<DictionaryItem>("/api/dictionaries/zones", { method: "POST", body });
}

export async function patchAnatomicalZone(id: number, body: { label?: string; active?: boolean }) {
  return javaApi<DictionaryItem>(`/api/dictionaries/zones/${id}`, { method: "PATCH", body });
}

export async function fetchPathologyFamilies(activeOnly = true, signal?: AbortSignal) {
  return javaApi<DictionaryItem[]>(
    `/api/dictionaries/pathology-families?activeOnly=${activeOnly}`,
    signal ? { signal } : {},
  );
}

export async function createPathologyFamily(body: { code: string; label: string; active?: boolean }) {
  return javaApi<DictionaryItem>("/api/dictionaries/pathology-families", { method: "POST", body });
}

export async function patchPathologyFamily(id: number, body: { label?: string; active?: boolean }) {
  return javaApi<DictionaryItem>(`/api/dictionaries/pathology-families/${id}`, {
    method: "PATCH",
    body,
  });
}

export async function fetchPathologies(params?: { familyId?: number; q?: string }, signal?: AbortSignal) {
  const qs = new URLSearchParams();
  if (params?.familyId != null) qs.set("familyId", String(params.familyId));
  if (params?.q) qs.set("q", params.q);
  const suffix = qs.toString() ? `?${qs}` : "";
  return javaApi<DictionaryItem[]>(`/api/dictionaries/pathologies${suffix}`, signal ? { signal } : {});
}

export async function createPathology(body: {
  code: string;
  label: string;
  familyId?: number;
  active?: boolean;
}) {
  return javaApi<DictionaryItem>("/api/dictionaries/pathologies", { method: "POST", body });
}

export async function patchPathology(
  id: number,
  body: { label?: string; active?: boolean; familyId?: number | null },
) {
  return javaApi<DictionaryItem>(`/api/dictionaries/pathologies/${id}`, { method: "PATCH", body });
}
