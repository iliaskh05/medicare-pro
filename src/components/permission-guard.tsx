/**
 * Guards UX (pattern Veto PermissionGuard / WriteGuard).
 * La sécurité réelle reste Spring Security — ces composants ne font que masquer / bloquer l'UI.
 */
import type { ReactNode } from "react";
import { toast } from "sonner";

import { useRole } from "@/hooks/use-role";
import type { Action, Resource } from "@/lib/rbac";
import { canAccess } from "@/lib/rbac";

export function PermissionGuard({
  resource,
  action = "view",
  children,
  fallback = null,
}: {
  resource: Resource;
  action?: Action;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { backendRole } = useRole();
  if (!canAccess(backendRole, resource, action)) return <>{fallback}</>;
  return <>{children}</>;
}

export function WriteGuard({
  resource,
  children,
  fallback = null,
}: {
  resource: Resource;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <PermissionGuard resource={resource} action="edit" fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}

export function useWriteAccess(resource: Resource) {
  const { backendRole } = useRole();
  const canWrite =
    canAccess(backendRole, resource, "edit") || canAccess(backendRole, resource, "create");
  const guardWrite = (fn: () => void) => {
    if (!canWrite) {
      toast.error("Action non autorisée", {
        description: "Votre rôle ne permet pas cette opération.",
      });
      return;
    }
    fn();
  };
  return { canWrite, guardWrite };
}
