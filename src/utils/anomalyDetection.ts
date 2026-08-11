/**
 * Détection d'anomalies de facturation (analyse du moteur de conformité côté client).
 * Score hybride à règles : montant / horaire / fréquence.
 */

/** Acte radiologique scorable par le moteur. */
export type Study = {
  id: string;
  patientName: string;
  examType: string;
  amount: number;
  /** Moyenne / barème de référence pour cet examen (MAD). */
  bareme?: number;
  /** Horodatage ISO (date + heure) de l'enregistrement. */
  recordedAt: string;
};

export type AnomalyScoreResult = {
  /** Score de risque 0–100. */
  score: number;
  /** Motif principal (ex. "Montant atypique"). */
  motif: string;
  /** Tous les motifs déclenchés. */
  motifs: string[];
  /** Décomposition des points pour le debug / UI. */
  contributions: { rule: string; points: number }[];
};

/** Barèmes moyens MAD par famille / libellé d'examen. */
export const EXAM_AVERAGES: Record<string, number> = {
  IRM: 2500,
  "IRM Cérébrale": 2500,
  "IRM Lombaire": 2500,
  "IRM Genou": 2200,
  Scanner: 1500,
  "Scanner Thoracique": 1400,
  "Scanner Abdominal": 1600,
  "Scanner Cérébral": 1500,
  Échographie: 450,
  "Échographie Abdominale": 450,
  "Échographie Pelvienne": 400,
  Mammographie: 700,
  Radiologie: 250,
  "Radio Thorax": 250,
  "Radio Poignet": 250,
};

function resolveBareme(study: Study): number {
  if (study.bareme && study.bareme > 0) return study.bareme;
  const exact = EXAM_AVERAGES[study.examType];
  if (exact) return exact;
  const key = Object.keys(EXAM_AVERAGES).find((k) =>
    study.examType.toLowerCase().includes(k.toLowerCase()),
  );
  return key ? EXAM_AVERAGES[key]! : study.amount;
}

function parseRecordedAt(iso: string): Date {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? new Date(`${iso}T12:00:00`) : d;
}

function daysBetween(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24);
}

function sameExamFamily(a: string, b: string): boolean {
  const na = a.toLowerCase();
  const nb = b.toLowerCase();
  if (na === nb) return true;
  const tokens = ["irm", "scanner", "échographie", "echographie", "mammo", "radio"];
  return tokens.some((t) => na.includes(t) && nb.includes(t));
}

/**
 * Calcule un score d'anomalie (0–100) et un motif textuel pour un acte.
 * @param study Acte à scorer
 * @param history Corpus d'actes (même patient / examens récents) — analyse du moteur de conformité
 */
export function calculateAnomalyScore(study: Study, history: Study[] = []): AnomalyScoreResult {
  const contributions: { rule: string; points: number }[] = [];
  const motifs: string[] = [];
  const bareme = resolveBareme(study);
  const recorded = parseRecordedAt(study.recordedAt);
  const hour = recorded.getHours();
  const day = recorded.getDay(); // 0 = dimanche

  // 1) Montant aberrant vs moyenne / barème
  const ratio = study.amount / Math.max(1, bareme);
  if (ratio >= 2.5) {
    contributions.push({ rule: "Montant atypique (×2.5+)", points: 45 });
    motifs.push("Montant atypique");
  } else if (ratio >= 1.8) {
    contributions.push({ rule: "Montant atypique (×1.8+)", points: 35 });
    motifs.push("Montant atypique");
  } else if (ratio >= 1.35) {
    contributions.push({ rule: "Montant élevé vs barème", points: 20 });
    motifs.push("Montant atypique");
  }

  // 2) Horaire atypique (nuit / week-end tardif)
  const isWeekend = day === 0 || day === 6;
  const isNight = hour >= 21 || hour < 6;
  if (isWeekend && isNight) {
    contributions.push({ rule: "Horaire atypique (week-end nocturne)", points: 30 });
    motifs.push("Horaire atypique");
  } else if (isNight) {
    contributions.push({ rule: "Horaire atypique (nuit)", points: 22 });
    motifs.push("Horaire atypique");
  } else if (isWeekend && (hour < 8 || hour >= 19)) {
    contributions.push({ rule: "Horaire atypique (week-end hors plage)", points: 15 });
    motifs.push("Horaire atypique");
  }

  // 3) Fréquence anormale — mêmes examens récents pour le patient
  const recentSame = history.filter((h) => {
    if (h.id === study.id) return false;
    if (h.patientName !== study.patientName) return false;
    if (!sameExamFamily(h.examType, study.examType)) return false;
    return daysBetween(parseRecordedAt(h.recordedAt), recorded) <= 10;
  });

  if (recentSame.length >= 3) {
    contributions.push({ rule: "Fréquence anormale (≥3 en 10 j)", points: 35 });
    motifs.push("Fréquence anormale");
  } else if (recentSame.length >= 2) {
    contributions.push({ rule: "Fréquence anormale (2 en 10 j)", points: 25 });
    motifs.push("Fréquence anormale");
  } else if (recentSame.length === 1) {
    const gap = daysBetween(parseRecordedAt(recentSame[0]!.recordedAt), recorded);
    if (gap <= 3) {
      contributions.push({ rule: "Examen identique très récent (≤3 j)", points: 18 });
      motifs.push("Fréquence anormale");
    }
  }

  const raw = contributions.reduce((s, c) => s + c.points, 0);
  const score = Math.max(0, Math.min(100, Math.round(raw)));
  const motif = motifs[0] ?? (score > 0 ? "Signal faible" : "Comportement nominal");

  return {
    score,
    motif,
    motifs: motifs.length > 0 ? [...new Set(motifs)] : [motif],
    contributions,
  };
}

/** Seuils uniques du référentiel de risque, partagés par toute l'application. */
export const RISK_THRESHOLDS = { critique: 85, eleve: 60 } as const;

export type RiskLevel = "critique" | "eleve" | "faible";

export function anomalyRiskLevel(score: number): RiskLevel {
  if (score > RISK_THRESHOLDS.critique) return "critique";
  if (score > RISK_THRESHOLDS.eleve) return "eleve";
  return "faible";
}

/** Tone badge : rouge > 85, orange > 60, vert sinon. */
export function anomalyRiskTone(score: number): "destructive" | "warning" | "success" {
  const level = anomalyRiskLevel(score);
  if (level === "critique") return "destructive";
  if (level === "eleve") return "warning";
  return "success";
}

export function anomalyRiskLabel(score: number): string {
  const level = anomalyRiskLevel(score);
  if (level === "critique") return "Critique";
  if (level === "eleve") return "Élevé";
  return "Faible";
}
