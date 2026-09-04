import { javaApi } from "./config";

export type AuditTrailItem = {
  id: number;
  action: string;
  entityType?: string;
  entityId?: string;
  userId?: number;
  userEmail?: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
};

export type AuditTrailPage = {
  content: AuditTrailItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export async function fetchAuditTrail(params?: {
  entityType?: string;
  entityId?: string;
  page?: number;
  size?: number;
  signal?: AbortSignal;
}): Promise<AuditTrailPage> {
  const qs = new URLSearchParams();
  if (params?.entityType) qs.set("entityType", params.entityType);
  if (params?.entityId) qs.set("entityId", params.entityId);
  qs.set("page", String(params?.page ?? 0));
  qs.set("size", String(params?.size ?? 50));
  return javaApi<AuditTrailPage>(`/api/audit-trail?${qs}`, params?.signal ? { signal: params.signal } : {});
}
