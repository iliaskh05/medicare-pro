import type { ComponentType, ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/* =========================================================================
 * Kit de composants MediCare Pro
 * Hiérarchie : eyebrow → titre → sous-titre → actions.
 * Profondeur créée par l'espacement et les bordures, jamais par des ombres lourdes.
 * ========================================================================= */

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
  meta,
  className,
}: {
  title: string;
  subtitle?: string;
  /** Contexte discret au-dessus du titre (module, périmètre). */
  eyebrow?: string;
  actions?: ReactNode;
  /** Ligne de métadonnées sous le sous-titre (date, compteurs, statut). */
  meta?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("border-b border-border pb-5", className)}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h1 className={cn("page-title text-xl sm:text-[1.6rem]", eyebrow && "mt-1")}>{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {meta ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 meta-text">{meta}</div>
      ) : null}
    </div>
  );
}

export type Tone = "primary" | "success" | "warning" | "destructive" | "info" | "neutral";

const toneClasses: Record<Tone, string> = {
  primary: "bg-primary/10 text-primary ring-primary/20",
  success: "bg-success/12 text-success ring-success/25",
  warning: "bg-warning/16 text-warning-foreground ring-warning/35",
  destructive: "bg-destructive/10 text-destructive ring-destructive/22",
  info: "bg-info/12 text-info ring-info/25",
  neutral: "bg-muted text-muted-foreground ring-border",
};

const dotClasses: Record<Tone, string> = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  info: "bg-info",
  neutral: "bg-muted-foreground/60",
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
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Badge de statut avec point de couleur : lecture immédiate dans une table dense. */
export function StatusBadge({
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
        "inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-card px-2 py-0.5 text-xs font-semibold text-foreground",
        className,
      )}
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", dotClasses[tone])} aria-hidden />
      {children}
    </span>
  );
}

/**
 * Indicateur clé. `value` vaut `null` quand l'API ne fournit pas la donnée :
 * on affiche alors « Non disponible » plutôt qu'un chiffre inventé.
 */
export function KpiStat({
  label,
  value,
  icon: Icon,
  tone = "primary",
  context,
  emphasis = false,
  className,
}: {
  label: string;
  value: string | number | null | undefined;
  icon?: ComponentType<{ className?: string }>;
  tone?: Tone;
  /** Précision factuelle (période, périmètre) — jamais une évolution inventée. */
  context?: ReactNode;
  /** KPI principal : valeur plus grande, fond légèrement teinté. */
  emphasis?: boolean;
  className?: string;
}) {
  const available = value !== null && value !== undefined && value !== "";

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col justify-between gap-3 p-4 sm:p-5",
        emphasis && "bg-primary-soft/60",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-xs font-semibold uppercase tracking-[0.07em] text-muted-foreground">
          {label}
        </p>
        {Icon ? (
          <span
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-md ring-1 ring-inset",
              toneClasses[tone],
            )}
            aria-hidden
          >
            <Icon className="size-4" />
          </span>
        ) : null}
      </div>
      <div className="min-w-0">
        {available ? (
          <p className={cn("kpi-value truncate", emphasis ? "text-3xl" : "text-2xl")}>{value}</p>
        ) : (
          <p className="text-base font-semibold text-muted-foreground/70">Non disponible</p>
        )}
        {context ? <p className="mt-1 meta-text">{context}</p> : null}
      </div>
    </div>
  );
}

/** Grille de KPI : une seule surface segmentée, plus élégante que N cartes identiques. */
export function KpiGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "panel grid overflow-hidden divide-y divide-border sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4",
        "[&>*]:border-border sm:[&>*+*]:border-l",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Section de contenu : en-tête sobre + corps. Remplace les cartes flottantes. */
export function SectionCard({
  title,
  description,
  actions,
  children,
  icon: Icon,
  footer,
  bodyClassName,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  footer?: ReactNode;
  bodyClassName?: string;
  className?: string;
}) {
  return (
    <section className={cn("panel flex min-w-0 flex-col overflow-hidden", className)}>
      <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-start gap-2.5">
          {Icon ? <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden /> : null}
          <div className="min-w-0">
            <h2 className="section-title truncate">{title}</h2>
            {description ? <p className="mt-0.5 meta-text">{description}</p> : null}
          </div>
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </header>
      <div className={cn("min-w-0 flex-1 p-4 sm:p-5", bodyClassName)}>{children}</div>
      {footer ? (
        <footer className="border-t border-border px-4 py-2.5 sm:px-5">{footer}</footer>
      ) : null}
    </section>
  );
}

