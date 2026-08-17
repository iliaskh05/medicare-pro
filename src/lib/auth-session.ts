/**
 * Session auth RadioCRM — lecture synchrone du JWT (pas d'état React différé).
 */

export const AUTH_TOKEN_KEY = "radiocrm:token";
export const AUTH_USER_KEY = "radiocrm:user";
export const AUTH_ROLE_KEY = "radiocrm:role";

const PUBLIC_AUTH_PATHS = new Set(["/", "/forgot-password", "/reset-password"]);

/** Routes accessibles sans JWT (login / reset). */
export function isPublicAuthPath(pathname: string): boolean {
  if (!pathname) return true;
  if (PUBLIC_AUTH_PATHS.has(pathname)) return true;
  return pathname.startsWith("/reset-password");
}

/**
 * Lecture immédiate du token.
 * Utilise localStorage en premier (survit au F5), puis sessionStorage.
 * Ne dépend d'aucun état React.
 */
export function readAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const fromLocal = window.localStorage.getItem(AUTH_TOKEN_KEY);
    if (fromLocal && fromLocal.trim()) return fromLocal;
    const fromSession = window.sessionStorage.getItem(AUTH_TOKEN_KEY);
    if (fromSession && fromSession.trim()) return fromSession;
    return null;
  } catch {
    return null;
  }
}

export function hasAuthToken(): boolean {
  return Boolean(readAuthToken());
}

/** Persiste le JWT (local + session pour compatibilité). */
export function persistAuthToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
    window.sessionStorage.setItem(AUTH_TOKEN_KEY, token);
    resetLogoutRedirectGuard();
  } catch {
    /* stockage indisponible */
  }
}

/**
 * Efface la session — UNIQUEMENT via logout explicite ou 401 avec Bearer envoyé.
 * Ne jamais appeler depuis un useEffect cleanup / unmount.
 */
export function clearAuthStorage(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
    window.localStorage.removeItem(AUTH_USER_KEY);
    window.sessionStorage.removeItem(AUTH_TOKEN_KEY);
    window.sessionStorage.removeItem(AUTH_ROLE_KEY);
  } catch {
    /* stockage indisponible */
  }
}

/** Empêche les redirections 401 en rafale ; remis à zéro au login. */
let logoutRedirectScheduled = false;

export function isLogoutRedirectScheduled(): boolean {
  return logoutRedirectScheduled;
}

export function scheduleLogoutRedirect(): boolean {
  if (logoutRedirectScheduled) return false;
  logoutRedirectScheduled = true;
  return true;
}

export function resetLogoutRedirectGuard(): void {
  logoutRedirectScheduled = false;
}

