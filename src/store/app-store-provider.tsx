import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { patients as patientsSeed, type Patient } from "@/types/domain";
import { anomalies as anomaliesSeed, type Anomalie, type StatutAnomalie } from "@/types/audit";
import { RISK_THRESHOLDS, scoreAnomalies } from "@/utils/anomalyDetection";
import { AppStoreContext, type AppStoreValue, type NewPatientInput } from "@/store/app-store";

/**
 * Store applicatif léger (Context + sessionStorage).
 * Les dossiers scorés et les patients créés survivent à la navigation entre les
 * routes, ce qui rend visibles les décisions d'audit sur le tableau de bord.
 */
const STORAGE_KEY = "radiocrm:app-store:v1";

type PersistedState = {
  patients: Patient[];
  statuts: Record<string, StatutAnomalie>;
  seuil: number;
};

function readPersisted(): PersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PersistedState) : null;
  } catch {
    return null;
  }
}

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [patients, setPatients] = useState<Patient[]>(patientsSeed);
  const [anomalies, setAnomalies] = useState<Anomalie[]>(() => scoreAnomalies(anomaliesSeed));
  const [seuil, setSeuil] = useState<number>(RISK_THRESHOLDS.eleve);
  const [hydrated, setHydrated] = useState(false);

  // Réhydratation après montage : évite tout écart avec le rendu serveur.
  useEffect(() => {
    const persisted = readPersisted();
    if (persisted) {
      if (persisted.patients?.length) setPatients(persisted.patients);
      if (typeof persisted.seuil === "number") setSeuil(persisted.seuil);
      if (persisted.statuts) {
        setAnomalies((prev) =>
          prev.map((a) => {
            const statut = persisted.statuts[a.id];
            return statut ? { ...a, statut } : a;
          }),
        );
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    const statuts = Object.fromEntries(anomalies.map((a) => [a.id, a.statut]));
    try {
      window.sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ patients, statuts, seuil } satisfies PersistedState),
      );
    } catch {
      // quota indisponible (navigation privée) : le store reste en mémoire
    }
  }, [hydrated, patients, anomalies, seuil]);

  const addPatient = useCallback((input: NewPatientInput) => {
    const created: Patient = {
      ...input,
      id: `PAT-${1056 + Math.floor(Math.random() * 900)}`,
    };
    setPatients((prev) => [created, ...prev]);
    return created;
  }, []);

  const setAnomalieStatut = useCallback((id: string, statut: StatutAnomalie) => {
    setAnomalies((prev) => prev.map((a) => (a.id === id ? { ...a, statut } : a)));
  }, []);

  const value = useMemo<AppStoreValue>(() => {
    const alertesEnAttente = anomalies.filter(
      (a) => a.statut === "pending" && a.score > RISK_THRESHOLDS.eleve,
    );
    return {
      patients,
      addPatient,
      anomalies,
      setAnomalieStatut,
      seuil,
      setSeuil,
      alertesEnAttente,
      fraudesConfirmees: anomalies.filter((a) => a.statut === "confirmed"),
      montantEnJeu: alertesEnAttente.reduce((sum, a) => sum + Math.max(0, a.montant - a.bareme), 0),
      urgences: [...alertesEnAttente].sort((a, b) => b.score - a.score).slice(0, 3),
    };
  }, [patients, addPatient, anomalies, setAnomalieStatut, seuil]);

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}
