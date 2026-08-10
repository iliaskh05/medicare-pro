/**
 * Runtime configuration for RadioCRM backend services.
 * Secrets come from process.env / Cloudflare bindings (.dev.vars).
 */

function env(key: string, fallback = ""): string {
  if (typeof process !== "undefined" && process.env?.[key]) {
    return process.env[key]!;
  }
  try {
    // Vite injects VITE_* on the client; server may also see import.meta.env
    const meta = import.meta.env as Record<string, string | undefined>;
    if (meta?.[key]) return meta[key]!;
  } catch {
    /* ignore */
  }
  return fallback;
}

export const serverConfig = {
  apiKey: env("RADIOCRM_API_KEY", "dev-radiocrm-key"),
  jwtSecret: env("RADIOCRM_JWT_SECRET", "dev-jwt-secret-change-me"),
  llm: {
    // Préférer OPENAI_API_KEY (serveur). Fallback VITE_* uniquement en local pour la démo.
    apiKey: env("OPENAI_API_KEY") || env("LLM_API_KEY"),
    baseUrl: env("LLM_BASE_URL", "https://api.openai.com/v1"),
    model: env("LLM_MODEL", "gpt-4o-mini"),
  },
  whatsapp: {
    verifyToken: env("WHATSAPP_VERIFY_TOKEN", "radiocrm-wa-verify"),
    accessToken: env("WHATSAPP_ACCESS_TOKEN"),
    phoneNumberId: env("WHATSAPP_PHONE_NUMBER_ID"),
    appSecret: env("WHATSAPP_APP_SECRET"),
  },
  mlServiceUrl: env("ML_SERVICE_URL", "http://127.0.0.1:8090"),
  wsPath: "/api/chat/ws",
  corsOrigins: env("CORS_ORIGINS", "*")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
};

export type ServerConfig = typeof serverConfig;
