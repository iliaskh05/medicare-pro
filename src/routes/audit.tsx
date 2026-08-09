import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Ban,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Search,
  Network,
  Radar,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader, Pill, IconTile } from "@/components/ui-kit";
import { ProbabilityBar, ProbabilityGauge } from "@/components/probability-gauge";
import { facturesSuspectes, formatMAD } from "@/data/mock";
import { clusters, predictionParFacture, predictionsFraude } from "@/data/mock-extra";

export const Route = createFileRoute("/audit")({
  head: () => ({
    meta: [
      { title: "Audit & conformité (IA fraude) — RadioCRM" },
      {
        name: "description",
        content:
          "Analyse algorithmique des factures suspectes : raison de l'alerte, score de risque et actions de validation ou blocage.",
      },
      { property: "og:title", content: "Audit & conformité (IA fraude) — RadioCRM" },
      {
        property: "og:description",
        content: "Détection automatique des anomalies de facturation du centre de radiologie.",
      },
    ],
  }),
  component: AuditPage,
});

const PAGE_SIZE = 6;

const scoreTone = (s: number) => (s >= 80 ? "destructive" : s >= 60 ? "warning" : "neutral");
const scoreLabel = (s: number) => (s >= 80 ? "Critique" : s >= 60 ? "Élevé" : "Modéré");

const clusterColor = (r: string) =>
  r === "critique"
    ? "var(--destructive)"
    : r === "eleve"
      ? "var(--warning)"
      : r === "moyen"
        ? "var(--chart-2)"
        : "var(--success)";

const clusterTone = (r: string) =>
  r === "critique" ? "destructive" : r === "eleve" ? "warning" : r === "moyen" ? "primary" : "success";

const clusterLabel = (r: string) =>
  r === "critique"
    ? "Signal fort"
    : r === "eleve"
      ? "Signal faible"
      : r === "moyen"
        ? "À surveiller"
        : "Nominal";

