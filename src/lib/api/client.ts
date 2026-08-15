/**
 * Utilitaire HTTP RadioCRM — façade typée sur le client Java authentifié.
 */
import { JAVA_API_BASE, ApiError, javaApi } from "./config";

export { JAVA_API_BASE, ApiError, javaApi };

export type ApiRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

/** Requête authentifiée (Authorization: Bearer <token>). */
export function apiRequest<T>(path: string, options?: ApiRequestOptions): Promise<T> {
  return javaApi<T>(path, options);
}

export const api = {
  get: <T>(path: string, options?: Omit<ApiRequestOptions, "method" | "body">) =>
    javaApi<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, "method" | "body">) =>
    javaApi<T>(path, { ...options, method: "POST", body }),
  put: <T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, "method" | "body">) =>
    javaApi<T>(path, { ...options, method: "PUT", body }),
  patch: <T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, "method" | "body">) =>
    javaApi<T>(path, { ...options, method: "PATCH", body }),
  delete: <T>(path: string, options?: Omit<ApiRequestOptions, "method" | "body">) =>
    javaApi<T>(path, { ...options, method: "DELETE" }),
};
