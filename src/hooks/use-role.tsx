import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type AppRole = "directeur" | "radiologue";

export type RoleProfile = {
  id: AppRole;
  label: string;
  fonction: string;
  initiales: string;
  nom: string;
  /** Accès à l'export comptable */
  canExportCompta: boolean;
  /** Accès à la validation des anomalies de facturation */
  canValiderAnomalie: boolean;
  /** Accès aux données financières (CA, factures, fraude caisse) */
  canSeeFinance: boolean;
};

export const roleProfiles: Record<AppRole, RoleProfile> = {
  directeur: {
    id: "directeur",
    label: "Directeur (Mr Adnane)",
    fonction: "Direction du centre",
    nom: "Mr Adnane",
    initiales: "MA",
    canExportCompta: true,
    canValiderAnomalie: true,
    canSeeFinance: true,
  },
  radiologue: {
    id: "radiologue",
    label: "Radiologue",
    fonction: "Imagerie & comptes rendus",
    nom: "Dr. Naima Skalli",
    initiales: "NS",
    canExportCompta: false,
    canValiderAnomalie: true,
    canSeeFinance: false,
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
  const value = useMemo(() => ({ role, profile: roleProfiles[role], setRole }), [role]);
  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) {
    return { role: "directeur", profile: roleProfiles.directeur, setRole: () => {} };
  }
  return ctx;
}
