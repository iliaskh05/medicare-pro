/// <reference types="vite/client" />

declare global {
  interface ImportMetaEnv {
    readonly VITE_RADIOCRM_API_KEY?: string;
    readonly VITE_WS_URL?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

export {};
