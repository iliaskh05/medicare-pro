import { serverConfig } from "../config";
import { HttpError } from "../auth/secure";
import { publish } from "../realtime/events";
import { store } from "../store/memory-store";
import type { FraudScoreResult } from "../store/types";
import { extractFeatures, featureArray, type InvoiceLike } from "./features";
import { loadHistoricalLabeledInvoices } from "./historical-labels";
import { anomalyThreshold, fitKMeans, predictCluster, type KMeansModel } from "./kmeans";
import { fitLogistic, predictProba, type LogisticModel } from "./logistic";

type EngineState = {
  kmeans: KMeansModel;
  threshold: number;
  logistic: LogisticModel;
  trainedAt: string;
  trainX: number[][];
};

const g = globalThis as typeof globalThis & { __radiocrmFraud?: EngineState };

function reasonsFromFeatures(
  invoice: InvoiceLike,
  features: ReturnType<typeof extractFeatures>,
  unsupervised: { isWeakSignal: boolean; anomalyDistance: number },
  proba: number,
): string[] {
  const reasons: string[] = [];
  if (features.baremeRatio >= 1.6) reasons.push("Montant hors norme");
  if (features.examsLast30Days >= 3 && features.daysSinceLastSameExam <= 10) {
    reasons.push("Sur-prescription");
  }
  if (features.isGenderIncoherent) reasons.push("Incohérence des actes");
  if (features.isDuplicate) reasons.push("Doublon de facturation");
  if (features.mutuelleExpired) reasons.push("Mutuelle expirée");
  if (unsupervised.isWeakSignal) {
    reasons.push(`Signal faible (distance cluster ${unsupervised.anomalyDistance.toFixed(2)})`);
  }
  if (proba >= 0.75 && reasons.length === 0)
    reasons.push("Profil similaire aux fraudes historiques");
  if (reasons.length === 0) reasons.push("Revue de routine");
  return reasons;
}

function niveauFromScore(score: number): FraudScoreResult["niveau"] {
  if (score >= 80) return "critique";
  if (score >= 60) return "eleve";
  if (score >= 40) return "moyen";
  return "faible";
}

export function trainHybridEngine(): EngineState {
  const labeled = loadHistoricalLabeledInvoices();
  const vectors = labeled.map((row) => extractFeatures(row, labeled));
  const X = vectors.map(featureArray);
  const y = labeled.map((r) => r.label);

  const kmeans = fitKMeans(X, 4, 50);
  const threshold = anomalyThreshold(kmeans, X, 0.88);
  const logistic = fitLogistic(X, y, {
    epochs: 320,
    lr: 0.4,
    l2: 0.02,
    version: "hybrid-logreg-v1",
  });

  const state: EngineState = {
    kmeans,
    threshold,
    logistic,
    trainedAt: new Date().toISOString(),
    trainX: X,
  };
  g.__radiocrmFraud = state;
  return state;
}

export function getEngine(): EngineState {
  return g.__radiocrmFraud ?? trainHybridEngine();
}

async function tryRemoteMlScore(invoice: InvoiceLike): Promise<FraudScoreResult | null> {
  try {
    const res = await fetch(`${serverConfig.mlServiceUrl}/fraud/score`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(invoice),
      signal: AbortSignal.timeout(1200),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { data?: FraudScoreResult };
    return data.data ?? null;
  } catch {
    return null;
  }
}

export async function scoreInvoice(
  invoice: InvoiceLike,
  opts: { preferRemote?: boolean } = {},
): Promise<FraudScoreResult> {
  if (opts.preferRemote !== false) {
    const remote = await tryRemoteMlScore(invoice);
    if (remote) {
      store.fraudScores.set(remote.invoiceId, remote);
      if (remote.score >= 60) publish({ type: "fraud.alert", payload: remote });
      return remote;
    }
  }

  const engine = getEngine();
  const features = extractFeatures(invoice);
  const x = featureArray(features);
  const cluster = predictCluster(engine.kmeans, x);
  const isWeakSignal = cluster.distance > engine.threshold;
  const proba = predictProba(engine.logistic, x);

  // Hybrid blend: supervised probability + unsupervised anomaly + bareme overshoot
  const anomalyBoost = isWeakSignal
    ? Math.min(0.35, (cluster.distance - engine.threshold) * 0.55)
    : 0;
  const baremeBoost = Math.max(0, Math.min(0.35, (features.baremeRatio - 1) * 0.28));
  const ruleBoost =
    (features.isDuplicate ? 0.12 : 0) +
    (features.isGenderIncoherent ? 0.18 : 0) +
    (features.examsLast30Days >= 4 ? 0.1 : 0);
  const blended = Math.min(
    0.99,
    proba * 0.55 + anomalyBoost + baremeBoost + ruleBoost + (proba > 0.6 ? 0.08 : 0),
  );
  const score = Math.round(blended * 100);

  const decision = store.fraudDecisions.get(invoice.id) ?? "pending";
  const result: FraudScoreResult = {
    invoiceId: invoice.id,
    patientName: invoice.patient,
    amount: invoice.total,
    score,
    niveau: niveauFromScore(score),
    raison: reasonsFromFeatures(
      invoice,
      features,
      {
        isWeakSignal,
        anomalyDistance: cluster.distance,
      },
      proba,
    ),
    unsupervised: {
      clusterId: cluster.clusterId,
      anomalyDistance: Math.round(cluster.distance * 1000) / 1000,
      isWeakSignal,
    },
    supervised: {
      probability: Math.round(proba * 1000) / 1000,
      modelVersion: engine.logistic.version,
    },
    decision,
    scoredAt: new Date().toISOString(),
  };

  store.fraudScores.set(result.invoiceId, result);
  if (result.score >= 60) publish({ type: "fraud.alert", payload: result });
  return result;
}

export async function runFullScan(invoices: InvoiceLike[]): Promise<FraudScoreResult[]> {
  getEngine();
  const results: FraudScoreResult[] = [];
  for (const inv of invoices) {
    results.push(await scoreInvoice(inv, { preferRemote: false }));
  }
  return results.sort((a, b) => b.score - a.score);
}

export function decideInvoice(
  invoiceId: string,
  decision: "validated" | "blocked",
): FraudScoreResult {
  store.fraudDecisions.set(invoiceId, decision);
  const existing = store.fraudScores.get(invoiceId);
  if (!existing) {
    throw new HttpError(404, "Score introuvable — lancez d'abord l'analyse", "not_found");
  }
  const updated = { ...existing, decision };
  store.fraudScores.set(invoiceId, updated);
  return updated;
}

export function listAlerts(minScore = 0): FraudScoreResult[] {
  return [...store.fraudScores.values()]
    .filter((a) => a.score >= minScore)
    .sort((a, b) => b.score - a.score);
}

export function engineMeta() {
  const engine = getEngine();
  return {
    trainedAt: engine.trainedAt,
    k: engine.kmeans.k,
    inertia: engine.kmeans.inertia,
    anomalyThreshold: engine.threshold,
    supervised: {
      version: engine.logistic.version,
      samples: engine.logistic.samples,
      loss: Math.round(engine.logistic.loss * 1000) / 1000,
      epochs: engine.logistic.epochs,
    },
  };
}
