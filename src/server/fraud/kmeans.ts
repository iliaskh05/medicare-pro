/**
 * Mini-batch style K-Means for unsupervised weak-signal / anomaly isolation.
 */

export type KMeansModel = {
  k: number;
  centroids: number[][];
  inertia: number;
  iterations: number;
};

function dist2(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i]! - b[i]!;
    s += d * d;
  }
  return s;
}

function mean(points: number[][], dim: number): number[] {
  const c = new Array(dim).fill(0);
  if (points.length === 0) return c;
  for (const p of points) {
    for (let i = 0; i < dim; i++) c[i] += p[i]!;
  }
  for (let i = 0; i < dim; i++) c[i] /= points.length;
  return c;
}

export function fitKMeans(X: number[][], k = 4, maxIter = 40): KMeansModel {
  if (X.length === 0) {
    return { k, centroids: [], inertia: 0, iterations: 0 };
  }
  const dim = X[0]!.length;
  const centroids: number[][] = [];
  // k-means++ init
  centroids.push([...X[Math.floor(Math.random() * X.length)]!]);
  while (centroids.length < k) {
    const weights = X.map((x) => Math.min(...centroids.map((c) => dist2(x, c))));
    const sum = weights.reduce((a, b) => a + b, 0) || 1;
    let r = Math.random() * sum;
    let idx = 0;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i]!;
      if (r <= 0) {
        idx = i;
        break;
      }
    }
    centroids.push([...X[idx]!]);
  }

  let assignments = new Array(X.length).fill(0);
  let iter = 0;
  for (; iter < maxIter; iter++) {
    let changed = false;
    for (let i = 0; i < X.length; i++) {
      let best = 0;
      let bestD = Infinity;
      for (let c = 0; c < k; c++) {
        const d = dist2(X[i]!, centroids[c]!);
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      if (assignments[i] !== best) {
        assignments[i] = best;
        changed = true;
      }
    }
    for (let c = 0; c < k; c++) {
      const members = X.filter((_, i) => assignments[i] === c);
      if (members.length) centroids[c] = mean(members, dim);
    }
    if (!changed) break;
  }

  let inertia = 0;
  for (let i = 0; i < X.length; i++) {
    inertia += dist2(X[i]!, centroids[assignments[i]!]!);
  }

  return { k, centroids, inertia, iterations: iter + 1 };
}

export function predictCluster(model: KMeansModel, x: number[]): {
  clusterId: number;
  distance: number;
} {
  let best = 0;
  let bestD = Infinity;
  for (let c = 0; c < model.centroids.length; c++) {
    const d = Math.sqrt(dist2(x, model.centroids[c]!));
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return { clusterId: best, distance: bestD };
}

/** Weak signal if distance > percentile threshold of training distances. */
export function anomalyThreshold(model: KMeansModel, X: number[][], percentile = 0.9): number {
  const dists = X.map((x) => predictCluster(model, x).distance).sort((a, b) => a - b);
  if (!dists.length) return 1;
  const idx = Math.min(dists.length - 1, Math.floor(percentile * dists.length));
  return dists[idx]!;
}
