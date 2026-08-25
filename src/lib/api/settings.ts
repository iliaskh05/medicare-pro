import { javaApi } from "./config";

export type AppSettingsMap = Record<string, string>;

export async function fetchSettings(
  prefix?: string,
  signal?: AbortSignal,
): Promise<AppSettingsMap> {
  const q = prefix ? `?prefix=${encodeURIComponent(prefix)}` : "";
  const data = await javaApi<{ settings?: AppSettingsMap }>(
    `/api/settings${q}`,
    signal ? { signal } : {},
  );
  return data?.settings ?? {};
}

export async function saveSettings(patch: AppSettingsMap): Promise<AppSettingsMap> {
  const data = await javaApi<{ settings?: AppSettingsMap }>("/api/settings", {
    method: "PUT",
    body: patch,
  });
  return data?.settings ?? {};
}
