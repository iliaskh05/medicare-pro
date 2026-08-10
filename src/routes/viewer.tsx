import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  FileText,
  Loader2,
  ScanLine,
  Sparkles,
  FileDown,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader, Pill, IconTile } from "@/components/ui-kit";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch, getApiKey } from "@/lib/api-client";
import { telechargerDossierPdf } from "@/lib/pdf-export";
import type {
  ImageAnalysisResult,
  ImagingStudy,
  StructuredReport,
} from "@/server/store/types";

export const Route = createFileRoute("/viewer")({
  head: () => ({
    meta: [
      { title: "Visionneuse & analyse IA — RadioCRM" },
      {
        name: "description",
        content:
          "Visionneuse d'examens radiologiques connectée au pipeline d'analyse d'images et à la structuration automatique des comptes rendus.",
      },
      { property: "og:title", content: "Visionneuse & analyse IA — RadioCRM" },
      {
        property: "og:description",
        content:
          "Analysez les examens et générez des comptes rendus structurés en un clic.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ViewerPage,
});

function LoadingSpinner({ label = "Chargement…" }: { label?: string }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="size-6 animate-spin text-primary" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

function formatReport(report: StructuredReport | null | undefined): string | null {
  const s = report?.sections;
  if (!s) return null;
  return [
    "1. Renseignements cliniques",
    s.indication?.trim() || "Non précisé",
    "",
    "2. Technique",
    s.technique?.trim() || "Non précisé",
    "",
    "3. Résultats",
    s.resultats?.trim() || "Non précisé",
    "",
    "4. Conclusion",
    s.conclusion?.trim() || "Non précisé",
  ].join("\n");
}

function ViewerPage() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [clinicalContext, setClinicalContext] = useState(
    "Douleurs / bilan demandé par le médecin traitant.",
  );
  const [dictationNotes, setDictationNotes] = useState("");
  const [structuredReport, setStructuredReport] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const studiesQuery = useQuery({
    queryKey: ["imaging-studies"],
    queryFn: () => apiFetch<{ studies: ImagingStudy[] }>("/api/imaging/studies"),
    retry: 1,
  });

  const studies = useMemo(
    () => (Array.isArray(studiesQuery.data?.studies) ? studiesQuery.data!.studies : []),
    [studiesQuery.data],
  );

  useEffect(() => {
    if (studies.length === 0) return;
    const stillThere = studies.some((s) => s?.id === selectedId);
    if (!stillThere) setSelectedId(studies[0]?.id ?? null);
  }, [studies, selectedId]);

  const detailQuery = useQuery({
    queryKey: ["imaging-study", selectedId],
    enabled: Boolean(selectedId),
    retry: 1,
    queryFn: () =>
      apiFetch<{ study: ImagingStudy | null; analysis: ImageAnalysisResult | null }>(
        `/api/imaging/studies/${encodeURIComponent(selectedId ?? "")}`,
      ),
  });

  const selectedStudy: ImagingStudy | null =
    detailQuery.data?.study ?? studies.find((s) => s?.id === selectedId) ?? null;

  const analyzeMut = useMutation({
    mutationFn: async (): Promise<ImageAnalysisResult | null> => {
      if (!selectedId) throw new Error("Sélectionnez une étude avant de lancer l'analyse.");
      if (file) {
        const form = new FormData();
        form.append("studyId", selectedId);
        form.append("file", file);
        const res = await fetch("/api/imaging/analyze", {
          method: "POST",
          headers: { "x-api-key": getApiKey() },
          body: form,
        });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) {
          throw new Error(json?.error?.message ?? "Analyse échouée");
        }
        return (json.data ?? null) as ImageAnalysisResult | null;
      }
      return apiFetch<ImageAnalysisResult>("/api/imaging/analyze", {
        method: "POST",
        body: JSON.stringify({ studyId: selectedId }),
      });
    },
    onSuccess: () => {
      toast.success("Analyse d'image terminée");
      void qc.invalidateQueries({ queryKey: ["imaging-study", selectedId] });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Analyse échouée"),
  });

  const reportMut = useMutation({
    mutationFn: async (): Promise<string> => {
      if (!selectedId) throw new Error("Sélectionnez une étude avant de générer le compte rendu.");
      if (!dictationNotes.trim()) {
        throw new Error("Les notes de dictée sont vides. Saisissez une dictée avant de générer le CR.");
      }
      const report = await apiFetch<StructuredReport>("/api/reports/structure", {
        method: "POST",
        body: JSON.stringify({
          studyId: selectedId,
          clinicalContext: clinicalContext.trim(),
          rawNotes: dictationNotes.trim(),
          draft: true,
        }),
      });
      const text = formatReport(report);
      if (!text) throw new Error("Le service n'a retourné aucun compte rendu exploitable.");
      return text;
    },
    onMutate: () => {
      setErrorMessage(null);
      setStructuredReport(null);
    },
    onSuccess: (text) => {
      setStructuredReport(text);
      toast.success("Compte rendu structuré généré");
    },
    onError: (e: unknown) => {
      const message =
        e instanceof Error
          ? e.message
          : "Le service de génération de compte rendu est temporairement indisponible.";
      setErrorMessage(message);
      toast.error(message);
    },
  });

  const analysis = detailQuery.data?.analysis ?? analyzeMut.data ?? null;
  const metrics = analysis?.metrics;
  const findings = Array.isArray(analysis?.findings) ? analysis!.findings : [];
  const isGenerating = reportMut.isPending;

  const exporterComptePdf = () => {
    if (!structuredReport) {
      toast.error("Générez d'abord le compte rendu avant de l'exporter en PDF.");
      return;
    }
    telechargerDossierPdf({
      titre: "Compte rendu radiologique",
      reference: selectedStudy?.id ?? "Étude inconnue",
      lignes: [
        { label: "Patient", valeur: selectedStudy?.patientName ?? "—" },
        { label: "Identifiant patient", valeur: selectedStudy?.patientId ?? "—" },
        { label: "Examen", valeur: selectedStudy?.examLabel ?? "—" },
        { label: "Modalité", valeur: selectedStudy?.modality ?? "—" },
        { label: "Région explorée", valeur: selectedStudy?.bodyPart ?? "—" },
        {
          label: "Date d'acquisition",
          valeur: selectedStudy?.acquiredAt
            ? new Date(selectedStudy.acquiredAt).toLocaleString("fr-MA")
            : "—",
        },
        { label: "Score de qualité image", valeur: analysis ? `${analysis.qualityScore}%` : "—" },
      ],
      blocs: [
        { titre: "Contexte clinique", contenu: clinicalContext.trim() || "Non renseigné" },
        { titre: "Compte rendu structuré", contenu: structuredReport },
        {
          titre: "Signes détectés par l'IA",
          contenu:
            findings.length > 0
              ? findings.map((f) => `${f.label} (${Math.round(f.confidence * 100)}%)`).join(" · ")
              : "Aucun signe automatique retenu",
        },
      ],
      mention:
        "Compte rendu assisté par IA — relecture et validation par un radiologue senior obligatoires avant remise au patient.",
    });
  };

  if (studiesQuery.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Visionneuse radiologique"
          subtitle="Pipeline d'analyse d'images + structuration des comptes rendus"
        />
        <Card className="shadow-none">
          <CardContent>
            <LoadingSpinner label="Chargement des études…" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visionneuse radiologique"
        subtitle="Pipeline d'analyse d'images + structuration des comptes rendus"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={!selectedId || analyzeMut.isPending}
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
              disabled={!selectedId || isGenerating}
              onClick={() => reportMut.mutate()}
            >
              {isGenerating ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 size-4" />
              )}
              {isGenerating ? "Génération…" : "Générer le CR"}
            </Button>
            <Button
              type="button"
              className="bg-primary shadow-sm transition-shadow hover:shadow-md"
              disabled={!structuredReport}
              onClick={exporterComptePdf}
            >
              <FileDown className="mr-2 size-4" />
              Exporter le Compte Rendu (PDF)
            </Button>
          </div>
        }
      />

      {studiesQuery.isError ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Études indisponibles</AlertTitle>
          <AlertDescription>
            {studiesQuery.error instanceof Error
              ? studiesQuery.error.message
              : "Impossible de charger la liste des examens."}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[280px_1fr_340px]">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Études</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {studies.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucune étude disponible pour le moment.
              </p>
            ) : null}
            {studies.map((s) => (
              <button
                key={s?.id ?? Math.random().toString(36)}
                type="button"
                onClick={() => {
                  setSelectedId(s?.id ?? null);
                  setPreviewUrl(null);
                  setFile(null);
                  setStructuredReport(null);
                  setErrorMessage(null);
                  reportMut.reset();
                  analyzeMut.reset();
                }}
                className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                  selectedId === s?.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <p className="text-sm font-semibold">{s?.examLabel ?? "Examen"}</p>
                <p className="text-xs text-muted-foreground">{s?.patientName ?? "—"}</p>
                <div className="mt-1 flex gap-1">
                  <Pill tone="neutral">{s?.modality ?? "—"}</Pill>
                  <Pill tone="neutral">{s?.status ?? "—"}</Pill>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-none overflow-hidden">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">
              {selectedStudy
                ? `${selectedStudy.examLabel ?? "Examen"} · ${selectedStudy.patientName ?? "—"}`
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
                  try {
                    setPreviewUrl(URL.createObjectURL(f));
                  } catch {
                    setPreviewUrl(null);
                  }
                }}
              />
            </label>
          </CardHeader>
          <CardContent>
            <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg bg-[radial-gradient(circle_at_30%_20%,#1e293b,#020617)]">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Aperçu de l'examen radiologique importé"
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
                  onChange={(e) => setClinicalContext(e.target.value ?? "")}
                  className="mt-1.5 min-h-20"
                />
              </div>
              <div>
                <Label htmlFor="dictation-notes">Notes / dictée</Label>
                <Textarea
                  id="dictation-notes"
                  value={dictationNotes}
                  onChange={(e) => {
                    setDictationNotes(e.target.value ?? "");
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
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ScanLine className="size-4" /> Analyse pipeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {detailQuery.isLoading ? (
                <LoadingSpinner label="Chargement de l'analyse…" />
              ) : analysis ? (
                <>
                  <div>
                    <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                      <span>Qualité image</span>
                      <span>{analysis.qualityScore ?? 0}/100</span>
                    </div>
                    <Progress value={Number(analysis.qualityScore ?? 0)} />
                  </div>
                  <dl className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <dt className="text-muted-foreground">Contraste</dt>
                      <dd className="font-medium">{metrics?.contrast ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Netteté</dt>
                      <dd className="font-medium">{metrics?.sharpness ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Bords</dt>
                      <dd className="font-medium">{metrics?.edgeDensity ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Bruit</dt>
                      <dd className="font-medium">{metrics?.noiseEstimate ?? "—"}</dd>
                    </div>
                  </dl>
                  <ul className="space-y-2">
                    {findings.map((f, i) => (
                      <li
                        key={f?.code ?? `finding-${i}`}
                        className="rounded-md border border-border px-3 py-2 text-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-medium">{f?.label ?? "Observation"}</span>
                          <Pill
                            tone={
                              f?.severity === "severe"
                                ? "destructive"
                                : f?.severity === "moderate"
                                  ? "warning"
                                  : "neutral"
                            }
                          >
                            {((Number(f?.confidence ?? 0)) * 100).toFixed(0)}%
                          </Pill>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <p className="text-[11px] text-muted-foreground">
                    Modèle {analysis.model ?? "—"} · {analysis.latencyMs ?? 0} ms
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aucune analyse pour cette étude. Lancez le pipeline IA.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-none">
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
                  <AlertDescription className="whitespace-pre-wrap">
                    {errorMessage}
                  </AlertDescription>
                </Alert>
              ) : null}

              {isGenerating ? (
                <LoadingSpinner label="Génération du compte rendu…" />
              ) : structuredReport ? (
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-muted-foreground">
                  {structuredReport}
                </pre>
              ) : !errorMessage ? (
                <p className="text-muted-foreground">
                  Saisissez une dictée (obligatoire), puis cliquez sur « Générer le CR ».
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
