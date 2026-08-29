import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { clearAuthStorage } from "@/lib/auth-session";

import {
  canAccess as rbacCanAccess,
  canCreate as rbacCanCreate,
  canEdit as rbacCanEdit,
  canExport as rbacCanExport,
  canValidate as rbacCanValidate,
  hasPermission as rbacHasPermission,
  normalizeRole,
  type BackendRole,
  type Permission,
  type Resource,
} from "@/lib/rbac";

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
  /** Rôle brut renvoyé par le backend, source des permissions RBAC. */
  backendRole: BackendRole;
  /** Identifiant utilisateur backend (JWT / localStorage), pour la messagerie. */
  userId: string | null;
  /** `can("billing:export")` — voir src/lib/rbac.ts. */
  can: (permission: Permission) => boolean;
  canAccess: (resource: Resource) => boolean;
  canCreate: (resource: Resource) => boolean;
  canEdit: (resource: Resource) => boolean;
  canValidate: (resource: Resource) => boolean;
  canExport: (resource: Resource) => boolean;
  profile: RoleProfile;
  user: AppUser;
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
    case "DIRECTION":
    case "AUDITEUR":
    case "SUPER_ADMIN":
    case "ADMIN":
      return "directeur";
    case "RADIOLOGUE":
      return "medecin";
    case "MANIPULATEUR":
    case "TECHNICIEN":
      return "technicien";
    case "SECRETARIAT":
    case "ACCUEIL":
    case "SECRETAIRE":
    case "CAISSIER":
      return "accueil";
    default:
      return isRole(role.toLowerCase()) ? (role.toLowerCase() as AppRole) : "directeur";
  }
}

/** Rôle UI → rôle backend par défaut (simulateur de rôle / session locale). */
export function uiRoleToBackendRole(role: AppRole): BackendRole {
  switch (role) {
    case "directeur":
      return "DIRECTEUR";
    case "accueil":
      return "ACCUEIL";
    case "technicien":
      return "MANIPULATEUR";
    case "medecin":
      return "RADIOLOGUE";
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
  const [role, setRole] = useState<AppRole>(() => {
    if (typeof window === "undefined") return "directeur";
    const storedUser = readStoredUser();
    if (storedUser?.role) return mapBackendRole(storedUser.role);
    const storedRole = window.sessionStorage.getItem(ROLE_STORAGE_KEY);
    return isRole(storedRole) ? storedRole : "directeur";
  });
  const [backendRole, setBackendRole] = useState<BackendRole>(() => {
    if (typeof window === "undefined") return "DIRECTEUR";
    const storedUser = readStoredUser();
    if (storedUser?.role) return normalizeRole(storedUser.role);
    const storedRole = window.sessionStorage.getItem(ROLE_STORAGE_KEY);
    return isRole(storedRole) ? uiRoleToBackendRole(storedRole) : "DIRECTEUR";
  });
  const [displayName, setDisplayName] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const storedUser = readStoredUser();
    return storedUser?.nomComplet || storedUser?.nom || null;
  });
  const [userId, setUserId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const storedUser = readStoredUser();
    return storedUser?.id != null ? String(storedUser.id) : null;
  });

  useEffect(() => {
    const storedUser = readStoredUser();
    if (storedUser) {
      const mapped = mapBackendRole(storedUser.role);
      setRole(mapped);
      setBackendRole(normalizeRole(storedUser.role));
      setDisplayName(storedUser.nomComplet || storedUser.nom || null);
      setUserId(storedUser.id != null ? String(storedUser.id) : null);
      return;
    }

    const storedRole = window.sessionStorage.getItem(ROLE_STORAGE_KEY);
    if (isRole(storedRole)) {
      setRole(storedRole);
      setBackendRole(uiRoleToBackendRole(storedRole));
    }
  }, []);

  useEffect(() => {
    setBackendRole((current) =>
      mapBackendRole(current) === role ? current : uiRoleToBackendRole(role),
    );
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
      canSeeFraudModule: rbacCanAccess(backendRole, "fraud"),
      canExportCompta:
        base.canExportCompta ||
        rbacCanExport(backendRole, "fraud") ||
        rbacCanExport(backendRole, "billing"),
      canValiderAnomalie:
        base.canValiderAnomalie || rbacCanValidate(backendRole, "fraud"),
    };
    return {
      role,
      backendRole,
      userId,
      profile,
      user: toUser(profile),
      can: (permission) => rbacHasPermission(backendRole, permission),
      canAccess: (resource) => rbacCanAccess(backendRole, resource),
      canCreate: (resource) => rbacCanCreate(backendRole, resource),
      canEdit: (resource) => rbacCanEdit(backendRole, resource),
      canValidate: (resource) => rbacCanValidate(backendRole, resource),
      canExport: (resource) => rbacCanExport(backendRole, resource),
      hasPermission: (permission) => profile[permission],
    };
  }, [role, backendRole, displayName, userId]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) {
    return {
      role: "directeur",
      backendRole: "DIRECTEUR",
      userId: null,
      profile: roleProfiles.directeur,
      user: toUser(roleProfiles.directeur),
      can: (permission) => rbacHasPermission("DIRECTEUR", permission),
      canAccess: (resource) => rbacCanAccess("DIRECTEUR", resource),
      canCreate: (resource) => rbacCanCreate("DIRECTEUR", resource),
      canEdit: (resource) => rbacCanEdit("DIRECTEUR", resource),
      canValidate: (resource) => rbacCanValidate("DIRECTEUR", resource),
      canExport: (resource) => rbacCanExport("DIRECTEUR", resource),
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
  clearAuthStorage();
}
