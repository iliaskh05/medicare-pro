import { createContext, useContext } from "react";

import type { Patient } from "@/data/mock";
import type { Anomalie, StatutAnomalie } from "@/data/mock-audit";

export type NewPatientInput = {
  nom: string;
  cin: string;
  age: number;
  telephone: string;
  mutuelle: Patient["mutuelle"];
  ville: string;
  dernierExamen: string;
};

export type AppStoreValue = {
  patients: Patient[];
  addPatient: (input: NewPatientInput) => Patient;
  anomalies: Anomalie[];
  setAnomalieStatut: (id: string, statut: StatutAnomalie) => void;
  seuil: number;
  setSeuil: (value: number) => void;
  /** Dossiers non traités au-dessus du seuil « élevé ». */
  alertesEnAttente: Anomalie[];
  fraudesConfirmees: Anomalie[];
  /** Écart cumulé au barème sur les dossiers non traités. */
  montantEnJeu: number;
  /** Les 3 dossiers non traités les plus risqués (widget tableau de bord). */
  urgences: Anomalie[];
};

export const AppStoreContext = createContext<AppStoreValue | null>(null);

export function useAppStore(): AppStoreValue {
  const store = useContext(AppStoreContext);
  if (!store) throw new Error("useAppStore doit être utilisé dans <AppStoreProvider>");
  return store;
}
