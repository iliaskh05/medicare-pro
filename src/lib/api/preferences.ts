import { javaApi } from "./config";

/** GET /api/preferences — préférences UI de l'utilisateur courant. */
export async function fetchMyPreferences(signal?: AbortSignal): Promise<Record<string, unknown>> {
  return javaApi<Record<string, unknown>>("/api/preferences", signal ? { signal } : {});
}

export async function fetchMyPreference(
  key: string,
  signal?: AbortSignal,
): Promise<Record<string, unknown>> {
  return javaApi<Record<string, unknown>>(
    `/api/preferences/${encodeURIComponent(key)}`,
    signal ? { signal } : {},
  );
}

export async function saveMyPreference(
  key: string,
  value: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  return javaApi<Record<string, unknown>>(`/api/preferences/${encodeURIComponent(key)}`, {
    method: "PUT",
    body: value,
  });
}