/** Barre d'outils de liste : recherche à gauche, filtres à droite. */
export function Toolbar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "toolbar-surface flex flex-wrap items-center gap-2 px-3 py-2.5 sm:px-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * État vide : icône discrète + explication + action éventuelle.
 * Jamais d'espace vide sans message.
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
        compact ? "gap-2 px-4 py-8" : "gap-2.5 px-6 py-12",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-lg bg-muted text-muted-foreground/70 ring-1 ring-inset ring-border",
          compact ? "size-9" : "size-11",
        )}
      >
        <Icon className={compact ? "size-4" : "size-5"} />
      </div>
      <p className={cn("font-semibold", compact ? "text-sm" : "text-[0.95rem]")}>{title}</p>
      {description ? (
        <p className="max-w-sm text-xs leading-relaxed text-muted-foreground sm:text-sm">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-1.5">{action}</div> : null}
    </div>
  );
}

export function IconTile({
  children,
  tone = "primary",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Squelette de table calqué sur la structure réelle des lignes. */
export function TableSkeleton({ rows = 6, columns = 6 }: { rows?: number; columns?: number }) {
  return (
    <div className="divide-y divide-border" role="status" aria-busy aria-live="polite">
      <span className="sr-only">Chargement des données…</span>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="grid items-center gap-4 px-4 py-3"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columns }).map((_, c) => (
            <div key={c} className="min-w-0 space-y-1.5">
              <Skeleton className={cn("h-3.5", c === 1 ? "w-4/5" : "w-3/5")} />
              {c === 1 ? <Skeleton className="h-2.5 w-2/5" /> : null}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Squelette de grille de KPI. */
export function KpiSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="panel grid overflow-hidden divide-y divide-border sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 sm:[&>*+*]:border-l [&>*]:border-border">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="size-7 rounded-md" />
          </div>
          <Skeleton className="h-7 w-24" />
        </div>
      ))}
    </div>
  );
}

/**
 * Mention obligatoire au-dessus de tout résultat produit par un modèle
 * d'aide à la décision (clinique, fraude ou financier).
 */
export function AiNotice({
  contexte = "Résultats produits par le moteur d'analyse automatique du centre.",
  className,
}: {
  contexte?: string;
  className?: string;
}) {
  return (
    <div
      role="note"
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning-foreground",
        className,
      )}
    >
      <Pill tone="warning" className="text-[10px]">
        Analyse IA
      </Pill>
      <span className="font-medium">{contexte}</span>
      <span className="font-semibold">Validation humaine obligatoire.</span>
    </div>
  );
}

/**
 * Notice discrète affichée lorsqu'un service backend n'est pas encore joignable.
 * L'interface reste complète : seules les données sont en attente.
 */
export function ServiceNotice({
  message = "Service de données en attente de connexion.",
  onRetry,
  className,
}: {
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-border bg-muted/40 px-4 py-3",
        className,
      )}
    >
      <p className="min-w-0 flex-1 text-xs text-muted-foreground sm:text-sm">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10"
        >
          Réessayer
        </button>
      ) : null}
    </div>
  );
}

/** Alias compat — pages legacy (accueil, admission, etc.). */
export function Surface({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("panel", className)}>{children}</div>;
}

export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-4">
      <div className="min-w-0">
        <h2 className="section-title">{title}</h2>
        {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  hint,
  icon,
  tone = "primary",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon: ComponentType<{ className?: string }>;
  tone?: Tone;
}) {
  const normalized =
    value === null || value === undefined
      ? null
      : typeof value === "string" || typeof value === "number"
        ? value
        : String(value);
  return (
    <div className="panel">
      <KpiStat label={label} value={normalized} icon={icon} tone={tone} context={hint} />
    </div>
  );
}
