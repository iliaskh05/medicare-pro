/**
 * Configuration des accès HTTP du frontend de production.
 *
 * Deux backends sont adressés depuis le serveur local du centre :
 *  - `JAVA_API` : API métier (patients, factures, correspondants, messagerie).
 *  - `ML_API`   : microservice Python (clustering fraude caisse, analyse d'images).
 *
 * Les URLs sont injectées au build via les variables d'environnement Vite,
 * ce qui permet de basculer sans toucher au code applicatif.
 */
export const JAVA_API_BASE =
  (import.meta.env?.['VITE_JAVA_API_URL'] as string | undefined)?.replace(/\/$/, "") ?? "";

export const ML_API_BASE =
  (import.meta.env?.['VITE_ML_API_URL'] as string | undefined)?.replace(/\/$/, "") ?? "";

export const API_TIMEOUT_MS = Number(import.meta.env?.['VITE_API_TIMEOUT_MS'] ?? 15000);

/** Vrai lorsque le backend Java est configuré (déploiement serveur du centre). */
export const isJavaApiConfigured = () => JAVA_API_BASE.length > 0;

/** Vrai lorsque le microservice Python de scoring est configuré. */
export const isMlApiConfigured = () => ML_API_BASE.length > 0;

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

function authHeaders(): Record<string, string> {
  const token =
    typeof window !== "undefined" ? window.sessionStorage.getItem("radiocrm:token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Point d'entrée HTTP unique. Toutes les fonctions de service passent par ici :
 * il suffira de brancher l'authentification définitive (JWT du backend Java)
 * à cet endroit.
 */
export async function httpRequest<T>(
  base: string,
  path: string,
  { method = "GET", body, headers, signal }: RequestOptions = {},
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  signal?.addEventListener("abort", () => controller.abort());

  try {
    const res = await fetch(`${base}${path}`, {
      method,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...authHeaders(),
        ...headers,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    if (!res.ok) {
      throw new ApiError(`Erreur ${res.status} sur ${path}`, res.status, "http_error");
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      error instanceof Error ? error.message : "Requête réseau impossible",
      0,
      "network_error",
    );
  } finally {
    clearTimeout(timeout);
  }
}

export const javaApi = <T>(path: string, options?: RequestOptions) =>
  httpRequest<T>(JAVA_API_BASE, path, options);

export const mlApi = <T>(path: string, options?: RequestOptions) =>
  httpRequest<T>(ML_API_BASE, path, options);
