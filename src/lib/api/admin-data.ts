import { javaApi, javaApiBlob, javaApiForm, JAVA_API_BASE } from "@/lib/api/config";
import { readAuthToken } from "@/lib/auth-session";

export type DemoDatasetStatus = {
  loaded: boolean;
  countsByType?: Record<string, number>;
  totalMarkers?: number;
};

export type ImportRowError = {
  sheet?: string;
  row?: number;
  column?: string;
  message: string;
};

export type ImportPreview = {
  filename?: string;
  mode?: string;
  rowsTotal: number;
  rowsValid: number;
  rowsRejected: number;
  errors?: ImportRowError[];
};

export type ImportResult = {
  jobId?: number | string;
  filename?: string;
  mode?: string;
  status?: string;
  rowsTotal?: number;
  rowsValid?: number;
  rowsImported?: number;
  rowsRejected?: number;
  errors?: ImportRowError[];
};

export type DataImportJob = {
  id: number | string;
  filename: string;
  importType?: string;
  importMode?: string;
  status: string;
  rowsTotal?: number;
  rowsValid?: number;
  rowsImported?: number;
  rowsRejected?: number;
  errorSummary?: string | null;
  createdByName?: string | null;
  createdAt?: string | null;
  completedAt?: string | null;
};

export async function fetchDemoStatus(signal?: AbortSignal): Promise<DemoDatasetStatus> {
  return javaApi<DemoDatasetStatus>("/api/admin/data/demo/status", signal ? { signal } : {});
}

export async function loadDemoData(force = false): Promise<DemoDatasetStatus> {
  return javaApi<DemoDatasetStatus>(`/api/admin/data/demo/load?force=${force ? "true" : "false"}`, {
    method: "POST",
  });
}

export async function resetDemoData(): Promise<DemoDatasetStatus> {
  return javaApi<DemoDatasetStatus>("/api/admin/data/demo/reset", { method: "POST" });
}

export async function loadCatalogueBaseline(): Promise<DemoDatasetStatus> {
  return javaApi<DemoDatasetStatus>("/api/admin/data/catalogue/baseline", { method: "POST" });
}

export async function downloadImportTemplate(): Promise<Blob> {
  return javaApiBlob("/api/admin/data/template");
}

export async function previewImport(file: File, mode: string): Promise<ImportPreview> {
  const form = new FormData();
  form.append("file", file);
  return javaApiForm<ImportPreview>(`/api/admin/data/import/preview?mode=${encodeURIComponent(mode)}`, form);
}

export async function commitImport(file: File, mode: string): Promise<ImportResult> {
  const form = new FormData();
  form.append("file", file);
  return javaApiForm<ImportResult>(`/api/admin/data/import/commit?mode=${encodeURIComponent(mode)}`, form);
}

export async function fetchImportHistory(signal?: AbortSignal): Promise<DataImportJob[]> {
  const rows = await javaApi<DataImportJob[]>(
    "/api/admin/data/import/history",
    signal ? { signal } : {},
  );
  return rows ?? [];
}

/** Fallback download via fetch if javaApiBlob path differs. */
export async function downloadTemplateFile(): Promise<void> {
  const token = readAuthToken();
  const res = await fetch(`${JAVA_API_BASE}/api/admin/data/template`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Téléchargement du modèle impossible");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "MediCare_Import_Template.xlsx";
  a.click();
  URL.revokeObjectURL(url);
}
