import { javaApi } from "./config";

export type StaffRadiologue = {
  id: string;
  nomComplet: string;
};

export async function fetchRadiologues(signal?: AbortSignal): Promise<StaffRadiologue[]> {
  const rows = await javaApi<StaffRadiologue[]>(
    "/api/staff/radiologues",
    signal ? { signal } : {},
  );
  return rows ?? [];
}
