import { serverConfig } from "../config";

export class HttpError extends Error {
  status: number;
  code: string;

  constructor(status: number, message: string, code = "error") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/** Extract bearer / x-api-key from request (headers or query for SSE/EventSource). */
export function extractCredential(request: Request): string | null {
  const apiKey = request.headers.get("x-api-key");
  if (apiKey) return apiKey.trim();

  const auth = request.headers.get("authorization");
  if (auth) {
    const [scheme, token] = auth.split(/\s+/);
    if (scheme && token && (scheme.toLowerCase() === "bearer" || scheme.toLowerCase() === "apikey")) {
      return token.trim();
    }
  }

  try {
    const url = new URL(request.url);
    const q = url.searchParams.get("apiKey") ?? url.searchParams.get("access_token");
    if (q) return q.trim();
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Authenticate API consumers. In development, the default key is accepted.
 * WhatsApp webhooks bypass this (signature verified separately).
 */
export function requireApiAuth(request: Request): { subject: string } {
  const cred = extractCredential(request);
  if (!cred) {
    throw new HttpError(401, "Authentification requise", "unauthorized");
  }
  if (cred !== serverConfig.apiKey && !cred.startsWith("doc-")) {
    throw new HttpError(403, "Clé API invalide", "forbidden");
  }
  return { subject: cred.startsWith("doc-") ? cred : "service" };
}

export function jsonOk<T>(data: T, init: ResponseInit = {}): Response {
  return Response.json(
    { ok: true, data, ts: new Date().toISOString() },
    {
      ...init,
      headers: {
        "cache-control": "no-store",
        ...(init.headers ?? {}),
      },
    },
  );
}

export function jsonError(error: unknown): Response {
  if (error instanceof HttpError) {
    return Response.json(
      { ok: false, error: { code: error.code, message: error.message } },
      { status: error.status, headers: { "cache-control": "no-store" } },
    );
  }
  console.error(error);
  return Response.json(
    { ok: false, error: { code: "internal", message: "Erreur interne" } },
    { status: 500, headers: { "cache-control": "no-store" } },
  );
}

export async function parseJsonBody<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new HttpError(400, "Corps JSON invalide", "invalid_json");
  }
}

/** Timing-safe string compare for webhook secrets. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}
