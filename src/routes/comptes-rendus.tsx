import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { FileText, Mic, RefreshCw, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
import { EmptyState, PageHeader, ServiceNotice } from "@/components/ui-kit";
import { Badge } from "@/components/ui/badge";
import { ExamenSheet } from "@/components/worklist/examen-sheet";
import { fetchReports, type ReportSummary } from "@/lib/api/reports";
import { fetchWorklist, fetchWorklistItem, type WorklistItem } from "@/lib/api/worklist";
import { toLocalDateKey } from "@/lib/date";

export const Route = createFileRoute("/comptes-rendus")({
  head: () => ({
    meta: [
      { title: "Comptes rendus — Dictée & signature | RadioCRM" },
      {
        name: "description",
        content:
          "Suivi des comptes rendus radiologiques : à dicter, en rédaction, signés et imprimés, avec éditeur intégré.",
      },
      { property: "og:title", content: "Comptes rendus — Dictée & signature | RadioCRM" },
      {
        property: "og:description",
        content: "Éditeur de comptes rendus et suivi de signature pour le centre d'imagerie.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ComptesRendusPage,
});

const STATUS_LABEL: Record<string, string> = {
  draft: "Brouillon",
  in_review: "En relecture",
  validated: "Validé",
  amended: "Amendé",
  sent: "Envoyé",
};

function statusBadgeVariant(
  status: string,
): "default" | "secondary" | "outline" | "destructive" {
  if (status === "validated") return "default";
  if (status === "amended") return "secondary";
  if (status === "in_review") return "outline";
  return "secondary";
}

function ComptesRendusPage() {
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [worklistFallback, setWorklistFallback] = useState<WorklistItem[]>([]);
  const [useFallback, setUseFallback] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [query, setQuery] = useState("");
  const [statut, setStatut] = useState("tous");
  const [selected, setSelected] = useState<WorklistItem | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);
    setUseFallback(false);

    fetchReports(undefined, controller.signal)
      .then((rows) => {
        setReports(rows);
        setWorklistFallback([]);
      })
      .catch(async (e: unknown) => {
        if (controller.signal.aborted) return;
        try {
          const items = await fetchWorklist(
            { date: toLocalDateKey() },
            controller.signal,
          );
          setWorklistFallback(items);
          setReports([]);
          setUseFallback(true);
          setError(null);
        } catch {
          setReports([]);
          setWorklistFallback([]);
          setError(e instanceof Error ? e.message : "Service indisponible");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [reloadKey]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (useFallback) {
      return worklistFallback.filter(
        (i) =>
          (!q ||
            i.patient.toLowerCase().includes(q) ||
            i.numSejour.toLowerCase().includes(q)) &&
          (statut === "tous" || i.statutCr === statut),
      );
    }
    return reports.filter(
      (r) =>
        (!q ||
          r.patientName.toLowerCase().includes(q) ||
          r.examLabel.toLowerCase().includes(q) ||
          r.id.includes(q)) &&
        (statut === "tous" || r.status === statut),
    );
  }, [reports, worklistFallback, useFallback, query, statut]);

  const openFromReport = async (report: ReportSummary) => {
    if (!report.examenId) return;
    try {
      const match = await fetchWorklistItem(report.examenId);
      setSelected(match);
      setSheetOpen(true);
    } catch {
      /* sheet optional */
    }
  };

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Activité médicale"
        title="Comptes rendus"
        subtitle={
          isLoading
            ? "Chargement…"
            : `${rows.length} compte(s) rendu(s) — dictée, validation et signature`
        }
        actions={
          <Button variant="outline" onClick={() => setReloadKey((k) => k + 1)}>
            <RefreshCw className="mr-2 size-4" /> Actualiser
          </Button>
        }
      />

      {error ? (
        <ServiceNotice
          message="Comptes rendus en attente de connexion au serveur du centre."
          onRetry={() => setReloadKey((k) => k + 1)}
        />
      ) : null}

      <div className="app-surface overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Rechercher un compte rendu"
              placeholder="Rechercher par patient ou examen…"
              className="pl-9"
            />
          </div>
          <Select value={statut} onValueChange={setStatut}>
            <SelectTrigger className="sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tous">Tous les statuts</SelectItem>
              {useFallback ? (
                <>
                  <SelectItem value="a_faire">À dicter</SelectItem>
                  <SelectItem value="en_redaction">En rédaction</SelectItem>
                  <SelectItem value="signe">Signé</SelectItem>
                  <SelectItem value="imprime">Imprimé</SelectItem>
                </>
              ) : (
                <>
                  <SelectItem value="draft">Brouillon</SelectItem>
                  <SelectItem value="in_review">En relecture</SelectItem>
                  <SelectItem value="validated">Validé</SelectItem>
                  <SelectItem value="amended">Amendé</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>
        <div aria-busy={isLoading}>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Patient</TableHead>
                  <TableHead>Examen</TableHead>
                  <TableHead className="hidden md:table-cell">Radiologue</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="hidden sm:table-cell">Version</TableHead>
                  <TableHead className="pr-6 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={`sk-${i}`}>
                        <TableCell colSpan={6} className="px-6">
                          <Skeleton className="h-7 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  : useFallback
                    ? (rows as WorklistItem[]).map((i) => (
                        <TableRow key={i.id} className="text-sm">
                          <TableCell className="pl-6 font-medium">{i.patient}</TableCell>
                          <TableCell className="max-w-56 truncate">{i.description}</TableCell>
                          <TableCell className="hidden md:table-cell">{i.medecin}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{i.statutCr}</Badge>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">—</TableCell>
                          <TableCell className="pr-6 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelected(i);
                                setSheetOpen(true);
                              }}
                            >
                              <Mic className="mr-1.5 size-4" /> Ouvrir
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    : (rows as ReportSummary[]).map((r) => (
                        <TableRow key={r.id} className="text-sm">
                          <TableCell className="pl-6 font-medium">{r.patientName}</TableCell>
                          <TableCell className="max-w-56 truncate">{r.examLabel}</TableCell>
                          <TableCell className="hidden md:table-cell">{r.radiologist}</TableCell>
                          <TableCell>
                            <Badge variant={statusBadgeVariant(r.status)}>
                              {STATUS_LABEL[r.status] ?? r.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            v{r.currentVersion ?? 1}
                          </TableCell>
                          <TableCell className="pr-6 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openFromReport(r)}
                              disabled={!r.examenId}
                            >
                              <Mic className="mr-1.5 size-4" /> Ouvrir
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                {!isLoading && rows.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={6} className="p-0">
                      <EmptyState
                        icon={FileText}
                        title="Aucun compte rendu"
                        description="Aucune donnée disponible pour ces critères."
                      />
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <ExamenSheet item={selected} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}
