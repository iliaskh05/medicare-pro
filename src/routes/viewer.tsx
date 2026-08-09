import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Activity,
  FileText,
  Loader2,
  ScanLine,
  Sparkles,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader, Pill, IconTile } from "@/components/ui-kit";
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

export const Route = createFileRoute("/viewer")({
  head: () => ({
    meta: [
      { title: "Visionneuse & analyse IA — RadioCRM" },
      {
        name: "description",
        content: "Visionneuse d'examens radiologiques connectée au pipeline d'analyse d'images et au LLM de compte rendu.",
      },
    ],
  }),
  component: ViewerPage,
});

function ViewerPage() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [context, setContext] = useState("Douleurs / bilan demandé par le médecin traitant.");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const studiesQuery = useQuery({
    queryKey: ["imaging-studies"],
    queryFn: () => apiFetch<{ studies: ImagingStudy[] }>("/api/imaging/studies"),
  });

  const studies = studiesQuery.data?.studies ?? [];
  const study = useMemo(
    () => studies.find((s) => s.id === (selectedId ?? studies[0]?.id)) ?? null,
    [studies, selectedId],
  );

  const detailQuery = useQuery({
    queryKey: ["imaging-study", study?.id],
    enabled: !!study?.id,
    queryFn: () =>
      apiFetch<{ study: ImagingStudy; analysis: ImageAnalysisResult | null }>(
        `/api/imaging/studies/${study!.id}`,
      ),
  });

  const analyzeMut = useMutation({
    mutationFn: async () => {
      if (!study) throw new Error("Aucune étude");
      if (file) {
        const form = new FormData();
        form.append("studyId", study.id);
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
        body: JSON.stringify({ studyId: study.id }),
      });
    },
    onSuccess: () => {
      toast.success("Analyse d'image terminée");
      qc.invalidateQueries({ queryKey: ["imaging-study", study?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reportMut = useMutation({
    mutationFn: () =>
      apiFetch<StructuredReport>("/api/reports/structure", {
        method: "POST",
        body: JSON.stringify({
          studyId: study!.id,
          clinicalContext: context,
          rawNotes: notes,
          draft: true,
        }),
      }),
    onSuccess: () => toast.success("Compte rendu structuré généré"),
    onError: (e: Error) => toast.error(e.message),
  });

  const analysis = detailQuery.data?.analysis ?? analyzeMut.data ?? null;
  const report = reportMut.data ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visionneuse radiologique"
        subtitle="Pipeline d'analyse d'images + structuration LLM des comptes rendus"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={!study || analyzeMut.isPending}
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
              disabled={!study || !analysis || reportMut.isPending}
              onClick={() => reportMut.mutate()}
            >
              {reportMut.isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 size-4" />
              )}
              Générer le CR
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[280px_1fr_340px]">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Études</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {studiesQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Chargement…</p>
            ) : null}
            {studies.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setSelectedId(s.id);
                  setPreviewUrl(null);
                  setFile(null);
                  reportMut.reset();
                }}
                className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                  study?.id === s.id
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
          </CardContent>
        </Card>

        <Card className="shadow-none overflow-hidden">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">
              {study ? `${study.examLabel} · ${study.patientName}` : "Sélectionnez une étude"}
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
                  setPreviewUrl(URL.createObjectURL(f));
                }}
              />
            </label>
          </CardHeader>
          <CardContent>
            <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg bg-[radial-gradient(circle_at_30%_20%,#1e293b,#020617)]">
              {previewUrl ? (
                <img src={previewUrl} alt="Aperçu radio" className="max-h-full max-w-full object-contain" />
              ) : (
                <div className="px-6 text-center text-slate-300">
                  <IconTile tone="primary">
                    <Activity className="size-5" />
                  </IconTile>
                  <p className="mt-3 text-sm font-medium">
                    {study?.modality ?? "—"} · {study?.bodyPart ?? "—"}
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
                <Label htmlFor="ctx">Contexte clinique</Label>
                <Textarea
                  id="ctx"
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  className="mt-1.5 min-h-20"
                />
              </div>
              <div>
                <Label htmlFor="notes">Notes / dictée</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Saisie libre avant structuration LLM…"
                  className="mt-1.5 min-h-20"
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
                          <Pill tone={f.severity === "severe" ? "destructive" : f.severity === "moderate" ? "warning" : "neutral"}>
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
              {report ? (
                <>
                  <section>
                    <h4 className="font-semibold">Indication</h4>
                    <p className="text-muted-foreground">{report.sections.indication}</p>
                  </section>
                  <section>
                    <h4 className="font-semibold">Technique</h4>
                    <p className="text-muted-foreground">{report.sections.technique}</p>
                  </section>
                  <section>
                    <h4 className="font-semibold">Résultats</h4>
                    <p className="whitespace-pre-wrap text-muted-foreground">
                      {report.sections.resultats}
                    </p>
                  </section>
                  <section>
                    <h4 className="font-semibold">Conclusion</h4>
                    <p className="text-muted-foreground">{report.sections.conclusion}</p>
                  </section>
                  <p className="text-[11px] text-muted-foreground">
                    {report.model} · {report.draft ? "brouillon" : "final"} · {report.id}
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground">
                  Générez un CR après analyse — LLM si clé configurée, sinon heuristique clinique.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
