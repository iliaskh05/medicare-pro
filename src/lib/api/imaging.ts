import type { ClusterSignal, PredictionFraude, Scan } from "@/types/imaging";

import { javaApi, mlApi } from "./config";

/** GET {JAVA_API_BASE}/api/imagerie/scans */
export async function fetchScans(signal?: AbortSignal): Promise<Scan[]> {
  const rows = await javaApi<Scan[]>("/api/imagerie/scans", signal ? { signal } : {});
  return rows ?? [];
}

/** GET {ML_API_BASE}/fraud/clusters */
export async function fetchClusters(signal?: AbortSignal): Promise<ClusterSignal[]> {
  const rows = await mlApi<ClusterSignal[]>("/fraud/clusters", signal ? { signal } : {});
  return rows ?? [];
}

/** GET {ML_API_BASE}/fraud/predictions */
export async function fetchPredictionsFraude(signal?: AbortSignal): Promise<PredictionFraude[]> {
  const rows = await mlApi<PredictionFraude[]>("/fraud/predictions", signal ? { signal } : {});
  return rows ?? [];
}
