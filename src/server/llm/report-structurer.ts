import { z } from "zod";

import { serverConfig } from "../config";
import { HttpError } from "../auth/secure";
import { getAnalysis, getStudy } from "../imaging/pipeline";
import { store } from "../store/memory-store";
import type { ImageAnalysisResult, StructuredReport } from "../store/types";
import { publish } from "../realtime/events";

const structuredSchema = z.object({
  indication: z.string(),
  technique: z.string(),
  resultats: z.string(),
  conclusion: z.string(),
  codes: z
    .array(
      z.object({
        system: z.string(),
        code: z.string(),
        display: z.string(),
      }),
    )
    .default([]),
});

export type StructureReportInput = {
  studyId: string;
  clinicalContext?: string;
  rawNotes?: string;
  draft?: boolean;
};

function buildHeuristicReport(
  studyId: string,
  analysis: ImageAnalysisResult | null,
  clinicalContext?: string,
  rawNotes?: string,
): z.infer<typeof structuredSchema> {
  const study = getStudy(studyId);
  const findings = analysis?.findings ?? [];
  const findingsText =
    findings.length > 0
      ? findings
          .map(
            (f) =>
              `- ${f.label}${f.laterality ? ` (${f.laterality})` : ""} [confiance ${(f.confidence * 100).toFixed(0)} %]`,
          )
          .join("\n")
      : "- Examen sans anomalie majeure détectée par l'IA (relecture humaine requise).";

  const techniqueByModality: Record<string, string> = {
    MR: "Acquisition multi-séquences (T1, T2, FLAIR) sans puis avec injection selon protocole centre.",
    CT: "Acquisition hélicoïdale, reconstructions multiplans, filtre standard et pulmonaire si applicable.",
    XR: "Incidences standard de face et de profil, constantes adaptées au patient.",
    US: "Échographie en temps réel, sondes adaptées, Doppler couleur si indiqué.",
    MG: "Mammographie numérique bilatérale, incidences cranio-caudale et médio-latérale oblique.",
  };

  return {
    indication:
      clinicalContext?.trim() ||
      `Bilan ${study.examLabel.toLowerCase()} — corrélation clinique à préciser par le médecin demandeur.`,
    technique: techniqueByModality[study.modality] ?? "Technique standard du centre.",
    resultats: [findingsText, rawNotes?.trim() ? `\nNotes dictée:\n${rawNotes.trim()}` : ""]
      .filter(Boolean)
      .join("\n"),
    conclusion:
      findings.some((f) => f.severity !== "info")
        ? "Anomalies décrites ci-dessus. Corrélation clinique et suivi selon les recommandations en vigueur. Compte rendu à valider par le radiologue."
        : "Pas d'anomalie significative détectée dans les limites de l'examen. Validation radiologue obligatoire.",
    codes: findings.slice(0, 3).map((f) => ({
      system: "RadioCRM-FIND",
      code: f.code,
      display: f.label,
    })),
  };
}

async function callLlmJson(prompt: string): Promise<z.infer<typeof structuredSchema> | null> {
  const { apiKey, baseUrl, model } = serverConfig.llm;
  if (!apiKey) return null;

  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Tu es un assistant de radiologie clinique au Maroc. Structure les comptes rendus en JSON strict avec les clés: indication, technique, resultats, conclusion, codes (array of {system,code,display}). Réponds uniquement en français médical professionnel. N'invente pas de diagnostic certain; utilise un langage prudent.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    console.error("LLM error", res.status, await res.text());
    return null;
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) return null;

  try {
    return structuredSchema.parse(JSON.parse(content));
  } catch (e) {
    console.error("LLM JSON parse failed", e);
    return null;
  }
}

export async function structureReport(input: StructureReportInput): Promise<StructuredReport> {
  const study = getStudy(input.studyId);
  const analysis = getAnalysis(input.studyId);

  const prompt = [
    `Étude: ${study.id}`,
    `Patient: ${study.patientName} (${study.patientId})`,
    `Examen: ${study.examLabel} / ${study.modality} / ${study.bodyPart}`,
    `Contexte clinique: ${input.clinicalContext ?? "non précisé"}`,
    `Notes brutes: ${input.rawNotes ?? "aucune"}`,
    `Findings IA: ${JSON.stringify(analysis?.findings ?? [])}`,
    `Qualité image: ${analysis?.qualityScore ?? "n/a"}`,
  ].join("\n");

  const llm = await callLlmJson(prompt);
  const structured =
    llm ??
    buildHeuristicReport(input.studyId, analysis, input.clinicalContext, input.rawNotes);

  const report: StructuredReport = {
    id: `CR-${study.id}-${Date.now().toString(36)}`,
    studyId: study.id,
    patientId: study.patientId,
    examLabel: study.examLabel,
    language: "fr",
    sections: {
      indication: structured.indication,
      technique: structured.technique,
      resultats: structured.resultats,
      conclusion: structured.conclusion,
    },
    codes: structured.codes,
    generatedAt: new Date().toISOString(),
    model: llm ? serverConfig.llm.model : "radiocrm-report-heuristic-v1",
    draft: input.draft ?? true,
  };

  store.reports.set(report.id, report);
  study.status = "reported";
  publish({ type: "report.ready", payload: report });
  return report;
}

export function getReport(id: string): StructuredReport {
  const report = store.reports.get(id);
  if (!report) throw new HttpError(404, "Compte rendu introuvable", "not_found");
  return report;
}

export function listReports(studyId?: string): StructuredReport[] {
  const all = [...store.reports.values()];
  return studyId ? all.filter((r) => r.studyId === studyId) : all;
}
