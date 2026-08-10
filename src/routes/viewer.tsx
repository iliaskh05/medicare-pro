import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  FileText,
  FolderOpen,
  Loader2,
  ScanLine,
  Sparkles,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader, Pill, IconTile, EmptyState } from "@/components/ui-kit";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch, getApiKey } from "@/lib/api-client";
import type {
  ImageAnalysisResult,
  ImagingStudy,
  StructuredReport,
} from "@/server/store/types";

export type SelectedStudy = {
  id: string;
  patientName: string;
  studyType: string;
  modality: ImagingStudy["modality"];
  bodyPart: string;
  status: ImagingStudy["status"];
};

function toSelectedStudy(study: ImagingStudy): SelectedStudy {
  return {
    id: study.id,
    patientName: study.patientName,
    studyType: study.examLabel,
    modality: study.modality,
    bodyPart: study.bodyPart,
    status: study.status,
  };
}

function formatStructuredReport(report: StructuredReport): string {
  return [
    "1. Renseignements cliniques",
    report.sections.indication,
    "",
    "2. Technique",
    report.sections.technique,
    "",
    "3. Résultats",
    report.sections.resultats,
    "",
    "4. Conclusion",
    report.sections.conclusion,
    "",
    `— ${report.model}${report.draft ? " · brouillon" : ""} · ${report.id}`,
  ].join("\n");
}

export const Route = createFileRoute("/viewer")({
  head: () => ({
    meta: [
      { title: "Visionneuse & analyse IA — RadioCRM" },
      {
        name: "description",
        content:
          "Visionneuse d'examens radiologiques connectée au pipeline d'analyse d'images et au LLM de compte rendu.",
      },
    ],
  }),
  component: ViewerPage,
});

