import type {
  Alerte,
  Medecin,
  PlanningSlot,
  SalleAttente,
  SyntheseComptable,
  UrgenceFraude,
} from "@/types/domain";

import { api } from "./client";
import { javaApi } from "./config";

export type DashboardKpis = {
  patientsDuJour: number;
  actesRealises: number;
  chiffreAffaires: number;
  tauxOccupation: number;
};

export type DashboardRepartitionStatuts = {
  "En attente": number;
  "En cours": number;
  Terminé: number;
  [key: string]: number;
};

/** Réponse de GET /api/dashboard/stats */
export type DashboardStats = {
  totalExamens: number;
  examensAujourdhui: number;
  repartitionStatuts: DashboardRepartitionStatuts;
  revenusEstimes: number;
};

export const EMPTY_DASHBOARD_STATS: DashboardStats = {
  totalExamens: 0,
  examensAujourdhui: 0,
  repartitionStatuts: {
    "En attente": 0,
    "En cours": 0,
    Terminé: 0,
  },
  revenusEstimes: 0,
};

export const EMPTY_DASHBOARD_KPIS: DashboardKpis = {
  patientsDuJour: 0,
  actesRealises: 0,
  chiffreAffaires: 0,
  tauxOccupation: 0,
};

export const EMPTY_COMPTABILITE: SyntheseComptable = {
  validated: 0,
  pending: 0,
  lastExport: null,
};

/** GET {JAVA_API_BASE}/api/dashboard/stats — métriques réelles (JWT). */
export async function fetchDashboardStats(signal?: AbortSignal): Promise<DashboardStats> {
  const raw = await api.get<
    Partial<DashboardStats> & {
      revenusEstimes?: number | string;
      repartitionStatuts?: Record<string, number>;
    }
  >("/api/dashboard/stats", signal ? { signal } : {});

  const repartition = raw?.repartitionStatuts ?? {};
  return {
    totalExamens: Number(raw?.totalExamens ?? 0),
    examensAujourdhui: Number(raw?.examensAujourdhui ?? 0),
    repartitionStatuts: {
      "En attente": Number(repartition["En attente"] ?? 0),
      "En cours": Number(repartition["En cours"] ?? 0),
      Terminé: Number(repartition["Terminé"] ?? 0),
    },
    revenusEstimes: Number(raw?.revenusEstimes ?? 0),
  };
}

/** GET {JAVA_API_BASE}/api/dashboard/kpis */
export async function fetchDashboardKpis(signal?: AbortSignal): Promise<DashboardKpis> {
  const kpis = await javaApi<DashboardKpis>("/api/dashboard/kpis", signal ? { signal } : {});
  return kpis ?? EMPTY_DASHBOARD_KPIS;
}

/** GET {JAVA_API_BASE}/api/salle-attente */
export async function fetchSalleAttente(signal?: AbortSignal): Promise<SalleAttente[]> {
  const rows = await javaApi<SalleAttente[]>("/api/salle-attente", signal ? { signal } : {});
  return rows ?? [];
}

/** GET {JAVA_API_BASE}/api/planning/tension */
export async function fetchPlanningTension(signal?: AbortSignal): Promise<PlanningSlot[]> {
  const rows = await javaApi<PlanningSlot[]>("/api/planning/tension", signal ? { signal } : {});
  return rows ?? [];
}

/** GET {JAVA_API_BASE}/api/audit/urgences */
export async function fetchUrgencesFraude(signal?: AbortSignal): Promise<UrgenceFraude[]> {
  const rows = await javaApi<UrgenceFraude[]>("/api/audit/urgences", signal ? { signal } : {});
  return rows ?? [];
}

/** GET {JAVA_API_BASE}/api/alertes */
export async function fetchAlertes(signal?: AbortSignal): Promise<Alerte[]> {
  const rows = await javaApi<Alerte[]>("/api/alertes", signal ? { signal } : {});
  return rows ?? [];
}

/** GET {JAVA_API_BASE}/api/comptabilite/synthese */
export async function fetchSyntheseComptable(signal?: AbortSignal): Promise<SyntheseComptable> {
  const data = await javaApi<SyntheseComptable>(
    "/api/comptabilite/synthese",
    signal ? { signal } : {},
  );
  return data ?? EMPTY_COMPTABILITE;
}

/** GET {JAVA_API_BASE}/api/medecins/prescripteurs */
export async function fetchPrescripteurs(signal?: AbortSignal): Promise<Medecin[]> {
  const rows = await javaApi<Medecin[]>("/api/medecins/prescripteurs", signal ? { signal } : {});
  return rows ?? [];
}
