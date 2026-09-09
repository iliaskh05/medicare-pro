/**
 * Configuration des accès HTTP du frontend.
 *
 *  - `JAVA_API` : API métier Spring (patients, factures, messagerie).
 *  - `ML_API`   : microservice Python optionnel (fraude).
 *
 * L'adresse du serveur peut être changée sans rebuild via localStorage
 * (`radiocrm:server-url`). Dev peut rester localhost ; le LAN utilise l'IP du serveur.
 */
import {
  clearAuthStorage,
  isPublicAuthPath,
  readAuthToken,
  scheduleLogoutRedirect,
} from "@/lib/auth-session";

export const SERVER_URL_STORAGE_KEY = "radiocrm:server-url";

function readBase(key: string): string | undefined {
  const raw = import.meta.env?.[key] as string | undefined;
  const value = raw?.trim().replace(/\/$/, "");
  return value ? value : undefined;
}

function isLoopbackHost(host: string): boolean {
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "::1";
}

function isLoopbackUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return isLoopbackHost(host);
  } catch {
    return url.includes("localhost") || url.includes("127.0.0.1");
  }
}

function normalizeServerUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, "");
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `http://${trimmed}`;
}

function readStoredServerUrl(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const stored = window.localStorage.getItem(SERVER_URL_STORAGE_KEY);
    if (!stored) return undefined;
    const normalized = normalizeServerUrl(stored);
    return normalized || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Résolution automatique (sans override opérateur) :
 * - SSR / Node : VITE_JAVA_API_URL ou localhost (dev).
 * - Page servie depuis un hôte LAN alors que le build pointe encore sur localhost
 *   → même hostname, port 8080.
 */
function resolveDefaultJavaApiBase(): string {
  const configured = readBase("VITE_JAVA_API_URL");
  if (typeof window === "undefined") {
    return configured ?? "http://localhost:8080";
  }
  const pageHost = window.location.hostname;
  if (!configured || (isLoopbackUrl(configured) && !isLoopbackHost(pageHost))) {
    return `${window.location.protocol}//${pageHost}:8080`;
  }
  return configured;
}

/** Adresse API courante (override localStorage > env / hostname). */
export function getJavaApiBase(): string {
  return readStoredServerUrl() ?? resolveDefaultJavaApiBase();
}

export function setJavaApiBase(url: string): void {
  if (typeof window === "undefined") return;
  const normalized = normalizeServerUrl(url);
  if (!normalized) {
    window.localStorage.removeItem(SERVER_URL_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(SERVER_URL_STORAGE_KEY, normalized);
}

export function clearJavaApiBaseOverride(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SERVER_URL_STORAGE_KEY);
}

/** @deprecated Prefer getJavaApiBase() so LAN overrides apply after login config. */
export const JAVA_API_BASE = getJavaApiBase();

/** Microservice Python de scoring / clustering. */
export const ML_API_BASE = readBase("VITE_ML_API_URL");

export const API_CONFIGURED = true;

export const API_TIMEOUT_MS = Number(import.meta.env?.["VITE_API_TIMEOUT_MS"] ?? 15000);

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 0, code = "api_error") {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

function clearSessionAndRedirectToLogin() {
  if (typeof window === "undefined") return;
  clearAuthStorage();
  if (!scheduleLogoutRedirect()) return;
  const path = window.location.pathname;
  if (!isPublicAuthPath(path)) {
    window.location.assign("/");
  }
}

async function parseErrorPayload(
  res: Response,
  fallback: string,
): Promise<{ message: string; code: string }> {
  try {
    const data = (await res.json()) as { message?: string; code?: string };
    return {
      message: data?.message || fallback,
      code:
        data?.code ||
        (res.status === 401 ? "unauthorized" : res.status === 403 ? "forbidden" : "http_error"),
    };
  } catch {
    return {
      message: fallback,
      code: res.status === 401 ? "unauthorized" : res.status === 403 ? "forbidden" : "http_error",
    };
  }
}

function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const name = "name" in error ? String((error as { name?: string }).name) : "";
  return name === "AbortError";
}

/**
 * Point d'entrée HTTP unique. Attache le JWT Bearer.
 * 401 Java : nettoyage de session + redirection login.
 * 403 : Accès refusé sans déconnexion.
 */
export async function httpRequest<T>(
  base: string | undefined,
  path: string,
  { method = "GET", body, headers, signal }: RequestOptions = {},
): Promise<T> {
  if (!base) {
    throw new ApiError("URL du service indisponible.", 0, "backend_not_configured");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  const onParentAbort = () => controller.abort();
  signal?.addEventListener("abort", onParentAbort);

  const token = readAuthToken();
  const isJavaApi = base === getJavaApiBase();
  const url = `${base}${path}`;

  try {
    const res = await fetch(url, {
      method,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(isJavaApi && token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    if (signal?.aborted || controller.signal.aborted) {
      throw new ApiError("Requête annulée", 0, "aborted");
    }

    if (isJavaApi && res.status === 401) {
      const payload = await parseErrorPayload(res, "Session expirée — reconnexion requise");
      clearSessionAndRedirectToLogin();
      throw new ApiError(payload.message, res.status, payload.code);
    }

    if (isJavaApi && res.status === 403) {
      const payload = await parseErrorPayload(res, "Accès refusé");
      throw new ApiError(payload.message, res.status, payload.code);
    }

    if (!res.ok) {
      const payload = await parseErrorPayload(res, `Erreur ${res.status} sur ${path}`);
      throw new ApiError(payload.message, res.status, payload.code);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (isAbortError(error) || signal?.aborted) {
      throw new ApiError("Requête annulée", 0, "aborted");
    }
    throw new ApiError(
      error instanceof Error ? error.message : "Requête réseau impossible",
      0,
      typeof navigator !== "undefined" && navigator.onLine === false
        ? "offline"
        : "network_error",
    );
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", onParentAbort);
  }
}

export const javaApi = <T>(path: string, options?: RequestOptions) =>
  httpRequest<T>(getJavaApiBase(), path, options);

export const mlApi = <T>(path: string, options?: RequestOptions) =>
  httpRequest<T>(ML_API_BASE, path, options);

const UPLOAD_TIMEOUT_MS = 120_000;

/** POST multipart authentifié (ne pas forcer Content-Type : le navigateur pose la boundary). */
export async function javaApiForm<T>(
  path: string,
  form: FormData,
  { signal, method = "POST" }: { signal?: AbortSignal; method?: "POST" | "PUT" } = {},
): Promise<T> {
  const base = getJavaApiBase();
  if (!base) {
    throw new ApiError("URL du service indisponible.", 0, "backend_not_configured");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
  const onParentAbort = () => controller.abort();
  signal?.addEventListener("abort", onParentAbort);

  const token = readAuthToken();
  const url = `${base}${path}`;

  try {
    const res = await fetch(url, {
      method,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: form,
    });

    if (signal?.aborted || controller.signal.aborted) {
      throw new ApiError("Requête annulée", 0, "aborted");
    }

    if (res.status === 401) {
      const payload = await parseErrorPayload(res, "Session expirée — reconnexion requise");
      clearSessionAndRedirectToLogin();
      throw new ApiError(payload.message, res.status, payload.code);
    }

    if (res.status === 403) {
      const payload = await parseErrorPayload(res, "Accès refusé");
      throw new ApiError(payload.message, res.status, payload.code);
    }

    if (!res.ok) {
      const payload = await parseErrorPayload(res, `Erreur ${res.status} sur ${path}`);
      throw new ApiError(payload.message, res.status, payload.code);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (isAbortError(error) || signal?.aborted) {
      throw new ApiError("Requête annulée", 0, "aborted");
    }
    throw new ApiError(
      error instanceof Error ? error.message : "Envoi du fichier impossible",
      0,
      typeof navigator !== "undefined" && navigator.onLine === false
        ? "offline"
        : "network_error",
    );
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", onParentAbort);
  }
}

/**
 * GET authentifié renvoyant un Blob (PDF, fichiers binaires).
 */
export async function javaApiBlob(
  path: string,
  { method = "GET", signal, headers }: Omit<RequestOptions, "body"> = {},
): Promise<Blob> {
  const base = getJavaApiBase();
  if (!base) {
    throw new ApiError("URL du service indisponible.", 0, "backend_not_configured");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  const onParentAbort = () => controller.abort();
  signal?.addEventListener("abort", onParentAbort);

  const token = readAuthToken();
  const url = `${base}${path}`;

  try {
    const res = await fetch(url, {
      method,
      signal: controller.signal,
      headers: {
        Accept: "application/pdf, application/octet-stream, */*",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });

    if (signal?.aborted || controller.signal.aborted) {
      throw new ApiError("Requête annulée", 0, "aborted");
    }

    if (res.status === 401) {
      const payload = await parseErrorPayload(res, "Session expirée — reconnexion requise");
      clearSessionAndRedirectToLogin();
      throw new ApiError(payload.message, res.status, payload.code);
    }

    if (res.status === 403) {
      const payload = await parseErrorPayload(res, "Accès refusé");
      throw new ApiError(payload.message, res.status, payload.code);
    }

    if (!res.ok) {
      const payload = await parseErrorPayload(res, `Erreur ${res.status} sur ${path}`);
      throw new ApiError(payload.message, res.status, payload.code);
    }

    return await res.blob();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (isAbortError(error) || signal?.aborted) {
      throw new ApiError("Requête annulée", 0, "aborted");
    }
    throw new ApiError(
      error instanceof Error ? error.message : "Téléchargement impossible",
      0,
      typeof navigator !== "undefined" && navigator.onLine === false
        ? "offline"
        : "network_error",
    );
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", onParentAbort);
  }
}
