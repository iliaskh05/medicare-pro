import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Users,
  Wallet,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  CalendarDays,
  FileSpreadsheet,
  ShieldAlert,
  MessageCircle,
  Bot,
  RefreshCw,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRole } from "@/hooks/use-role";
import { CaisseFraudAlert } from "@/components/fraude/caisse-alert";
import { DocumentMenu } from "@/components/document-menu";
import { ActionButton } from "@/components/action-button";
import { PageHeader, Pill, IconTile, EmptyState } from "@/components/ui-kit";
import { ProbabilityBar } from "@/components/probability-gauge";
import { javaApi } from "@/lib/api/config";
import {
  fetchDashboardKpis,
  fetchSalleAttente,
  fetchPlanningTension,
  fetchUrgencesFraude,
  fetchAlertes,
  fetchSyntheseComptable,
  EMPTY_DASHBOARD_KPIS,
  EMPTY_COMPTABILITE,
  type DashboardKpis,
} from "@/lib/api/dashboard";
import {
  formatMAD,
  type Alerte,
  type PlanningSlot,
  type SalleAttente,
  type SyntheseComptable,
  type UrgenceFraude,
} from "@/types/domain";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Tableau de bord — RadioCRM" },
      {
        name: "description",
        content:
          "Activité du jour du Centre d'Imagerie Médicale : patients, chiffre d'affaires en MAD, examens en attente et alertes de facturation.",
      },
      { property: "og:title", content: "Tableau de bord — RadioCRM" },
      {
        property: "og:description",
        content: "Suivi temps réel des actes, recettes et alertes du Centre d'Imagerie Médicale.",
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
  libre: "bg-success/40 hover:bg-success/60",
  occupé: "bg-primary/50 hover:bg-primary/70",
  saturé: "bg-warning hover:bg-warning/90",
  critique: "bg-destructive hover:bg-destructive/90",
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
          <div
            key={d.dayLabel}
            className="text-center text-[11px] font-medium text-muted-foreground"
          >
            {d.dayLabel}
          </div>
        ))}
      </div>
      {slotOrder.map((slot) => (
        <div
          key={slot}
          className="grid items-center gap-2"
          style={{ gridTemplateColumns: `3.5rem repeat(${days.length}, minmax(0, 1fr))` }}
        >
          <span className="text-[11px] font-medium text-muted-foreground">{slot}</span>
          {days.map((d) => {
            const cell = data.find((item) => item.dayLabel === d.dayLabel && item.slot === slot);
            if (!cell) return <div key={`${d.dayLabel}-${slot}`} className="aspect-square" />;
            return (
              <div
                key={`${d.dayLabel}-${slot}`}
                title={`${d.dayLabel} · ${slot} · ${cell.level}`}
                className={`aspect-square rounded-md transition-colors ${levelClass[cell.level]}`}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** Section avec état de chargement / erreur / vide générique. */
function AsyncSection<T>({
  isLoading,
  error,
  onRetry,
  isEmpty,
  emptyMessage = "Aucune donnée disponible",
  skeleton,
  children,
}: {
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  isEmpty: boolean;
  emptyMessage?: string;
  skeleton: React.ReactNode;
  children: React.ReactNode;
}) {
  if (isLoading) return <>{skeleton}</>;
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 px-6 py-8 text-center">
        <p className="text-sm font-medium text-muted-foreground">Aucune donnée disponible</p>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onRetry}>
          <RefreshCw className="mr-2 size-3.5" /> Réessayer
        </Button>
      </div>
    );
  }
  if (isEmpty) return <EmptyState icon={AlertTriangle} title={emptyMessage} compact />;
  return <>{children}</>;

}

function Dashboard() {
  const [botOpen, setBotOpen] = useState(false);
  const { profile, role } = useRole();

  // KPIs
  const [kpis, setKpis] = useState<DashboardKpis>(EMPTY_DASHBOARD_KPIS);
  const [kpisLoading, setKpisLoading] = useState(true);
  const [kpisError, setKpisError] = useState<string | null>(null);

  // Salle d'attente
  const [salleAttente, setSalleAttente] = useState<SalleAttente[]>([]);
  const [salleLoading, setSalleLoading] = useState(true);
  const [salleError, setSalleError] = useState<string | null>(null);

  // Planning
  const [planningTension, setPlanningTension] = useState<PlanningSlot[]>([]);
  const [planningLoading, setPlanningLoading] = useState(true);
  const [planningError, setPlanningError] = useState<string | null>(null);

  // Urgences fraude
  const [urgencesFraude, setUrgencesFraude] = useState<UrgenceFraude[]>([]);
  const [urgencesLoading, setUrgencesLoading] = useState(true);
  const [urgencesError, setUrgencesError] = useState<string | null>(null);

  // Alertes
  const [alertes, setAlertes] = useState<Alerte[]>([]);
  const [alertesLoading, setAlertesLoading] = useState(true);
  const [alertesError, setAlertesError] = useState<string | null>(null);

  // Synthèse comptable
  const [comptabilite, setComptabilite] = useState<SyntheseComptable>(EMPTY_COMPTABILITE);
  const [comptaLoading, setComptaLoading] = useState(true);
  const [comptaError, setComptaError] = useState<string | null>(null);

  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    const controller = new AbortController();
    setKpisLoading(true);
    setKpisError(null);
    fetchDashboardKpis(controller.signal)
      .then(setKpis)
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        setKpisError(e instanceof Error ? e.message : "Impossible de charger les indicateurs");
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
        setUrgencesError(
          e instanceof Error ? e.message : "Impossible de charger les urgences fraude",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setUrgencesLoading(false);
      });
    return () => controller.abort();
  }, [role, reloadKey]);

  useEffect(() => {
    if (!profile.canSeeFinance) return;
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
  }, [profile.canSeeFinance, reloadKey]);

  useEffect(() => {
    if (!profile.canSeeFinance) return;
    const controller = new AbortController();
    setComptaLoading(true);
    setComptaError(null);
    fetchSyntheseComptable(controller.signal)
      .then(setComptabilite)
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        setComptaError(
          e instanceof Error ? e.message : "Impossible de charger la synthèse comptable",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setComptaLoading(false);
      });
    return () => controller.abort();
  }, [profile.canSeeFinance, reloadKey]);

  const kpiCards = [
    {
      label: "Patients du jour",
      value: String(kpis.patientsDuJour),
      icon: Users,
      tone: "primary" as const,
      finance: false,
    },
    {
      label: "Chiffre d'affaires mensuel",
      value: formatMAD(kpis.chiffreAffaires),
      icon: Wallet,
      tone: "success" as const,
      finance: true,
    },
    {
      label: "Taux d'occupation",
      value: `${kpis.tauxOccupation}%`,
      icon: Clock,
      tone: "warning" as const,
      finance: false,
    },
    {
      label: "Actes réalisés",
      value: String(kpis.actesRealises),
      icon: AlertTriangle,
      tone: "destructive" as const,
      finance: true,
    },
  ];
  const visibleKpis = kpiCards.filter((k) => !k.finance || profile.canSeeFinance);

  const comptaTotal = comptabilite.validated + comptabilite.pending;
  const comptaPct = comptaTotal > 0 ? Math.round((comptabilite.validated / comptaTotal) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tableau de bord"
        subtitle="Centre d'Imagerie Médicale"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <DocumentMenu />
            <Dialog open={botOpen} onOpenChange={setBotOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <MessageCircle className="mr-2 size-4" /> WhatsApp
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Bot className="size-4 text-primary" /> Configuration du Bot Patient
                  </DialogTitle>
                  <DialogDescription>Paramètres du chatbot WhatsApp du centre.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="bot-numero">Numéro WhatsApp Business</Label>
                    <Input id="bot-numero" defaultValue="+212 6 61 45 87 20" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bot-delai">Délai de réponse automatique (secondes)</Label>
                    <Input id="bot-delai" type="number" defaultValue={3} />
                  </div>
                  {[
                    ["bot-rdv", "Prise de rendez-vous automatique"],
                    ["bot-cr", "Envoi des comptes rendus PDF"],
                    ["bot-rappel", "Rappels de rendez-vous J-1"],
                  ].map(([id, label]) => (
                    <div
                      key={id}
                      className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2.5"
                    >
                      <Label htmlFor={id} className="text-sm font-normal">
                        {label}
                      </Label>
                      <Switch id={id} defaultChecked />
                    </div>
                  ))}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setBotOpen(false)}>
                    Annuler
                  </Button>
                  <ActionButton
                    action={() => javaApi("/api/bot/configuration", { method: "PUT" })}
                    toastMessage="Configuration du bot enregistrée"
                    toastDescription="Les patients recevront les réponses automatiques."
                    onDone={() => setBotOpen(false)}
                  >
                    Enregistrer
                  </ActionButton>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button variant="outline" asChild>
              <Link to="/patients">Salle d'attente</Link>
            </Button>
            <Button asChild>
              <Link to="/facturation">Nouvel acte</Link>
            </Button>
            {role === "directeur" ? (
              <ActionButton
                variant="secondary"
                action={() => javaApi("/api/comptabilite/export", { method: "POST" })}
                toastMessage="Export comptable généré"
                toastDescription="Le fichier a été transmis au service comptable."
                errorMessage="Export impossible"
              >
                <FileSpreadsheet className="mr-2 size-4" />
                Export comptable
              </ActionButton>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpisLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="flex items-start gap-4 p-5">
                <Skeleton className="size-10 rounded-xl" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : (

          visibleKpis.map((kpi) => (
            <Card key={kpi.label}>
              <CardContent className="flex items-start gap-4 p-5">
                <IconTile tone={kpi.tone}>
                  <kpi.icon className="size-5" />
                </IconTile>
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {kpi.label}
                  </p>
                  <p className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">{kpi.value}</p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Widget 1 — Tension du planning */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <IconTile tone="primary">
                <CalendarDays className="size-5" />
              </IconTile>
              <div>
                <CardTitle className="text-base">Tension du planning</CardTitle>
                <p className="text-xs text-muted-foreground">5 prochains jours · 3 créneaux</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <AsyncSection
              isLoading={planningLoading}
              error={planningError}
              onRetry={reload}
              isEmpty={planningTension.length === 0}
              skeleton={<Skeleton className="h-40 w-full rounded-xl" />}
            >
              <PlanningHeatmap data={planningTension} />
              <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm bg-success/80" />
                  Libre
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm bg-primary/70" />
                  Occupé
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm bg-warning" />
                  Saturé
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm bg-destructive" />
                  Critique
                </span>
              </div>
            </AsyncSection>
          </CardContent>
        </Card>

        {/* Widget 2 — Urgences Fraude & Anomalies (Directeur uniquement) */}
        {role === "directeur" ? (
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <IconTile tone="destructive">
                    <ShieldAlert className="size-5" />
                  </IconTile>
                  <div>
                    <CardTitle className="text-base">Urgences Fraude</CardTitle>
                    <p className="text-xs text-muted-foreground">Dernières alertes critiques IA</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="h-8 text-xs" asChild>
                  <Link to="/audit">Voir tout</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <AsyncSection
                isLoading={urgencesLoading}
                error={urgencesError}
                onRetry={reload}
                isEmpty={urgencesFraude.length === 0}
                skeleton={
                  <div className="space-y-3">
                    <Skeleton className="h-16 w-full rounded-xl" />
                    <Skeleton className="h-16 w-full rounded-xl" />
                  </div>
                }
              >
                {urgencesFraude.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{u.patient}</p>
                      <p className="text-xs text-muted-foreground">{u.anomalie}</p>
                      <div className="mt-2">
                        <ProbabilityBar value={u.score / 100} />
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 whitespace-nowrap text-xs"
                      asChild
                    >
                      <Link to="/audit">Traiter</Link>
                    </Button>
                  </div>
                ))}
              </AsyncSection>
            </CardContent>
          </Card>
        ) : null}

        {/* Analyse de Conformité IA (Fraude caisse) — rendu strictement Directeur */}
        {role === "directeur" ? (
          <div className="lg:col-span-3">
            <CaisseFraudAlert />
          </div>
        ) : null}

        {/* Widget 3 — Synchronisation Comptable */}
        {profile.canSeeFinance ? (
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <IconTile tone="success">
                  <FileSpreadsheet className="size-5" />
                </IconTile>
                <div>
                  <CardTitle className="text-base">Synchronisation comptable</CardTitle>
                  <p className="text-xs text-muted-foreground">Export comptable validé</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {comptaLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-2 w-full rounded-full" />
                  <Skeleton className="h-9 w-full rounded-lg" />
                </div>
              ) : comptaError ? (
                <div className="flex flex-col items-center justify-center gap-3 text-center">
                  <AlertTriangle className="size-6 text-destructive" />
                  <p className="text-sm text-muted-foreground">{comptaError}</p>
                  <Button variant="outline" size="sm" onClick={reload}>
                    <RefreshCw className="mr-2 size-4" /> Réessayer
                  </Button>
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-3xl font-bold tracking-tight">{comptabilite.validated}</p>
                    <p className="text-sm text-muted-foreground">
                      actes validés prêts pour l'export
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Progression vers clôture</span>
                      <span className="font-medium text-foreground">{comptaPct}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-success transition-all duration-700"
                        style={{ width: `${comptaPct}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {comptabilite.pending} actes en attente · Dernier export{" "}
                      {comptabilite.lastExport ?? "jamais"}
                    </p>
                  </div>
                  {profile.canExportCompta ? (
                    <ActionButton
                      className="w-full shadow-sm"
                      action={() => javaApi("/api/comptabilite/export", { method: "POST" })}
                      toastMessage="Export comptable généré"
                      toastDescription="Le fichier a été transmis au service comptable."
                      errorMessage="Export impossible"
                    >
                      <FileSpreadsheet className="mr-2 size-4" /> Export comptable (CSV)
                    </ActionButton>
                  ) : (
                    <p className="rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2.5 text-center text-xs text-muted-foreground">
                      Export comptable réservé au profil Directeur
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Prochains patients en salle d'attente</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/patients">
                Tout voir <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            <AsyncSection
              isLoading={salleLoading}
              error={salleError}
              onRetry={reload}
              isEmpty={salleAttente.length === 0}
              skeleton={
                <div className="space-y-2 px-6">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              }
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Heure</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead className="hidden sm:table-cell">Examen</TableHead>
                    <TableHead className="pr-6 text-right">Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salleAttente.map((r) => (
                    <TableRow key={r.heure}>
                      <TableCell className="pl-6 font-mono text-xs">{r.heure}</TableCell>
                      <TableCell>
                        <p className="font-medium">{r.patient}</p>
                        <p className="text-xs text-muted-foreground">{r.medecin}</p>
                      </TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                        {r.examen}
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <Pill tone={statutTone[r.statut]}>{r.statut}</Pill>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </AsyncSection>
          </CardContent>
        </Card>

        {profile.canSeeFinance ? (
          <Card className="lg:col-span-2">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Dernières alertes détectées</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/audit">
                  Audit <ArrowRight className="ml-1 size-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <AsyncSection
                isLoading={alertesLoading}
                error={alertesError}
                onRetry={reload}
                isEmpty={alertes.length === 0}
                skeleton={
                  <div className="space-y-3">
                    <Skeleton className="h-16 w-full rounded-xl" />
                    <Skeleton className="h-16 w-full rounded-xl" />
                  </div>
                }
              >
                {alertes.map((a) => (
                  <div
                    key={a.id}
                    className="rounded-xl border border-border bg-background p-3 transition-colors hover:border-primary/40"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{a.titre}</p>
                      <Pill tone={niveauTone[a.niveau]}>{niveauLabel[a.niveau]}</Pill>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{a.detail}</p>
                    <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                      {a.id} · {a.temps}
                    </p>
                  </div>
                ))}
              </AsyncSection>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
