import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, FileDown, FileText, FolderOpen, Loader2, ScanLine } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, PageHeader, Pill } from "@/components/ui-kit";
import { ScanViewer } from "@/components/scan-viewer";
import { fetchScans } from "@/lib/api/imaging";
import {
  downloadReport,
  fetchReports,
  requestImageAnalysis,
  saveBlob,
  type ReportSummary,
} from "@/lib/api/reports";
import type { Scan } from "@/types/imaging";

export const Route = createFileRoute("/viewer")({
  head: () => ({
    meta: [
      { title: "Visionneuse & analyse IA — Centre d'Imagerie Médicale" },
      {
        name: "description",
        content:
          "Visionneuse d'examens radiologiques connectée au pipeline d'analyse d'images et aux comptes rendus du centre.",
      },
      { property: "og:title", content: "Visionneuse & analyse IA — Centre d'Imagerie Médicale" },
      {
        property: "og:description",
        content:
          "Consultez les examens, lancez l'analyse IA et exportez les comptes rendus en PDF.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ViewerPage,
});

function ViewerSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr_320px]">
      <Skeleton className="h-96 w-full rounded-lg" />
      <Skeleton className="h-96 w-full rounded-lg" />
      <Skeleton className="h-96 w-full rounded-lg" />
    </div>
  );
}

function ViewerPage() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [isLoadingScans, setIsLoadingScans] = useState(true);
  const [scansError, setScansError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [reportsError, setReportsError] = useState<string | null>(null);

  const [analyseEnCours, setAnalyseEnCours] = useState(false);
  const [exportEnCours, setExportEnCours] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoadingScans(true);
    setScansError(null);
    fetchScans(controller.signal)
      .then((rows) => {
        setScans(rows);
        setSelectedId((prev) =>
          prev && rows.some((s) => s.id === prev) ? prev : (rows[0]?.id ?? null),
        );
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        setScansError(
          e instanceof Error ? e.message : "Impossible de charger les études d'imagerie.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoadingScans(false);
      });
    return () => controller.abort();
  }, [reloadToken]);

  const selectedScan: Scan | null = useMemo(
    () => scans.find((s) => s.id === selectedId) ?? null,
    [scans, selectedId],
  );

  useEffect(() => {
    if (!selectedScan) {
      setReports([]);
      return;
    }
    const controller = new AbortController();
    setIsLoadingReports(true);
    setReportsError(null);
    fetchReports(undefined, controller.signal)
      .then((rows) => {
        setReports(rows.filter((r) => r.patientName === selectedScan.patient));
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        setReportsError(
          e instanceof Error ? e.message : "Impossible de charger les comptes rendus.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoadingReports(false);
      });
    return () => controller.abort();
  }, [selectedScan]);

  const lancerAnalyse = async () => {
    if (!selectedScan) return;
    setAnalyseEnCours(true);
    try {
      await requestImageAnalysis(selectedScan.id);
      toast.success("Analyse IA lancée sur cette étude.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Échec du lancement de l'analyse.");
    } finally {
      setAnalyseEnCours(false);
    }
  };

  const exporterPdf = async (report: ReportSummary) => {
    setExportEnCours(report.id);
    try {
      const blob = await downloadReport(report.id);
      if (!blob) throw new Error("Le document n'est pas disponible.");
      saveBlob(blob, `compte-rendu-${report.id}.pdf`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Échec de l'export PDF.");
    } finally {
      setExportEnCours(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visionneuse radiologique"
        subtitle="Pipeline d'analyse d'images et comptes rendus du centre"
        actions={
          <Button
            variant="outline"
            disabled={!selectedScan || analyseEnCours}
            onClick={() => void lancerAnalyse()}
          >
            {analyseEnCours ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <ScanLine className="mr-2 size-4" />
            )}
            Lancer l'analyse IA
          </Button>
        }
      />

      {scansError ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Études indisponibles</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>{scansError}</span>
            <Button size="sm" variant="outline" onClick={() => setReloadToken((t) => t + 1)}>
              Réessayer
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {isLoadingScans ? (
        <ViewerSkeleton />
      ) : scans.length === 0 && !scansError ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={FolderOpen}
              title="Aucune donnée disponible"
              description="Aucun examen n'est encore rattaché au centre."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr_320px]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Études</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {scans.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedId(s.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                    selectedId === s.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <p className="text-sm font-semibold">{s.examen}</p>
                  <p className="text-xs text-muted-foreground">{s.patient}</p>
                  <div className="mt-1 flex gap-1">
                    <Pill tone="neutral">{s.date}</Pill>
                    <Pill tone="neutral">{s.medecin}</Pill>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="text-base">
                {selectedScan
                  ? `${selectedScan.examen} · ${selectedScan.patient}`
                  : "Sélectionnez une étude"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedScan ? (
                <ScanViewer scan={selectedScan} />
              ) : (
                <EmptyState
                  icon={ScanLine}
                  title="Aucune donnée disponible"
                  description="Sélectionnez une étude dans la liste pour l'afficher."
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="size-4" /> Comptes rendus
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {reportsError ? (
                <Alert variant="destructive">
                  <AlertCircle className="size-4" />
                  <AlertTitle>Comptes rendus indisponibles</AlertTitle>
                  <AlertDescription>{reportsError}</AlertDescription>
                </Alert>
              ) : isLoadingReports ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full rounded-md" />
                  <Skeleton className="h-12 w-full rounded-md" />
                </div>
              ) : reports.length === 0 ? (
                <EmptyState
                  compact
                  icon={FileText}
                  title="Aucune donnée disponible"
                  description="Aucun compte rendu n'est encore disponible pour ce patient."
                />
              ) : (
                <ul className="space-y-2">
                  {reports.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{r.examLabel}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.radiologist} · {new Date(r.createdAt).toLocaleDateString("fr-MA")}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={exportEnCours === r.id}
                        onClick={() => void exporterPdf(r)}
                      >
                        {exportEnCours === r.id ? (
                          <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                        ) : (
                          <FileDown className="mr-1.5 size-3.5" />
                        )}
                        PDF
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
