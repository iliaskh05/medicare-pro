/// <reference types="vite/client" />

declare global {
  interface ImportMetaEnv {
    readonly VITE_RADIOCRM_API_KEY?: string;
    readonly VITE_WS_URL?: string;
    readonly VITE_JAVA_API_URL?: string;
    readonly VITE_ML_API_URL?: string;
    readonly VITE_API_TIMEOUT_MS?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

export {};
