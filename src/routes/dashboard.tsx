import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CalendarPlus,
  Clock,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Footprints,
  RefreshCw,
  ScanLine,
  ShieldAlert,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRole } from "@/hooks/use-role";
import { CaisseFraudAlert } from "@/components/fraude/caisse-alert";
import { ActionButton } from "@/components/action-button";
import { EmptyState, KpiCard, Pill, SectionHeader } from "@/components/ui-kit";
import { javaApi } from "@/lib/api/config";
import {
  fetchDashboardKpis,
  fetchDashboardStats,
  fetchSalleAttente,
  fetchPlanningTension,
  fetchUrgencesFraude,
  fetchAlertes,
  fetchSyntheseComptable,
  EMPTY_DASHBOARD_KPIS,
  EMPTY_DASHBOARD_STATS,
  EMPTY_COMPTABILITE,
  type DashboardKpis,
  type DashboardStats,
} from "@/lib/api/dashboard";
import {
  formatMAD,
  type Alerte,
  type PlanningSlot,
  type SalleAttente,
  type SyntheseComptable,
  type UrgenceFraude,
} from "@/types/domain";
import scannerHero from "@/assets/ct-scanner.jpg";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Tableau de bord — RadioCRM" },
      {
        name: "description",
        content:
          "Cockpit du centre d'imagerie : patients du jour, examens, comptes rendus et alertes opérationnelles.",
      },
    ],
  }),
  component: Dashboard,
});

const statutTone = {
  "En cours": "primary",
  Préparation: "warning",
  "En attente": "neutral",
} as const;

const niveauTone = { critique: "destructive", eleve: "warning", moyen: "neutral" } as const;
const niveauLabel = { critique: "Critique", eleve: "Élevé", moyen: "Moyen" } as const;

const slotOrder: ("Matin" | "Midi" | "Après-midi")[] = ["Matin", "Midi", "Après-midi"];
const levelClass: Record<PlanningSlot["level"], string> = {
  libre: "bg-muted hover:bg-muted",
  occupé: "bg-primary/35 hover:bg-primary/45",
  saturé: "bg-warning/70 hover:bg-warning/80",
  critique: "bg-destructive/80 hover:bg-destructive",
};

