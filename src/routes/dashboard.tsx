import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
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
  Loader2,
  MessageCircle,
  Bot,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { DocumentMenu } from "@/components/document-menu";
import { PageHeader, Pill, IconTile } from "@/components/ui-kit";
import { ProbabilityBar } from "@/components/probability-gauge";
import {
  alertes,
  comptabilite,
  formatMAD,
  planningTension,
  salleAttente,
  urgencesFraude,
  type PlanningSlot,
} from "@/data/mock";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Tableau de bord — RadioCRM" },
      {
        name: "description",
        content:
          "Activité du jour du centre de radiologie : patients, chiffre d'affaires en MAD, examens en attente et alertes de facturation.",
      },
      { property: "og:title", content: "Tableau de bord — RadioCRM" },
      {
        property: "og:description",
        content: "Suivi temps réel des actes, recettes et alertes du centre de radiologie.",
      },
    ],
  }),
  component: Dashboard,
});

const kpis = [
  {
    label: "Patients du jour",
    value: "38",
    hint: "+6 vs hier",
    positive: true,
    icon: Users,
    tone: "primary" as const,
  },
  {
    label: "Chiffre d'affaires mensuel",
    value: formatMAD(742500),
    hint: "+12,4 % vs juillet",
    positive: true,
    icon: Wallet,
    tone: "success" as const,
    finance: true,
  },
  {
    label: "Examens en attente",
    value: "14",
    hint: "3 depuis plus de 45 min",
    positive: false,
    icon: Clock,
    tone: "warning" as const,
  },
  {
    label: "Alertes de facturation",
    value: "5",
    hint: "2 critiques à traiter",
    positive: false,
    icon: AlertTriangle,
    tone: "destructive" as const,
    finance: true,
  },
];

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
            const cell = data.find((item) => item.dayLabel === d.dayLabel && item.slot === slot)!;
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

function Dashboard() {
  const [botOpen, setBotOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const exportComptable = () => {
    if (exporting) return;
    setExporting(true);
    window.setTimeout(() => {
      const lignes = [
        "reference;date;patient;examen;montant_mad;statut",
        ...salleAttente.map(
          (r, idx) =>
            `ACT-2026-${String(idx + 1).padStart(4, "0")};2026-08-10;${r.patient};${r.examen};900;valide`,
        ),
      ].join("\n");
      const blob = new Blob([`\ufeff${lignes}\n`], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "export_comptable_2026.csv";
      a.click();
      URL.revokeObjectURL(url);
      setExporting(false);
      toast.success("Export comptable généré", {
        description: "export_comptable_2026.csv téléchargé.",
      });
    }, 1000);
  };

  const { profile } = useRole();
  const visibleKpis = kpis.filter((k) => !("finance" in k && k.finance) || profile.canSeeFinance);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Tableau de bord"
        subtitle="Mercredi 5 août 2026 · Centre d'Imagerie Médicale, Casablanca"
        actions={
          <div data-tour="actions" className="flex flex-wrap items-center gap-2">
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
                  <DialogDescription>
                    Paramètres du chatbot WhatsApp du centre (démonstration).
                  </DialogDescription>
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
                  <Button
                    onClick={() => {
                      setBotOpen(false);
                      toast.success("Configuration du bot enregistrée", {
                        description: "Les patients recevront les réponses automatiques.",
                      });
                    }}
                  >
                    Enregistrer
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button variant="outline" asChild>
              <Link to="/patients">Salle d'attente</Link>
            </Button>
            <Button asChild>
              <Link to="/facturation">Nouvel acte</Link>
            </Button>
            {profile.canExportCompta ? (
              <Button variant="secondary" disabled={exporting} onClick={exportComptable}>
                {exporting ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="mr-2 size-4" />
                )}
                Export comptable
              </Button>
            ) : null}
          </div>
        }
      />

      <div data-tour="kpis" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {visibleKpis.map((kpi) => (
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
                <p
                  className={`mt-1 flex items-center gap-1 text-xs font-medium ${
                    kpi.positive ? "text-success" : "text-warning-foreground"
                  }`}
                >
                  {kpi.positive ? (
                    <TrendingUp className="size-3.5" />
                  ) : (
                    <TrendingDown className="size-3.5" />
                  )}
                  {kpi.hint}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
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
          </CardContent>
        </Card>

        {/* Widget 2 — Urgences Fraude & Anomalies */}
        {profile.canSeeFinance ? (
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <IconTile tone="destructive">
                    <ShieldAlert className="size-5" />
                  </IconTile>
                  <div>
                    <CardTitle className="text-base">Urgences Fraude</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      3 dernières alertes critiques IA
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="h-8 text-xs" asChild>
                  <Link to="/audit">Voir tout</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
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
            </CardContent>
          </Card>
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
              <div>
                <p className="text-3xl font-bold tracking-tight">{comptabilite.validated}</p>
                <p className="text-sm text-muted-foreground">actes validés prêts pour l'export</p>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Progression vers clôture</span>
                  <span className="font-medium text-foreground">
                    {Math.round(
                      (comptabilite.validated / (comptabilite.validated + comptabilite.pending)) *
                        100,
                    )}
                    %
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-success transition-all duration-700"
                    style={{
                      width: `${(comptabilite.validated / (comptabilite.validated + comptabilite.pending)) * 100}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {comptabilite.pending} actes en attente · Dernier export {comptabilite.lastExport}
                </p>
              </div>
              {profile.canExportCompta ? (
                <Button className="w-full shadow-sm" disabled={exporting} onClick={exportComptable}>
                  {exporting ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" /> Génération de l'export…
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="mr-2 size-4" /> Export comptable (CSV)
                    </>
                  )}
                </Button>
              ) : (
                <p className="rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2.5 text-center text-xs text-muted-foreground">
                  Export comptable réservé au profil Directeur
                </p>
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
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
