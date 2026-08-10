import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type AppRole = "directeur" | "radiologue" | "secretaire";

export type RoleProfile = {
  id: AppRole;
  label: string;
  fonction: string;
  initiales: string;
  nom: string;
  /** Accès à l'export comptable / EFIBEC */
  canExportCompta: boolean;
  /** Accès à la validation des anomalies de facturation */
  canValiderAnomalie: boolean;
};

export const roleProfiles: Record<AppRole, RoleProfile> = {
  directeur: {
    id: "directeur",
    label: "Directeur (Admin)",
    fonction: "Direction du centre",
    nom: "Dr. Yassine Alaoui",
    initiales: "YA",
    canExportCompta: true,
    canValiderAnomalie: true,
  },
  radiologue: {
    id: "radiologue",
    label: "Radiologue",
    fonction: "Imagerie & comptes rendus",
    nom: "Dr. Naima Skalli",
    initiales: "NS",
    canExportCompta: false,
    canValiderAnomalie: true,
  },
  secretaire: {
    id: "secretaire",
    label: "Secrétaire Médicale",
    fonction: "Accueil & planning",
    nom: "Souad Bahri",
    initiales: "SB",
    canExportCompta: false,
    canValiderAnomalie: false,
  },
};

type RoleContextValue = {
  role: AppRole;
  profile: RoleProfile;
  setRole: (role: AppRole) => void;
};

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<AppRole>("directeur");
  const value = useMemo(
    () => ({ role, profile: roleProfiles[role], setRole }),
    [role],
  );
  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) {
    return { role: "directeur", profile: roleProfiles.directeur, setRole: () => {} };
  }
  return ctx;
}
