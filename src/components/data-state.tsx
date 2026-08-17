import { AlertTriangle, Inbox, Lock, RefreshCw, WifiOff } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { FriendlyError } from "@/lib/api/errors";
import type { ResourceStatus } from "@/hooks/use-api-resource";

/** Squelette de chargement homogène (listes, tableaux, cartes). */
export function LoadingState({ rows = 4, label = "Chargement…" }: { rows?: number; label?: string }) {
  return (
    <div className="space-y-2 p-6" role="status" aria-live="polite" aria-busy>
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-full" />
      ))}
    </div>
  );
}

/** État vide : la donnée existe côté backend mais la collection est vide. */
export function NoDataState({
  title = "Aucune donnée",
  description = "Aucun enregistrement ne correspond à ces critères.",
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center"
    >
      <Inbox className="size-6 text-muted-foreground/60" aria-hidden />
      <p className="text-sm font-semibold">{title}</p>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}

/** État d'erreur lisible : jamais de stack trace, jamais de statut brut seul. */
export function ErrorState({ error, onRetry }: { error: FriendlyError; onRetry?: () => void }) {
  const Icon =
    error.kind === "network" || error.kind === "timeout"
      ? WifiOff
      : error.kind === "forbidden" || error.kind === "unauthorized"
        ? Lock
        : AlertTriangle;

  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center"
    >
      <Icon className="size-6 text-destructive" aria-hidden />
      <p className="text-sm font-semibold">{error.title}</p>
      <p className="max-w-md text-sm text-muted-foreground">{error.message}</p>
      {error.retryable && onRetry ? (
        <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
          <RefreshCw className="mr-1.5 size-4" aria-hidden /> Réessayer
        </Button>
      ) : null}
    </div>
  );
}

/**
 * Aiguillage unique loading / error / empty / contenu.
 * À utiliser pour tout écran alimenté par le backend.
 */
export function DataState({
  status,
  error,
  onRetry,
  children,
  emptyTitle,
  emptyDescription,
  emptyAction,
  skeletonRows,
}: {
  status: ResourceStatus;
  error: FriendlyError | null;
  onRetry?: () => void;
  children: ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  skeletonRows?: number;
}) {
  if (status === "loading") return <LoadingState {...(skeletonRows ? { rows: skeletonRows } : {})} />;
  if (status === "error" && error)
    return <ErrorState error={error} {...(onRetry ? { onRetry } : {})} />;
  if (status === "empty")
    return (
      <NoDataState
        {...(emptyTitle ? { title: emptyTitle } : {})}
        {...(emptyDescription ? { description: emptyDescription } : {})}
        {...(emptyAction ? { action: emptyAction } : {})}
      />
    );
  return <>{children}</>;
}

/** Ligne d'information « dernière mise à jour » pour les dashboards. */
export function LastUpdated({ at }: { at: Date | null }) {
  if (!at) return null;
  return (
    <p className="text-xs text-muted-foreground">
      Dernière mise à jour&nbsp;:{" "}
      {at.toLocaleTimeString("fr-MA", { hour: "2-digit", minute: "2-digit" })}
    </p>
  );
}
