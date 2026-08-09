import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Ban,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Search,
  Loader2,
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
import { formatMAD } from "@/data/mock";
import { apiFetch } from "@/lib/api-client";
import type { FraudScoreResult } from "@/server/store/types";

export const Route = createFileRoute("/audit")({
  head: () => ({
    meta: [
      { title: "Audit & conformité (IA fraude) — RadioCRM" },
      {
        name: "description",
        content:
          "Moteur anti-fraude hybride : clustering non supervisé + modèle supervisé sur labels historiques.",
      },
      { property: "og:title", content: "Audit & conformité (IA fraude) — RadioCRM" },
    ],
  }),
  component: AuditPage,
});

const PAGE_SIZE = 6;

const scoreTone = (s: number) => (s >= 80 ? "destructive" : s >= 60 ? "warning" : "neutral");
const scoreLabel = (s: number) => (s >= 80 ? "Critique" : s >= 60 ? "Élevé" : "Modéré");

function AuditPage() {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [niveau, setNiveau] = useState("tous");
  const [page, setPage] = useState(1);

  const alertsQuery = useQuery({
    queryKey: ["fraud-alerts"],
    queryFn: () => apiFetch<{ alerts: FraudScoreResult[] }>("/api/fraud/alerts"),
  });

  const engineQuery = useQuery({
    queryKey: ["fraud-engine"],
    queryFn: () =>
      apiFetch<{
        engine: {
          trainedAt: string;
          k: number;
          supervised: { version: string; samples: number; loss: number };
        };
      }>("/api/fraud/analyze"),
  });

  const analyzeMut = useMutation({
    mutationFn: () =>
      apiFetch<{ results: FraudScoreResult[] }>("/api/fraud/analyze", {
        method: "POST",
        body: JSON.stringify({ mode: "full" }),
      }),
    onSuccess: (data) => {
      toast.success(`Analyse hybride terminée — ${data.results.length} factures scorées`);
      qc.invalidateQueries({ queryKey: ["fraud-alerts"] });
      qc.invalidateQueries({ queryKey: ["fraud-engine"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const decideMut = useMutation({
    mutationFn: (payload: { invoiceId: string; decision: "validated" | "blocked" }) =>
      apiFetch<FraudScoreResult>("/api/fraud/alerts", {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess: (row) => {
      toast[row.decision === "validated" ? "success" : "error"](
        row.decision === "validated"
          ? `Acte ${row.invoiceId} validé`
          : `${row.invoiceId} bloquée pour investigation`,
      );
      qc.invalidateQueries({ queryKey: ["fraud-alerts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rowsAll = alertsQuery.data?.alerts ?? [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rowsAll.filter((f) => {
      const matchQ =
        !q ||
        f.patientName.toLowerCase().includes(q) ||
        f.invoiceId.toLowerCase().includes(q);
      const matchN =
        niveau === "tous" ||
        (niveau === "critique" && f.score >= 80) ||
        (niveau === "eleve" && f.score >= 60 && f.score < 80) ||
        (niveau === "modere" && f.score < 60);
      return matchQ && matchN;
    });
  }, [query, niveau, rowsAll]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const montantEnJeu = rowsAll.reduce((s, f) => s + f.amount, 0);
  const critiques = rowsAll.filter((f) => f.score >= 80).length;
  const engine = engineQuery.data?.engine;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit & conformité"
        subtitle={
          engine
            ? `Moteur hybride ${engine.supervised.version} · k=${engine.k} · entraîné ${new Date(engine.trainedAt).toLocaleString("fr-MA")}`
            : "Module IA de détection de fraude (clustering + supervisé)"
        }
        actions={
          <Button onClick={() => analyzeMut.mutate()} disabled={analyzeMut.isPending}>
            {analyzeMut.isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 size-4" />
            )}
            Relancer l'analyse IA
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
              <p className="mt-1 text-2xl font-bold tracking-tight">{rowsAll.length}</p>
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
              <p className="mt-1 text-xs text-muted-foreground">sur le scan courant</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Modèle supervisé
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-success">
              {engine ? `${engine.supervised.samples} labels` : "—"}
            </p>
            <Progress value={engine ? Math.min(100, (1 - (engine.supervised.loss || 0)) * 100) : 0} className="mt-3" />
            <p className="mt-2 text-xs text-muted-foreground">
              Loss {engine?.supervised.loss ?? "—"} · K-Means + régression logistique (fallback TS) / GBM (Python)
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-none">
        <CardHeader className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Factures scorées par le moteur hybride</CardTitle>
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
                  <TableHead className="hidden sm:table-cell">Cluster</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead>Raison de l'alerte</TableHead>
                  <TableHead>Score de risque</TableHead>
                  <TableHead className="pr-6 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alertsQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      <Loader2 className="mx-auto size-5 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : null}
                {rows.map((f) => (
                  <TableRow key={f.invoiceId}>
                    <TableCell className="pl-6 font-mono text-xs font-semibold">
                      {f.invoiceId}
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                      C{f.unsupervised.clusterId}
                      {f.unsupervised.isWeakSignal ? " · faible" : ""}
                    </TableCell>
                    <TableCell className="font-medium">{f.patientName}</TableCell>
                    <TableCell className="text-right text-sm">{formatMAD(f.amount)}</TableCell>
                    <TableCell className="max-w-[220px] text-sm text-muted-foreground">
                      {f.raison.join(" · ")}
                      <span className="mt-0.5 block text-[11px]">
                        P(fraude)={f.supervised.probability}
                      </span>
                    </TableCell>
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
                          disabled={f.decision === "validated" || decideMut.isPending}
                          onClick={() =>
                            decideMut.mutate({ invoiceId: f.invoiceId, decision: "validated" })
                          }
                        >
                          <ShieldCheck className="mr-1.5 size-4 text-success" /> Valider
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive"
                          disabled={f.decision === "blocked" || decideMut.isPending}
                          onClick={() =>
                            decideMut.mutate({ invoiceId: f.invoiceId, decision: "blocked" })
                          }
                        >
                          <Ban className="mr-1.5 size-4" /> Bloquer
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!alertsQuery.isLoading && rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      Aucune anomalie — lancez l'analyse IA.
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
