const API_KEY =
  (typeof import.meta !== "undefined" &&
    (import.meta.env?.VITE_RADIOCRM_API_KEY as string | undefined)) ||
  "dev-radiocrm-key";

export type ApiEnvelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string };
  ts?: string;
};

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("x-api-key")) headers.set("x-api-key", API_KEY);
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const res = await fetch(path, { ...init, headers });
  const json = (await res.json()) as ApiEnvelope<T>;
  if (!res.ok || !json.ok) {
    throw new Error(json.error?.message ?? `Erreur API ${res.status}`);
  }
  return json.data as T;
}

export function getApiKey(): string {
  return API_KEY;
}
