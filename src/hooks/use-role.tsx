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
    label: "Directeur",
    fonction: "Direction du centre",
    nom: "Directeur",
    initiales: "DI",
    canSeeFraudModule: true,
    canExportCompta: true,
    canValiderAnomalie: true,
    canSeeFinance: true,
  },
  accueil: {
    id: "accueil",
    label: "Secrétariat",
    fonction: "Accueil & caisse",
    nom: "Secrétariat",
    initiales: "SE",
    canSeeFraudModule: false,
    canExportCompta: false,
    canValiderAnomalie: false,
    canSeeFinance: true,
  },
  technicien: {
    id: "technicien",
    label: "Manipulateur",
    fonction: "Manipulateur en imagerie",
    nom: "Manipulateur",
    initiales: "MA",
    canSeeFraudModule: false,
    canExportCompta: false,
    canValiderAnomalie: false,
    canSeeFinance: false,
  },
  medecin: {
    id: "medecin",
    label: "Radiologue",
    fonction: "Imagerie & comptes rendus",
    nom: "Radiologue",
    initiales: "RA",
    canSeeFraudModule: false,
    canExportCompta: false,
    canValiderAnomalie: true,
    canSeeFinance: false,
  },
};

const ROLE_STORAGE_KEY = "radiocrm:role";
const USER_STORAGE_KEY = "radiocrm:user";

/** Utilisateur connecté (fourni par le backend d'authentification). */
export type AppUser = {
  nom: string;
  role: AppRole;
  /** Libellé métier du rôle : "Directeur", "Accueil", "Technicien", "Radiologue". */
  roleLabel: string;
  fonction: string;
  initiales: string;
};

type StoredAuthUser = {
  id?: number | string;
  nom?: string;
  nomComplet?: string;
  role?: string;
};

const roleLabels: Record<AppRole, string> = {
  directeur: "Directeur",
  accueil: "Secrétariat",
  technicien: "Manipulateur",
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

function isRole(value: string | null): value is AppRole {
  return value !== null && value in roleProfiles;
}

/** Mappe les rôles Spring Boot vers les rôles UI. */
export function mapBackendRole(role: string | null | undefined): AppRole {
  if (!role) return "directeur";
  switch (role.toUpperCase()) {
    case "DIRECTEUR":
      return "directeur";
    case "RADIOLOGUE":
      return "medecin";
    case "MANIPULATEUR":
      return "technicien";
    case "SECRETARIAT":
      return "accueil";
    default:
      return isRole(role.toLowerCase()) ? (role.toLowerCase() as AppRole) : "directeur";
  }
}

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function readStoredUser(): StoredAuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredAuthUser;
  } catch {
    return null;
  }
}

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

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<AppRole>("directeur");
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = readStoredUser();
    if (storedUser) {
      const mapped = mapBackendRole(storedUser.role);
      setRole(mapped);
      setDisplayName(storedUser.nomComplet || storedUser.nom || null);
      return;
    }

    const storedRole = window.sessionStorage.getItem(ROLE_STORAGE_KEY);
    if (isRole(storedRole)) setRole(storedRole);
  }, []);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(ROLE_STORAGE_KEY, role);
    } catch {
      /* stockage indisponible : le rôle reste en mémoire */
    }
  }, [role]);

  const value = useMemo<RoleContextValue>(() => {
    const base = roleProfiles[role];
    const nom = displayName?.trim() || base.nom;
    const profile: RoleProfile = {
      ...base,
      nom,
      label: roleLabels[role],
      initiales: initialsFrom(nom),
    };
    return {
      role,
      profile,
      user: toUser(profile),
      setRole,
      hasPermission: (permission) => profile[permission],
    };
  }, [role, displayName]);

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

/** Efface la session locale (token + profil). */
export function clearAuthSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("radiocrm:token");
  window.localStorage.removeItem("radiocrm:user");
  window.sessionStorage.removeItem("radiocrm:token");
  window.sessionStorage.removeItem(ROLE_STORAGE_KEY);
}
