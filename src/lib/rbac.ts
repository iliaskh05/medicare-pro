/**
 * RBAC frontend centralisé.
 *
 * ⚠️ Le masquage d'un bouton n'est PAS une sécurité : le backend Spring Boot
 * reste seul responsable de l'autorisation réelle (403 sur endpoint protégé).
 * Cette couche sert uniquement à ne pas proposer d'action impossible.
 */

/** Rôles métier renvoyés par le backend (`AuthResponse.utilisateur.role`). */
export type BackendRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "DIRECTION"
  | "DIRECTEUR"
  | "ACCUEIL"
  | "SECRETAIRE"
  | "RADIOLOGUE"
  | "MANIPULATEUR"
  | "TECHNICIEN"
  | "CAISSIER"
  | "COMPTABLE"
  | "AUDITEUR";

/** Domaines fonctionnels de l'application. */
export type Resource =
  | "patients"
  | "appointments"
  | "waiting-room"
  | "worklist"
  | "imaging"
  | "reports"
  | "billing"
  | "doctors"
  | "dashboard"
  | "fraud"
  | "settings"
  | "messaging";

export type Action = "view" | "create" | "edit" | "validate" | "delete" | "export";

export type Permission = `${Resource}:${Action}`;

const ALL: Resource[] = [
  "patients",
  "appointments",
  "waiting-room",
  "worklist",
  "imaging",
  "reports",
  "billing",
  "doctors",
  "dashboard",
  "fraud",
  "settings",
  "messaging",
];

function grant(resources: Resource[], actions: Action[]): Permission[] {
  return resources.flatMap((r) => actions.map((a) => `${r}:${a}` as Permission));
}

const FULL: Action[] = ["view", "create", "edit", "validate", "delete", "export"];

/**
 * Matrice de permissions. Elle doit rester alignée sur les règles
 * `@PreAuthorize` du backend — toute divergence est un bug.
 */
const MATRIX: Record<BackendRole, Permission[]> = {
  SUPER_ADMIN: grant(ALL, FULL),
  ADMIN: grant(ALL, FULL),
  DIRECTION: [
    ...grant(ALL, ["view", "export"]),
    ...grant(["fraud"], ["validate", "edit"]),
    ...grant(["doctors"], ["create", "edit"]),
  ],
  DIRECTEUR: [
    ...grant(ALL, ["view", "export"]),
    ...grant(["fraud"], ["validate", "edit"]),
    ...grant(["doctors"], ["create", "edit"]),
  ],
  ACCUEIL: [
    ...grant(
      ["patients", "appointments", "waiting-room", "worklist", "doctors", "messaging", "settings"],
      ["view"],
    ),
    ...grant(["patients", "appointments", "waiting-room"], ["create", "edit"]),
    ...grant(["billing"], ["view", "create"]),
  ],
  SECRETAIRE: [
    ...grant(
      ["patients", "appointments", "waiting-room", "worklist", "doctors", "messaging", "settings"],
      ["view"],
    ),
    ...grant(["patients", "appointments"], ["create", "edit"]),
    ...grant(["billing"], ["view"]),
  ],
  RADIOLOGUE: [
    ...grant(
      ["patients", "worklist", "waiting-room", "imaging", "reports", "messaging", "settings"],
      ["view"],
    ),
    ...grant(["reports"], ["create", "edit", "validate", "export"]),
    ...grant(["imaging"], ["edit"]),
  ],
  MANIPULATEUR: [
    ...grant(
      ["patients", "worklist", "waiting-room", "imaging", "messaging", "settings"],
      ["view"],
    ),
    ...grant(["worklist", "waiting-room"], ["edit"]),
    ...grant(["imaging"], ["create", "edit"]),
  ],
  TECHNICIEN: [
    ...grant(
      ["patients", "worklist", "waiting-room", "imaging", "messaging", "settings"],
      ["view"],
    ),
    ...grant(["worklist", "waiting-room"], ["edit"]),
    ...grant(["imaging"], ["create", "edit"]),
  ],
  CAISSIER: [
    ...grant(["patients", "waiting-room", "billing", "messaging", "settings"], ["view"]),
    ...grant(["billing"], ["create", "edit"]),
  ],
  COMPTABLE: [
    ...grant(["billing", "dashboard", "patients", "settings"], ["view"]),
    ...grant(["billing", "dashboard"], ["export"]),
  ],
  AUDITEUR: [
    ...grant(["billing", "dashboard", "fraud", "patients", "reports", "settings"], ["view"]),
    ...grant(["fraud"], ["edit", "validate"]),
    ...grant(["fraud", "billing"], ["export"]),
  ],
};

/** Normalise une valeur de rôle libre vers un rôle connu (fallback le plus restrictif). */
export function normalizeRole(role: string | null | undefined): BackendRole {
  const upper = (role ?? "").toUpperCase();
  return (upper in MATRIX ? upper : "SECRETAIRE") as BackendRole;
}

export function permissionsOf(role: string | null | undefined): ReadonlySet<Permission> {
  return new Set(MATRIX[normalizeRole(role)]);
}

export function hasPermission(role: string | null | undefined, permission: Permission): boolean {
  return permissionsOf(role).has(permission);
}

/** L'utilisateur peut-il ouvrir cet écran ? */
export function canAccess(role: string | null | undefined, resource: Resource): boolean {
  return hasPermission(role, `${resource}:view`);
}

export function canEdit(role: string | null | undefined, resource: Resource): boolean {
  return hasPermission(role, `${resource}:edit`);
}

export function canCreate(role: string | null | undefined, resource: Resource): boolean {
  return hasPermission(role, `${resource}:create`);
}

export function canValidate(role: string | null | undefined, resource: Resource): boolean {
  return hasPermission(role, `${resource}:validate`);
}

export function canExport(role: string | null | undefined, resource: Resource): boolean {
  return hasPermission(role, `${resource}:export`);
}
