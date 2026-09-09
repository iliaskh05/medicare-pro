/** Canonical backend roles — the only ones Spring issues. */
export type CanonicalRole = "DIRECTEUR" | "RADIOLOGUE" | "MANIPULATEUR" | "SECRETARIAT";

/** Alias historically stored in UI / old tokens. Mapped explicitly — never guessed. */
export type BackendRole = CanonicalRole | "UNKNOWN";

const ALIASES: Record<string, CanonicalRole> = {
  DIRECTEUR: "DIRECTEUR",
  DIRECTION: "DIRECTEUR",
  SUPER_ADMIN: "DIRECTEUR",
  ADMIN: "DIRECTEUR",
  RADIOLOGUE: "RADIOLOGUE",
  MANIPULATEUR: "MANIPULATEUR",
  TECHNICIEN: "MANIPULATEUR",
  SECRETARIAT: "SECRETARIAT",
  ACCUEIL: "SECRETARIAT",
  SECRETAIRE: "SECRETARIAT",
  CAISSIER: "SECRETARIAT",
};

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
 * Must stay aligned with PermissionCatalog.java.
 * Unknown roles receive an empty set — never a silent fallback to SECRETARIAT.
 */
const MATRIX: Record<CanonicalRole, Permission[]> = {
  DIRECTEUR: grant(ALL, FULL),
  RADIOLOGUE: [
    ...grant(
      ["patients", "worklist", "waiting-room", "imaging", "reports", "messaging", "dashboard", "doctors"],
      ["view"],
    ),
    ...grant(["reports"], ["create", "edit", "validate", "export"]),
    ...grant(["worklist", "imaging"], ["edit"]),
    ...grant(["messaging"], ["create", "edit"]),
  ],
  MANIPULATEUR: [
    ...grant(
      ["patients", "worklist", "waiting-room", "imaging", "messaging", "dashboard", "appointments"],
      ["view"],
    ),
    ...grant(["worklist", "waiting-room", "imaging"], ["edit"]),
    ...grant(["messaging"], ["create", "edit"]),
  ],
  SECRETARIAT: [
    ...grant(
      [
        "patients",
        "appointments",
        "waiting-room",
        "worklist",
        "doctors",
        "messaging",
        "dashboard",
        "billing",
        "settings",
      ],
      ["view"],
    ),
    ...grant(["patients", "appointments", "waiting-room", "billing"], ["create", "edit"]),
    ...grant(["messaging"], ["create", "edit"]),
    ...grant(["billing"], ["export"]),
  ],
};

/** Explicit alias map. Unknown → null (deny). */
export function canonicalizeRole(role: string | null | undefined): CanonicalRole | null {
  if (!role) return null;
  const upper = role.trim().toUpperCase();
  return ALIASES[upper] ?? null;
}

/** @deprecated use canonicalizeRole. Kept so existing callers compile. */
export function normalizeRole(role: string | null | undefined): BackendRole {
  return canonicalizeRole(role) ?? "UNKNOWN";
}

export function permissionsOf(role: string | null | undefined): ReadonlySet<Permission> {
  const canonical = canonicalizeRole(role);
  if (!canonical) return new Set();
  return new Set(MATRIX[canonical]);
}

export function hasPermission(role: string | null | undefined, permission: Permission): boolean {
  return permissionsOf(role).has(permission);
}

export function canAccess(
  role: string | null | undefined,
  resource: Resource,
  action: Action = "view",
): boolean {
  return hasPermission(role, `${resource}:${action}`);
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
