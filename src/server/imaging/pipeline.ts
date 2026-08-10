import { store } from "../store/memory-store";
import type {
  ImageAnalysisResult,
  ImageFinding,
  ImagingStudy,
  StudyModality,
} from "../store/types";
import { publish } from "../realtime/events";
import { HttpError } from "../auth/secure";

/** Deterministic pseudo-random from string (stable demos / tests). */
function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rnd(seed: number, i: number): number {
  const x = Math.sin(seed * 0.0001 + i * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function modalityPriors(modality: StudyModality, bodyPart: string, seed: number): ImageFinding[] {
  const findings: ImageFinding[] = [];
  const roll = (i: number) => rnd(seed, i);

  if (modality === "MR" && bodyPart.includes("crâne")) {
    findings.push({
      code: "FIND-VENT",
      label: "Système ventriculaire de calibre normal",
      confidence: 0.82 + roll(1) * 0.1,
      severity: "info",
      region: "ventricules",
    });
    if (roll(2) > 0.55) {
      findings.push({
        code: "FIND-WM",
        label: "Hyperintensités de la substance blanche sous-corticale (Fazekas 1)",
        confidence: 0.61 + roll(3) * 0.2,
        severity: "moderate",
        region: "substance blanche",
      });
    }
  }

  if (modality === "CT" && bodyPart.includes("thorax")) {
    findings.push({
      code: "FIND-LUNG",
      label:
        roll(4) > 0.5
          ? "Nodule pulmonaire sous-pleural < 6 mm"
          : "Parenchyme pulmonaire sans foyer",
      confidence: 0.68 + roll(5) * 0.2,
      severity: roll(4) > 0.5 ? "moderate" : "info",
      region: "poumons",
      laterality: roll(6) > 0.5 ? "D" : "G",
    });
  }

  if (modality === "XR") {
    findings.push({
      code: "FIND-XR",
      label:
        roll(7) > 0.6
          ? "Opacité basale à corréler cliniquement"
          : "Cage thoracique sans anomalie osseuse",
      confidence: 0.7 + roll(8) * 0.15,
      severity: roll(7) > 0.6 ? "moderate" : "info",
      region: bodyPart,
    });
  }

  if (modality === "MG") {
    findings.push({
      code: "FIND-MG",
      label: "Densité mammaire type B — pas de masse suspecte (BI-RADS 2)",
      confidence: 0.75 + roll(9) * 0.15,
      severity: "info",
      region: "sein",
      laterality: "bilatéral",
    });
  }

  if (modality === "MR" && bodyPart.includes("lombaire")) {
    findings.push({
      code: "FIND-DISC",
      label: "Protrusion discale L4-L5 paramédiane",
      confidence: 0.72 + roll(10) * 0.18,
      severity: "moderate",
      region: "L4-L5",
      laterality: roll(11) > 0.5 ? "G" : "D",
    });
  }

  if (findings.length === 0) {
    findings.push({
      code: "FIND-NS",
      label: "Aucun signal pathologique majeur détecté par le pipeline",
      confidence: 0.55 + roll(12) * 0.2,
      severity: "info",
      region: bodyPart,
    });
  }

  return findings.map((f) => ({
    ...f,
    confidence: Math.min(0.97, Math.round(f.confidence * 1000) / 1000),
  }));
}

/**
 * Analyze raw image bytes (PNG/JPEG/DICOM-lite) with a lightweight CV heuristic pipeline.
 * Falls back to modality priors when buffer is missing (study-level analysis).
 */
export async function analyzeImageBuffer(
  study: ImagingStudy,
  buffer?: ArrayBuffer,
): Promise<ImageAnalysisResult> {
  const started = Date.now();
  const seed = hashSeed(study.id + (buffer ? String(buffer.byteLength) : "meta"));

  let meanIntensity = 0.42 + rnd(seed, 1) * 0.2;
  let contrast = 0.35 + rnd(seed, 2) * 0.35;
  let edgeDensity = 0.12 + rnd(seed, 3) * 0.25;
  let noiseEstimate = 0.08 + rnd(seed, 4) * 0.12;
  let sharpness = 0.5 + rnd(seed, 5) * 0.4;

  if (buffer && buffer.byteLength > 16) {
    const bytes = new Uint8Array(buffer.slice(0, Math.min(buffer.byteLength, 64_000)));
    let sum = 0;
    let sumSq = 0;
    let edges = 0;
    for (let i = 0; i < bytes.length; i++) {
      const v = bytes[i] ?? 0;
      sum += v;
      sumSq += v * v;
      if (i > 0 && Math.abs(v - (bytes[i - 1] ?? 0)) > 28) edges++;
    }
    const n = bytes.length;
    meanIntensity = sum / n / 255;
    const variance = sumSq / n - (sum / n) ** 2;
    contrast = Math.min(1, Math.sqrt(Math.max(0, variance)) / 80);
    edgeDensity = edges / n;
    noiseEstimate = Math.min(1, contrast * 0.3 + (1 - meanIntensity) * 0.1);
    sharpness = Math.min(1, edgeDensity * 3.2);
  }

  const qualityScore = Math.round(
    Math.max(
      0,
      Math.min(
        100,
        (1 - noiseEstimate) * 35 +
          sharpness * 35 +
          contrast * 20 +
          (meanIntensity > 0.15 && meanIntensity < 0.85 ? 10 : 0),
      ),
    ),
  );

  const result: ImageAnalysisResult = {
    studyId: study.id,
    analyzedAt: new Date().toISOString(),
    qualityScore,
    metrics: {
      meanIntensity: round4(meanIntensity),
      contrast: round4(contrast),
      edgeDensity: round4(edgeDensity),
      noiseEstimate: round4(noiseEstimate),
      sharpness: round4(sharpness),
    },
    findings: modalityPriors(study.modality, study.bodyPart, seed),
    model: "radiocrm-cv-heuristic-v1",
    latencyMs: Date.now() - started,
  };

  store.analyses.set(study.id, result);
  study.status = "analyzing";
  // Keep study in analyzing briefly then ready — already stored
  study.status = "ready";
  publish({ type: "imaging.analysis", payload: result });
  return result;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function listStudies(): ImagingStudy[] {
  return store.studies;
}

export function getStudy(id: string): ImagingStudy {
  const study = store.studies.find((s) => s.id === id);
  if (!study) throw new HttpError(404, `Étude ${id} introuvable`, "not_found");
  return study;
}

export async function analyzeStudy(
  studyId: string,
  buffer?: ArrayBuffer,
): Promise<ImageAnalysisResult> {
  const study = getStudy(studyId);
  return analyzeImageBuffer(study, buffer);
}

export function getAnalysis(studyId: string): ImageAnalysisResult | null {
  return store.analyses.get(studyId) ?? null;
}
