import { getJavaApiBase, javaApi } from "./config";

export type SystemStatus = {
  status?: string;
  version?: string;
  profile?: string;
  timestamp?: string;
  api?: string;
  database?: string;
  ml?: string;
  websocket?: string;
  centreNom?: string;
  centreVille?: string;
  correlationId?: string;
};

export function configuredBackendUrl(): string {
  return getJavaApiBase();
}

export async function fetchSystemHealth(signal?: AbortSignal): Promise<SystemStatus> {
  return javaApi<SystemStatus>("/api/system/health", signal ? { signal } : {});
}

export async function fetchSystemStatus(signal?: AbortSignal): Promise<SystemStatus> {
  return javaApi<SystemStatus>("/api/system/status", signal ? { signal } : {});
}
