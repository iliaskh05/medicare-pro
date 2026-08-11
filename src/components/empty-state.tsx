import type { ReactNode } from "react";

/**
 * État vide standard : affiché dès qu'une collection renvoyée par le backend
 * est vide. Aucune donnée n'est inventée côté frontend.
 */
export function EmptyState({
  message = "Aucune donnée disponible",
  icon,
  className = "",
}: {
  message?: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={`flex flex-col items-center justify-center gap-2 px-6 py-14 text-center ${className}`}
    >
      {icon ? <div className="text-muted-foreground/60">{icon}</div> : null}
      <p className="text-sm font-medium text-muted-foreground">{message}</p>
    </div>
  );
}
