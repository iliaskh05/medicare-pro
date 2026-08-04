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
import { facturesSuspectes, formatMAD } from "@/data/mock";

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

function AuditPage() {
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
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
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
