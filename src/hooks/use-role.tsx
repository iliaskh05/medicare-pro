import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/** Rôles applicatifs du Centre d'Imagerie Médicale. */
export type AppRole = "directeur" | "accueil" | "technicien" | "medecin";

export type RoleProfile = {
  id: AppRole;
  label: string;
  fonction: string;
  initiales: string;
  nom: string;
  /** Accès au module « Détection de Fraude / Analyse IA » — direction uniquement. */
  canSeeFraudModule: boolean;
  /** Accès à l'export comptable */
  canExportCompta: boolean;
  /** Accès à la validation des anomalies de facturation */
  canValiderAnomalie: boolean;
  /** Accès aux données financières (CA, factures, caisse) */
  canSeeFinance: boolean;
};

export const roleProfiles: Record<AppRole, RoleProfile> = {
  directeur: {
    id: "directeur",
    label: "Directeur (Mr Adnane)",
    fonction: "Direction du centre",
    nom: "Mr Adnane",
    initiales: "MA",
    canSeeFraudModule: true,
    canExportCompta: true,
    canValiderAnomalie: true,
    canSeeFinance: true,
  },
  accueil: {
    id: "accueil",
    label: "Accueil",
    fonction: "Accueil & caisse",
    nom: "Souad Bahri",
    initiales: "SB",
    canSeeFraudModule: false,
    canExportCompta: false,
    canValiderAnomalie: false,
    canSeeFinance: true,
  },
  technicien: {
    id: "technicien",
    label: "Technicien",
    fonction: "Manipulateur en imagerie",
    nom: "Hassan El Fassi",
    initiales: "HF",
    canSeeFraudModule: false,
    canExportCompta: false,
    canValiderAnomalie: false,
    canSeeFinance: false,
  },
  medecin: {
    id: "medecin",
    label: "Médecin",
    fonction: "Imagerie & comptes rendus",
    nom: "Dr. Naima Skalli",
    initiales: "NS",
    canSeeFraudModule: false,
    canExportCompta: false,
    canValiderAnomalie: true,
    canSeeFinance: false,
  },
};

const STORAGE_KEY = "radiocrm:role";

/** Utilisateur connecté (fourni par le backend d'authentification). */
export type AppUser = {
  nom: string;
  role: AppRole;
  /** Libellé métier du rôle : "Directeur", "Accueil", "Technicien", "Radiologue". */
  roleLabel: string;
  fonction: string;
  initiales: string;
};

const roleLabels: Record<AppRole, string> = {
  directeur: "Directeur",
  accueil: "Accueil",
  technicien: "Technicien",
  medecin: "Radiologue",
};

type RoleContextValue = {
  role: AppRole;
  profile: RoleProfile;
  user: AppUser;
  setRole: (role: AppRole) => void;
  /** Helper de rendu conditionnel : `hasPermission("canSeeFraudModule")`. */
  hasPermission: (
    permission: "canSeeFraudModule" | "canExportCompta" | "canValiderAnomalie" | "canSeeFinance",
  ) => boolean;
};

function toUser(profile: RoleProfile): AppUser {
  return {
    nom: profile.nom,
    role: profile.id,
    roleLabel: roleLabels[profile.id],
    fonction: profile.fonction,
    initiales: profile.initiales,
  };
}

const RoleContext = createContext<RoleContextValue | null>(null);

function isRole(value: string | null): value is AppRole {
  return value !== null && value in roleProfiles;
}

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<AppRole>("directeur");

  // Le rôle actif provient du backend d'authentification ; en attendant il est
  // conservé côté session pour survivre à la navigation.
  useEffect(() => {
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    if (isRole(stored)) setRole(stored);
  }, []);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, role);
    } catch {
      /* stockage indisponible : le rôle reste en mémoire */
    }
  }, [role]);

  const value = useMemo<RoleContextValue>(() => {
    const profile = roleProfiles[role];
    return {
      role,
      profile,
      user: toUser(profile),
      setRole,
      hasPermission: (permission) => profile[permission],
    };
  }, [role]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) {
    return {
      role: "directeur",
      profile: roleProfiles.directeur,
      user: toUser(roleProfiles.directeur),
      setRole: () => {},
      hasPermission: (permission) => roleProfiles.directeur[permission],
    };
  }
  return ctx;
}

/** Accès direct à l'utilisateur connecté et à son rôle métier. */
export function useUser(): AppUser {
  return useRole().user;
}