function AuditPage() {
  const [activeCluster, setActiveCluster] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [niveau, setNiveau] = useState("tous");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return facturesSuspectes.filter((f) => {
      const matchQ =
        !q || f.patient.toLowerCase().includes(q) || f.id.toLowerCase().includes(q);
      const matchN =
        niveau === "tous" ||
        (niveau === "critique" && f.score >= 80) ||
        (niveau === "eleve" && f.score >= 60 && f.score < 80) ||
        (niveau === "modere" && f.score < 60);
      return matchQ && matchN;
    });
  }, [query, niveau]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const montantEnJeu = facturesSuspectes.reduce((s, f) => s + f.montant, 0);
  const critiques = facturesSuspectes.filter((f) => f.score >= 80).length;
  const topPredictions = [...predictionsFraude]
    .sort((a, b) => b.probabilite - a.probabilite)
    .slice(0, 3);
  const probaMoyenne =
    predictionsFraude.reduce((s, p) => s + p.probabilite, 0) / predictionsFraude.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit & conformité"
        subtitle="Module IA de détection de fraude — dernier scan aujourd'hui à 08:00"
        actions={
          <Button onClick={() => toast.info("Nouvelle analyse lancée (démonstration)")}>
            <Sparkles className="mr-2 size-4" /> Relancer l'analyse IA
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="shadow-none">
          <CardContent className="flex items-start gap-4 p-5">
            <IconTile tone="destructive">
              <ShieldAlert className="size-5" />
            </IconTile>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Factures suspectes
              </p>
              <p className="mt-1 text-2xl font-bold tracking-tight">{facturesSuspectes.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">{critiques} au score critique</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardContent className="flex items-start gap-4 p-5">
            <IconTile tone="warning">
              <Ban className="size-5" />
            </IconTile>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Montant en jeu
              </p>
              <p className="mt-1 text-2xl font-bold tracking-tight">{formatMAD(montantEnJeu)}</p>
              <p className="mt-1 text-xs text-muted-foreground">sur les 30 derniers jours</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Taux de conformité du centre
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-success">94,2 %</p>
            <Progress value={94} className="mt-3" />
            <p className="mt-2 text-xs text-muted-foreground">
              1 842 factures contrôlées · 10 anomalies retenues
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <Card className="shadow-none">
          <CardHeader className="flex-row items-center gap-2">
            <Network className="size-4 text-primary" />
            <CardTitle>Clustering des signaux faibles</CardTitle>
            <Pill tone="primary" className="ml-auto">
              K-means · 4 groupes
            </Pill>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative overflow-hidden rounded-xl border border-border bg-muted/40">
              <svg viewBox="0 0 100 100" className="h-64 w-full" role="img" aria-label="Projection des clusters de facturation">
                {[25, 50, 75].map((g) => (
                  <g key={g}>
                    <line x1={g} y1="0" x2={g} y2="100" stroke="var(--border)" strokeWidth="0.25" />
                    <line x1="0" y1={g} x2="100" y2={g} stroke="var(--border)" strokeWidth="0.25" />
                  </g>
                ))}
                {clusters.map((c) => (
                  <g key={c.id}>
                    {c.points.map((pt, i) => (
                      <circle
                        key={`${c.id}-${i}`}
                        cx={pt.x}
                        cy={pt.y}
                        r={pt.r / 2.2}
                        fill={clusterColor(c.risque)}
                        opacity={activeCluster && activeCluster !== c.id ? 0.2 : 0.75}
                      />
                    ))}
                    <circle
                      cx={c.points.reduce((s, p) => s + p.x, 0) / c.points.length}
                      cy={c.points.reduce((s, p) => s + p.y, 0) / c.points.length}
                      r={11}
                      fill="none"
                      stroke={clusterColor(c.risque)}
                      strokeWidth="0.5"
                      strokeDasharray="2 2"
                      opacity={activeCluster && activeCluster !== c.id ? 0.25 : 0.9}
                    />
                  </g>
                ))}
              </svg>
            </div>

            <ul className="space-y-2">
              {clusters.map((c) => (
                <li key={c.id}>
                  <button
                    onMouseEnter={() => setActiveCluster(c.id)}
                    onMouseLeave={() => setActiveCluster(null)}
                    onFocus={() => setActiveCluster(c.id)}
                    onBlur={() => setActiveCluster(null)}
                    className="flex w-full items-start gap-3 rounded-xl border border-border p-3 text-left transition-colors hover:bg-accent/60"
                  >
                    <span
                      className="mt-1 size-3 shrink-0 rounded-full"
                      style={{ backgroundColor: clusterColor(c.risque) }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold">{c.nom}</p>
                        <Pill tone={clusterTone(c.risque)}>{clusterLabel(c.risque)}</Pill>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{c.description}</p>
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        {c.taille} dossier(s) · densité {c.densite.toFixed(2)}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader className="flex-row items-center gap-2">
            <Radar className="size-4 text-primary" />
            <CardTitle>Prédictions de fraude</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-3 gap-2 rounded-xl border border-border bg-muted/40 p-4">
              {topPredictions.map((p) => (
                <ProbabilityGauge key={p.factureId} value={p.probabilite} label={p.factureId} />
              ))}
            </div>

            <div className="space-y-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <TrendingUp className="size-3.5" /> Facteurs déterminants du modèle
              </p>
              {topPredictions[0]?.facteurs.map((f) => (
                <div key={f.libelle}>
                  <div className="flex items-center justify-between text-sm">
                    <span>{f.libelle}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {Math.round(f.poids * 100)} %
                    </span>
                  </div>
                  <Progress value={f.poids * 100} className="mt-1.5" />
                </div>
              ))}
            </div>

            <div className="rounded-xl bg-accent p-3">
              <p className="text-xs font-semibold text-accent-foreground">
                Probabilité moyenne du lot : {Math.round(probaMoyenne * 100)} %
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {predictionsFraude.filter((p) => p.probabilite >= 0.8).length} facture(s) au-dessus du
                seuil de blocage automatique (80 %).
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-none">
        <CardHeader className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Factures suspectes détectées par l'IA</CardTitle>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Facture ou patient…"
                className="pl-9 sm:w-56"
              />
            </div>
            <Select
              value={niveau}
              onValueChange={(v) => {
                setNiveau(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Tous les scores</SelectItem>
                <SelectItem value="critique">Critique (≥ 80)</SelectItem>
                <SelectItem value="eleve">Élevé (60–79)</SelectItem>
                <SelectItem value="modere">Modéré (&lt; 60)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">ID Facture</TableHead>
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead>Raison de l'alerte</TableHead>
                  <TableHead>Score de risque</TableHead>
                  <TableHead className="hidden lg:table-cell">Prédiction IA</TableHead>
                  <TableHead className="pr-6 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="pl-6 font-mono text-xs font-semibold">{f.id}</TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                      {f.date}
                    </TableCell>
                    <TableCell className="font-medium">{f.patient}</TableCell>
                    <TableCell className="text-right text-sm">{formatMAD(f.montant)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{f.raison}</TableCell>
                    <TableCell>
                      <Pill tone={scoreTone(f.score)}>
                        {f.score} · {scoreLabel(f.score)}
                      </Pill>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {predictionParFacture.get(f.id) ? (
                        <div className="space-y-1">
                          <ProbabilityBar value={predictionParFacture.get(f.id)!.probabilite} />
                          <p className="text-[11px] text-muted-foreground">
                            {predictionParFacture.get(f.id)!.cluster}
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="pr-6">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toast.success(`Acte ${f.id} validé`)}
                        >
                          <ShieldCheck className="mr-1.5 size-4 text-success" /> Valider
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive"
                          onClick={() => toast.error(`${f.id} bloquée pour investigation`)}
                        >
                          <Ban className="mr-1.5 size-4" /> Bloquer
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                      Aucune anomalie pour ce filtre.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-6 pt-4 sm:flex-row">
            <p className="text-sm text-muted-foreground">
              {filtered.length} anomalie(s) · page {current} / {pageCount}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={current === 1}
                onClick={() => setPage(current - 1)}
              >
                <ChevronLeft className="mr-1 size-4" /> Précédent
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={current === pageCount}
                onClick={() => setPage(current + 1)}
              >
                Suivant <ChevronRight className="ml-1 size-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