function PlanningHeatmap({ data }: { data: PlanningSlot[] }) {
  const days = Array.from(new Map(data.map((d) => [d.dayLabel, d])).values());
  return (
    <div className="space-y-2">
      <div
        className="grid"
        style={{ gridTemplateColumns: `3.5rem repeat(${days.length}, minmax(0, 1fr))` }}
      >
        <div />
        {days.map((d) => (
          <div key={d.dayLabel} className="text-center text-[11px] font-medium text-muted-foreground">
            {d.dayLabel}
          </div>
        ))}
      </div>
      {slotOrder.map((slot) => (
        <div
          key={slot}
          className="grid items-center gap-1.5"
          style={{ gridTemplateColumns: `3.5rem repeat(${days.length}, minmax(0, 1fr))` }}
        >
          <span className="text-[11px] text-muted-foreground">{slot}</span>
          {days.map((d) => {
            const cell = data.find((item) => item.dayLabel === d.dayLabel && item.slot === slot);
            if (!cell) return <div key={`${d.dayLabel}-${slot}`} className="h-6" />;
            return (
              <div
                key={`${d.dayLabel}-${slot}`}
                title={`${d.dayLabel} · ${slot} · ${cell.level}`}
                className={`h-6 rounded-md transition-colors ${levelClass[cell.level]}`}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

function AsyncSection({
  isLoading,
  error,
  onRetry,
  isEmpty,
  emptyMessage = "Aucune donnée disponible",
  emptyIcon: EmptyIcon = AlertTriangle,
  emptyAction,
  skeleton,
  children,
}: {
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  isEmpty: boolean;
  emptyMessage?: string;
  emptyIcon?: typeof AlertTriangle;
  emptyAction?: React.ReactNode;
  skeleton: React.ReactNode;
  children: React.ReactNode;
}) {
  if (isLoading) return <>{skeleton}</>;
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 px-6 py-8 text-center">
        <p className="text-sm text-muted-foreground">Impossible de charger les données.</p>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onRetry}>
          <RefreshCw className="mr-2 size-3.5" /> Réessayer
        </Button>
      </div>
    );
  }
  if (isEmpty) {
    return (
      <EmptyState icon={EmptyIcon} title={emptyMessage} action={emptyAction} compact />
    );
  }
  return <>{children}</>;
}

function Dashboard() {
  const { profile, role } = useRole();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";
  const todayLabel = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const [kpis, setKpis] = useState<DashboardKpis>(EMPTY_DASHBOARD_KPIS);
  const [stats, setStats] = useState<DashboardStats>(EMPTY_DASHBOARD_STATS);
  const [kpisLoading, setKpisLoading] = useState(true);
  const [kpisError, setKpisError] = useState<string | null>(null);

  const [salleAttente, setSalleAttente] = useState<SalleAttente[]>([]);
  const [salleLoading, setSalleLoading] = useState(true);
  const [salleError, setSalleError] = useState<string | null>(null);

  const [planningTension, setPlanningTension] = useState<PlanningSlot[]>([]);
  const [planningLoading, setPlanningLoading] = useState(true);
  const [planningError, setPlanningError] = useState<string | null>(null);

  const [urgencesFraude, setUrgencesFraude] = useState<UrgenceFraude[]>([]);
  const [urgencesLoading, setUrgencesLoading] = useState(true);
  const [urgencesError, setUrgencesError] = useState<string | null>(null);

  const [alertes, setAlertes] = useState<Alerte[]>([]);
  const [alertesLoading, setAlertesLoading] = useState(true);
  const [alertesError, setAlertesError] = useState<string | null>(null);

  const [comptabilite, setComptabilite] = useState<SyntheseComptable>(EMPTY_COMPTABILITE);
  const [comptaLoading, setComptaLoading] = useState(true);
  const [comptaError, setComptaError] = useState<string | null>(null);

  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    const controller = new AbortController();
    setKpisLoading(true);
    setKpisError(null);
    Promise.allSettled([
      fetchDashboardKpis(controller.signal),
      fetchDashboardStats(controller.signal),
    ])
      .then(([k, s]) => {
        if (controller.signal.aborted) return;
        if (k.status === "fulfilled") setKpis(k.value);
        else setKpisError(k.reason instanceof Error ? k.reason.message : "Indicateurs indisponibles");
        if (s.status === "fulfilled") setStats(s.value);
      })
      .finally(() => {
        if (!controller.signal.aborted) setKpisLoading(false);
      });
    return () => controller.abort();
  }, [reloadKey]);

  useEffect(() => {
    const controller = new AbortController();
    setSalleLoading(true);
    setSalleError(null);
    fetchSalleAttente(controller.signal)
      .then(setSalleAttente)
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        setSalleError(e instanceof Error ? e.message : "Impossible de charger la salle d'attente");
      })
      .finally(() => {
        if (!controller.signal.aborted) setSalleLoading(false);
      });
    return () => controller.abort();
  }, [reloadKey]);

  useEffect(() => {
    const controller = new AbortController();
    setPlanningLoading(true);
    setPlanningError(null);
    fetchPlanningTension(controller.signal)
      .then(setPlanningTension)
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        setPlanningError(e instanceof Error ? e.message : "Impossible de charger le planning");
      })
      .finally(() => {
        if (!controller.signal.aborted) setPlanningLoading(false);
      });
    return () => controller.abort();
  }, [reloadKey]);

  useEffect(() => {
    if (role !== "directeur") return;
    const controller = new AbortController();
    setUrgencesLoading(true);
    setUrgencesError(null);
    fetchUrgencesFraude(controller.signal)
      .then(setUrgencesFraude)
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        setUrgencesError(e instanceof Error ? e.message : "Impossible de charger les urgences");
      })
      .finally(() => {
        if (!controller.signal.aborted) setUrgencesLoading(false);
      });
    return () => controller.abort();
  }, [role, reloadKey]);

  useEffect(() => {
    const controller = new AbortController();
    setAlertesLoading(true);
    setAlertesError(null);
    fetchAlertes(controller.signal)
      .then(setAlertes)
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        setAlertesError(e instanceof Error ? e.message : "Impossible de charger les alertes");
      })
      .finally(() => {
        if (!controller.signal.aborted) setAlertesLoading(false);
      });
    return () => controller.abort();
  }, [reloadKey]);

  useEffect(() => {
    if (!profile.canSeeFinance) return;
    const controller = new AbortController();
    setComptaLoading(true);
    setComptaError(null);
    fetchSyntheseComptable(controller.signal)
      .then(setComptabilite)
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        setComptaError(e instanceof Error ? e.message : "Impossible de charger la synthèse");
      })
      .finally(() => {
        if (!controller.signal.aborted) setComptaLoading(false);
      });
    return () => controller.abort();
  }, [profile.canSeeFinance, reloadKey]);

  const kpiValue = (value: string) => (kpisError ? "—" : value);
  const crPending = stats.repartitionStatuts["En attente"] ?? 0;
  const enCours = stats.repartitionStatuts["En cours"] ?? 0;
  const termines = stats.repartitionStatuts["Terminé"] ?? 0;

  return (
    <div className="page-shell">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-primary">Accueil</p>
          <p className="mt-1 text-sm capitalize text-muted-foreground">{todayLabel}</p>
        </div>
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={reload}>
          <RefreshCw className="mr-1.5 size-3.5" /> Actualiser
        </Button>
      </div>

      <section className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(240px,38%)]">
        <div className="flex flex-col justify-center py-1">
          <h1 className="page-title">
            {greeting}, {profile.nom}
          </h1>
          <p className="mt-2 max-w-lg text-sm text-muted-foreground">
            Activité du centre aujourd&apos;hui — patients, examens et files à traiter.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button size="sm" asChild>
              <Link to="/patients" search={{ nouveau: "1" } as never}>
                <UserPlus className="size-4" /> Nouveau patient
              </Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link to="/accueil" search={{ mode: "rdv" }}>
                <CalendarPlus className="size-4" /> Prendre rendez-vous
              </Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link to="/accueil" search={{ mode: "walkin" }}>
                <Footprints className="size-4" /> Passage sans rendez-vous
              </Link>
            </Button>
          </div>
        </div>
        <div className="relative hidden overflow-hidden rounded-2xl border border-border lg:block">
          <img
            src={scannerHero}
            alt="Scanner d'imagerie médicale"
            className="h-full min-h-[196px] max-h-[228px] w-full object-cover object-center"
          />
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-foreground/25 to-transparent" />
          <p className="absolute bottom-3 left-3 text-[10px] font-medium uppercase tracking-[0.16em] text-white/85">
            Imagerie médicale
          </p>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-border lg:hidden">
          <img
            src={scannerHero}
            alt="Scanner d'imagerie médicale"
            className="h-32 w-full object-cover object-center"
          />
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpisLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="app-surface px-5 py-4">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-3 h-7 w-16" />
            </div>
          ))
        ) : (
          <>
            <KpiCard
              label="Patients aujourd'hui"
              value={kpiValue(String(kpis.patientsDuJour))}
              hint={`${stats.examensAujourdhui} examen(s) planifié(s)`}
              icon={Users}
            />
            <KpiCard
              label="Examens aujourd'hui"
              value={kpiValue(String(stats.examensAujourdhui))}
              hint={`${kpiValue(String(kpis.actesRealises))} acte(s) réalisés`}
              icon={ScanLine}
            />
            {profile.canSeeFinance ? (
              <KpiCard
                label="Encaissements"
                value={kpiValue(formatMAD(kpis.chiffreAffaires))}
                hint="Montants enregistrés ce mois"
                icon={Wallet}
              />
            ) : (
              <KpiCard
                label="Occupation"
                value={kpiValue(`${kpis.tauxOccupation}%`)}
                hint="Part des examens déjà commencés"
                icon={Clock}
              />
            )}
            <KpiCard
              label="À traiter"
              value={String(alertes.length || crPending)}
              hint="Alertes et files d'attente"
              icon={FileText}
            />
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="app-surface overflow-hidden">
          <SectionHeader
            title="File d'attente"
            description="Patients présents aujourd'hui"
            action={
              <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" asChild>
                <Link to="/file-attente">
                  Ouvrir <ArrowRight className="ml-1 size-3.5" />
                </Link>
              </Button>
            }
          />
          <div className="border-t border-border">
            <AsyncSection
              isLoading={salleLoading}
              error={salleError}
              onRetry={reload}
              isEmpty={salleAttente.length === 0}
              emptyMessage="Aucun patient en file d'attente."
              emptyIcon={Users}
              emptyAction={
                <Button size="sm" variant="outline" asChild>
                  <Link to="/accueil" search={{ mode: "rdv" }}>
                    Prendre rendez-vous
                  </Link>
                </Button>
              }
              skeleton={
                <div className="space-y-2 px-5 py-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              }
            >
              <ul className="divide-y divide-border">
                {salleAttente.map((r) => (
                  <li
                    key={`${r.heure}-${r.patient}-${r.examen}`}
                    className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40"
                  >
                    <span className="w-12 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                      {r.heure}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{r.patient}</p>
                      <p className="truncate text-xs text-muted-foreground">{r.examen}</p>
                    </div>
                    <Pill tone={statutTone[r.statut]}>{r.statut}</Pill>
                  </li>
                ))}
              </ul>
            </AsyncSection>
          </div>
        </div>

        <div className="app-surface overflow-hidden">
          <SectionHeader
            title="Examens du jour"
            description="Répartition des statuts"
            action={
              <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" asChild>
                <Link to="/worklist">
                  Worklist <ArrowRight className="ml-1 size-3.5" />
                </Link>
              </Button>
            }
          />
          <div className="border-t border-border">
            {kpisLoading ? (
              <div className="space-y-2 px-5 py-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : stats.examensAujourdhui === 0 ? (
              <EmptyState
                compact
                icon={ScanLine}
                title="Aucun examen prévu aujourd'hui."
                action={
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/accueil" search={{ mode: "rdv" }}>
                      Prendre rendez-vous
                    </Link>
                  </Button>
                }
              />
            ) : (
              <>
                <div className="px-5 py-4">
                  <p className="text-2xl font-semibold tabular-nums tracking-tight">
                    {stats.examensAujourdhui}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">examens enregistrés aujourd'hui</p>
                </div>
                <div className="grid grid-cols-3 divide-x divide-border border-t border-border">
                  {[
                    { label: "En attente", value: crPending },
                    { label: "En cours", value: enCours },
                    { label: "Terminés", value: termines },
                  ].map((item) => (
                    <div key={item.label} className="px-4 py-4">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        {item.label}
                      </p>
                      <p className="mt-1.5 text-xl font-semibold tabular-nums">{item.value}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="app-surface overflow-hidden lg:col-span-3">
          <SectionHeader title="À traiter" description="Priorités du centre" />
          <div className="space-y-2 border-t border-border px-5 py-4">
            <Link
              to="/comptes-rendus"
              className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/50"
            >
              <span className="flex items-center gap-3 text-sm">
                <FileText className="size-4 text-muted-foreground" />
                Examens en attente
              </span>
              <span
                className={`text-sm font-semibold tabular-nums ${crPending > 0 ? "text-warning" : ""}`}
              >
                {crPending}
              </span>
            </Link>
            {profile.canSeeFinance ? (
              <Link
                to="/impayes"
                className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/50"
              >
                <span className="flex items-center gap-3 text-sm">
                  <Wallet className="size-4 text-muted-foreground" />
                  Actes en attente d&apos;export
                </span>
                <span
                  className={`text-sm font-semibold tabular-nums ${
                    !comptaLoading && !comptaError && comptabilite.pending > 0 ? "text-warning" : ""
                  }`}
                >
                  {comptaLoading || comptaError ? "—" : comptabilite.pending}
                </span>
              </Link>
            ) : null}
            <Link
              to="/dossiers"
              className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/50"
            >
              <span className="flex items-center gap-3 text-sm">
                <FolderOpen className="size-4 text-muted-foreground" />
                Dossiers à remettre
              </span>
              <span className="text-xs text-muted-foreground">Ouvrir</span>
            </Link>
            <AsyncSection
              isLoading={alertesLoading}
              error={alertesError}
              onRetry={reload}
              isEmpty={alertes.length === 0}
              emptyMessage="Aucune alerte en cours."
              emptyIcon={Activity}
              skeleton={
                <div className="space-y-2 pt-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              }
            >
              <div className="divide-y divide-border pt-1">
                {alertes.map((a) => (
                  <div key={a.id} className="flex items-start justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{a.titre}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{a.detail}</p>
                    </div>
                    <Pill tone={niveauTone[a.niveau]}>{niveauLabel[a.niveau]}</Pill>
                  </div>
                ))}
              </div>
            </AsyncSection>
          </div>
        </div>

        <div className="app-surface overflow-hidden lg:col-span-2">
          <SectionHeader title="Activité récente" description="Journal opérationnel" />
          <div className="border-t border-border px-5 py-4">
            <AsyncSection
              isLoading={alertesLoading}
              error={alertesError}
              onRetry={reload}
              isEmpty={alertes.length === 0}
              emptyMessage="Aucune activité récente."
              emptyIcon={Clock}
              skeleton={<Skeleton className="h-32 w-full" />}
            >
              <ol className="relative space-y-4 border-l border-border pl-4">
                {alertes.map((a) => (
                  <li key={`tl-${a.id}`} className="relative">
                    <span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-primary" />
                    <p className="font-mono text-[11px] tabular-nums text-muted-foreground">{a.temps}</p>
                    <p className="mt-0.5 text-sm font-medium">{a.titre}</p>
                    <p className="text-xs text-muted-foreground">{a.detail}</p>
                  </li>
                ))}
              </ol>
            </AsyncSection>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="app-surface overflow-hidden">
          <SectionHeader title="Tension du planning" description="Créneaux des prochains jours" />
          <div className="border-t border-border px-5 py-4">
            <AsyncSection
              isLoading={planningLoading}
              error={planningError}
              onRetry={reload}
              isEmpty={planningTension.length === 0}
              emptyMessage="Aucun créneau de planning n'est encore disponible."
              emptyIcon={CalendarDays}
              skeleton={<Skeleton className="h-32 w-full rounded-lg" />}
            >
              <PlanningHeatmap data={planningTension} />
            </AsyncSection>
          </div>
        </div>

        {role === "directeur" ? (
          <div className="app-surface overflow-hidden">
            <SectionHeader
              title="Urgences audit"
              action={
                <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" asChild>
                  <Link to="/audit">
                    Voir tout <ArrowRight className="ml-1 size-3.5" />
                  </Link>
                </Button>
              }
            />
            <div className="border-t border-border px-5 py-4">
              <AsyncSection
                isLoading={urgencesLoading}
                error={urgencesError}
                onRetry={reload}
                isEmpty={urgencesFraude.length === 0}
                emptyMessage="Aucune urgence d'audit."
                emptyIcon={ShieldAlert}
                skeleton={<Skeleton className="h-24 w-full rounded-lg" />}
              >
                <div className="divide-y divide-border">
                  {urgencesFraude.map((u) => (
                    <div key={u.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{u.patient}</p>
                        <p className="text-xs text-muted-foreground">{u.anomalie}</p>
                      </div>
                      <Button variant="ghost" size="sm" className="h-8 text-xs" asChild>
                        <Link to="/audit">Traiter</Link>
                      </Button>
                    </div>
                  ))}
                </div>
              </AsyncSection>
            </div>
          </div>
        ) : null}

        {profile.canSeeFinance ? (
          <div className="app-surface overflow-hidden">
            <SectionHeader title="Facturation" description="Synthèse comptable" />
            <div className="space-y-4 border-t border-border px-5 py-4">
              {comptaLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : comptaError ? (
                <EmptyState
                  compact
                  icon={FileSpreadsheet}
                  title="Synthèse indisponible"
                  description="Le module comptable n'est pas encore connecté."
                />
              ) : (
                <>
                  <div>
                    <p className="text-2xl font-semibold tracking-tight tabular-nums">
                      {comptabilite.validated}
                    </p>
                    <p className="text-sm text-muted-foreground">actes validés prêts à exporter</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {comptabilite.pending} en attente · Dernier export {comptabilite.lastExport ?? "jamais"}
                  </p>
                  {profile.canExportCompta ? (
                    <ActionButton
                      className="w-full"
                      variant="outline"
                      action={() => javaApi("/api/comptabilite/export", { method: "POST" })}
                      toastMessage="Export comptable généré"
                      errorMessage="Export impossible"
                    >
                      <FileSpreadsheet className="mr-2 size-4" /> Exporter
                    </ActionButton>
                  ) : null}
                </>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {role === "directeur" ? <CaisseFraudAlert /> : null}
    </div>
  );
}
