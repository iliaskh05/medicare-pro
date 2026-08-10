import type { ComponentType, ReactNode } from "react";

import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="page-title text-2xl sm:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

type Tone = "primary" | "success" | "warning" | "destructive" | "neutral";

const toneClasses: Record<Tone, string> = {
  primary: "bg-primary/10 text-primary ring-primary/20",
  success: "bg-success/12 text-success ring-success/25",
  warning: "bg-warning/15 text-warning-foreground ring-warning/35",
  destructive: "bg-destructive/10 text-destructive ring-destructive/20",
  neutral: "bg-muted text-muted-foreground ring-border",
};

export function Pill({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * État vide : icône encerclée + titre + explication en gris clair.
 * Utilisé pour les tableaux filtrés à zéro résultat et les réponses API vides.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact = false,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "gap-2 px-4 py-8" : "gap-3 px-6 py-14",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-full bg-muted/60 text-muted-foreground/70 ring-1 ring-inset ring-border",
          compact ? "size-10" : "size-14",
        )}
      >
        <Icon className={compact ? "size-5" : "size-6"} />
      </div>
      <p className={cn("font-semibold text-muted-foreground", compact ? "text-sm" : "text-base")}>
        {title}
      </p>
      {description ? (
        <p className="max-w-sm text-xs leading-relaxed text-muted-foreground/70 sm:text-sm">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}

export function IconTile({ children, tone = "primary" }: { children: ReactNode; tone?: Tone }) {
  return (
    <div
      className={cn(
        "flex size-10 items-center justify-center rounded-xl ring-1 ring-inset",
        toneClasses[tone],
      )}
    >
      {children}
    </div>
  );
}

/**
 * Mention obligatoire à afficher au-dessus de tout résultat produit par un modèle
 * (clinique, fraude ou financier) dans ce prototype de démonstration.
 */
export function SimulationNotice({
  contexte = "Résultats générés par un modèle simulé, à partir de données fictives.",
  className,
}: {
  contexte?: string;
  className?: string;
}) {
  return (
    <div
      role="note"
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning-foreground",
        className,
      )}
    >
      <Pill tone="warning" className="text-[10px]">
        Simulation IA
      </Pill>
      <span className="font-medium">{contexte}</span>
      <span className="font-semibold">Validation humaine obligatoire.</span>
    </div>
  );
}