function ViewerPage() {
  const qc = useQueryClient();
  const [selectedStudy, setSelectedStudy] = useState<SelectedStudy | null>(null);
  const [clinicalContext, setClinicalContext] = useState(
    "Douleurs / bilan demandé par le médecin traitant.",
  );
  const [dictationNotes, setDictationNotes] = useState("");
  const [structuredReport, setStructuredReport] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const studiesQuery = useQuery({
    queryKey: ["imaging-studies"],
    queryFn: () => apiFetch<{ studies: ImagingStudy[] }>("/api/imaging/studies"),
  });

  const studies = studiesQuery.data?.studies ?? [];

  useEffect(() => {
    if (!selectedStudy && studies.length > 0) {
      setSelectedStudy(toSelectedStudy(studies[0]!));
    }
  }, [studies, selectedStudy]);

  // C5 — révoquer l'object URL au démontage / changement
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const detailQuery = useQuery({
    queryKey: ["imaging-study", selectedStudy?.id],
    enabled: !!selectedStudy?.id,
    queryFn: () =>
      apiFetch<{ study: ImagingStudy; analysis: ImageAnalysisResult | null }>(
        `/api/imaging/studies/${selectedStudy!.id}`,
      ),
  });

  const analyzeMut = useMutation({
    mutationFn: async () => {
      if (!selectedStudy) throw new Error("Aucune étude");
      if (file) {
        const form = new FormData();
        form.append("studyId", selectedStudy.id);
        form.append("file", file);
        const res = await fetch("/api/imaging/analyze", {
          method: "POST",
          headers: { "x-api-key": getApiKey() },
          body: form,
        });
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error?.message ?? "Analyse échouée");
        return json.data as ImageAnalysisResult;
      }
      return apiFetch<ImageAnalysisResult>("/api/imaging/analyze", {
        method: "POST",
        body: JSON.stringify({ studyId: selectedStudy.id }),
      });
    },
    onSuccess: () => {
      toast.success("Analyse d'image terminée");
      qc.invalidateQueries({ queryKey: ["imaging-study", selectedStudy?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleGenerateCR = async () => {
    setErrorMessage(null);

    if (!selectedStudy) {
      const msg = "Sélectionnez une étude avant de générer le compte rendu.";
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }

    if (!dictationNotes.trim()) {
      const msg = "Les notes de dictée sont vides. Saisissez une dictée avant de générer le CR.";
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }

    setIsGenerating(true);
    setStructuredReport(null);

    try {
      // C2 — génération via API serveur (clé OpenAI non exposée au navigateur)
      const report = await apiFetch<StructuredReport>("/api/reports/structure", {
        method: "POST",
        body: JSON.stringify({
          studyId: selectedStudy.id,
          clinicalContext,
          rawNotes: dictationNotes,
          draft: true,
        }),
      });
      setStructuredReport(formatStructuredReport(report));
      setErrorMessage(null);
      toast.success("Compte rendu structuré généré");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Le service de génération de compte rendu est temporairement indisponible.";
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const analysis = detailQuery.data?.analysis ?? analyzeMut.data ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visionneuse radiologique"
        subtitle="Pipeline d'analyse d'images + structuration LLM des comptes rendus · Al Amal"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={!selectedStudy || analyzeMut.isPending}
              onClick={() => analyzeMut.mutate()}
            >
              {analyzeMut.isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <ScanLine className="mr-2 size-4" />
              )}
              Lancer l'analyse IA
            </Button>
            <Button
              type="button"
              disabled={!selectedStudy || isGenerating}
              onClick={() => void handleGenerateCR()}
            >
              {isGenerating ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 size-4" />
              )}
              {isGenerating ? "Génération…" : "Générer le CR"}
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[280px_1fr_340px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Études</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {studiesQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Chargement…</p>
            ) : null}
            {studiesQuery.isError ? (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertTitle>Chargement impossible</AlertTitle>
                <AlertDescription>
                  Impossible de récupérer les études. Vérifiez que le serveur est démarré.
                </AlertDescription>
              </Alert>
            ) : null}
            {studies.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setSelectedStudy(toSelectedStudy(s));
                  setPreviewUrl((prev) => {
                    if (prev) URL.revokeObjectURL(prev);
                    return null;
                  });
                  setFile(null);
                  setStructuredReport(null);
                  setErrorMessage(null);
                }}
                className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                  selectedStudy?.id === s.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <p className="text-sm font-semibold">{s.examLabel}</p>
                <p className="text-xs text-muted-foreground">{s.patientName}</p>
                <div className="mt-1 flex gap-1">
                  <Pill tone="neutral">{s.modality}</Pill>
                  <Pill tone="neutral">{s.status}</Pill>
                </div>
              </button>
            ))}
            {!studiesQuery.isLoading && !studiesQuery.isError && studies.length === 0 ? (
              <EmptyState
                compact
                icon={FolderOpen}
                title="Aucune étude"
                description="Aucun examen n'est encore rattaché au centre. Importez une image pour démarrer une analyse."
              />
            ) : null}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">
              {selectedStudy
                ? `${selectedStudy.studyType} · ${selectedStudy.patientName}`
                : "Sélectionnez une étude"}
            </CardTitle>
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-primary">
              <Upload className="size-4" />
              Importer image
              <input
                type="file"
                accept="image/*,.dcm"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setFile(f);
                  setPreviewUrl((prev) => {
                    if (prev) URL.revokeObjectURL(prev);
                    return URL.createObjectURL(f);
                  });
                }}
              />
            </label>
          </CardHeader>
          <CardContent>
            <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg bg-[radial-gradient(circle_at_30%_20%,#1e293b,#020617)]">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Aperçu radio"
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <div className="px-6 text-center text-slate-300">
                  <IconTile tone="primary">
                    <Activity className="size-5" />
                  </IconTile>
                  <p className="mt-3 text-sm font-medium">
                    {selectedStudy?.modality ?? "—"} · {selectedStudy?.bodyPart ?? "—"}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Importez une image ou lancez l'analyse sur les métadonnées de l'étude
                  </p>
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(transparent_95%,rgba(56,189,248,0.15)_96%)] bg-[length:100%_8px]" />
                </div>
              )}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="clinical-context">Contexte clinique</Label>
                <Textarea
                  id="clinical-context"
                  value={clinicalContext}
                  onChange={(e) => setClinicalContext(e.target.value)}
                  className="mt-1.5 min-h-20"
                />
              </div>
              <div>
                <Label htmlFor="dictation-notes">Notes / dictée</Label>
                <Textarea
                  id="dictation-notes"
                  value={dictationNotes}
                  onChange={(e) => {
                    setDictationNotes(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="Obligatoire — ex: Ventricules normaux, FLAIR sans anomalie…"
                  className="mt-1.5 min-h-20"
                  aria-invalid={Boolean(errorMessage && !dictationNotes.trim())}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ScanLine className="size-4" /> Analyse pipeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {analysis ? (
                <>
                  <div>
                    <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                      <span>Qualité image</span>
                      <span>{analysis.qualityScore}/100</span>
                    </div>
                    <Progress value={analysis.qualityScore} />
                  </div>
                  <dl className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <dt className="text-muted-foreground">Contraste</dt>
                      <dd className="font-medium">{analysis.metrics.contrast}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Netteté</dt>
                      <dd className="font-medium">{analysis.metrics.sharpness}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Bords</dt>
                      <dd className="font-medium">{analysis.metrics.edgeDensity}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Bruit</dt>
                      <dd className="font-medium">{analysis.metrics.noiseEstimate}</dd>
                    </div>
                  </dl>
                  <ul className="space-y-2">
                    {analysis.findings.map((f) => (
                      <li key={f.code} className="rounded-md border border-border px-3 py-2 text-sm">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-medium">{f.label}</span>
                          <Pill
                            tone={
                              f.severity === "severe"
                                ? "destructive"
                                : f.severity === "moderate"
                                  ? "warning"
                                  : "neutral"
                            }
                          >
                            {(f.confidence * 100).toFixed(0)}%
                          </Pill>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <p className="text-[11px] text-muted-foreground">
                    Modèle {analysis.model} · {analysis.latencyMs} ms
                  </p>
                </>
              ) : (
                <EmptyState
                  compact
                  icon={ScanLine}
                  title="Pas encore d'analyse"
                  description="Lancez le pipeline IA pour obtenir la qualité d'image, les métriques et les findings de cette étude."
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="size-4" /> Compte rendu structuré
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {errorMessage ? (
                <Alert variant="destructive">
                  <AlertCircle className="size-4" />
                  <AlertTitle>Échec de la génération</AlertTitle>
                  <AlertDescription className="whitespace-pre-wrap">{errorMessage}</AlertDescription>
                </Alert>
              ) : null}

              {isGenerating ? (
                <div className="flex flex-col items-center justify-center gap-3 py-8 text-muted-foreground">
                  <Loader2 className="size-6 animate-spin text-primary" />
                  <p>Génération du compte rendu via l&apos;API serveur…</p>
                </div>
              ) : structuredReport ? (
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-muted-foreground">
                  {structuredReport}
                </pre>
              ) : !errorMessage ? (
                <EmptyState
                  compact
                  icon={FileText}
                  title="Aucun compte rendu"
                  description="Saisissez une dictée (obligatoire), puis cliquez sur « Générer le CR » pour obtenir un compte rendu structuré par le LLM."
                />
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
