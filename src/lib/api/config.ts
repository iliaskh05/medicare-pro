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
function readBase(key: string): string | undefined {
  const raw = import.meta.env?.[key] as string | undefined;
  const value = raw?.trim().replace(/\/$/, "");
  return value ? value : undefined;
}

/** Backend Spring Boot du centre (serveur local du centre). */
export const JAVA_API_BASE = readBase("VITE_JAVA_API_URL") ?? "http://localhost:8080";

/** Microservice Python de scoring / clustering. */
export const ML_API_BASE = readBase("VITE_ML_API_URL");

/** Toujours vrai : l'API Java pointe par défaut sur localhost:8080. */
export const API_CONFIGURED = Boolean(JAVA_API_BASE);

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

function readToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    window.localStorage.getItem("radiocrm:token") ??
    window.sessionStorage.getItem("radiocrm:token")
  );
}

function clearSessionAndRedirectToLogin() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("radiocrm:token");
  window.localStorage.removeItem("radiocrm:user");
  window.sessionStorage.removeItem("radiocrm:token");
  window.sessionStorage.removeItem("radiocrm:role");

  const path = window.location.pathname;
  if (path !== "/" && path !== "") {
    window.location.assign("/");
  }
}

async function parseErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as { message?: string };
    if (data?.message) return data.message;
  } catch {
    /* ignore */
  }
  return fallback;
}

/**
 * Point d'entrée HTTP unique. Attache le JWT Bearer et gère 401/403
 * (session expirée → nettoyage + redirection login).
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
  signal?.addEventListener("abort", () => controller.abort());

  const token = readToken();
  const isJavaApi = base === JAVA_API_BASE;

  try {
    const res = await fetch(`${base}${path}`, {
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

    if (isJavaApi && (res.status === 401 || res.status === 403)) {
      clearSessionAndRedirectToLogin();
      throw new ApiError(
        await parseErrorMessage(
          res,
          res.status === 401 ? "Session expirée — reconnexion requise" : "Accès refusé",
        ),
        res.status,
        "unauthorized",
      );
    }

    if (!res.ok) {
      throw new ApiError(
        await parseErrorMessage(res, `Erreur ${res.status} sur ${path}`),
        res.status,
        "http_error",
      );
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
