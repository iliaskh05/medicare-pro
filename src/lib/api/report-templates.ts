import { javaApi } from "./config";

export type ReportTemplate = {
  id: number;
  code: string;
  label: string;
  modalite?: string | null;
  catalogueId?: number | null;
  indication?: string | null;
  technique?: string | null;
  resultats?: string | null;
  conclusion?: string | null;
  active?: boolean;
};

export async function fetchReportTemplates(params?: {
  modalite?: string;
  activeOnly?: boolean;
  signal?: AbortSignal;
}): Promise<ReportTemplate[]> {
  const qs = new URLSearchParams();
  if (params?.modalite) qs.set("modalite", params.modalite);
  qs.set("activeOnly", String(params?.activeOnly ?? true));
  const suffix = qs.toString() ? `?${qs}` : "";
  return javaApi<ReportTemplate[]>(
    `/api/report-templates${suffix}`,
    params?.signal ? { signal: params.signal } : {},
  );
}

export async function markReportPrinted(id: string): Promise<unknown> {
  return javaApi(`/api/reports/${encodeURIComponent(id)}/mark-printed`, { method: "POST" });
}
