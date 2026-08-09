/**
 * L2-regularized logistic regression (batch GD) for supervised fraud probability.
 */

export type LogisticModel = {
  weights: number[];
  bias: number;
  version: string;
  trainedAt: string;
  samples: number;
  epochs: number;
  loss: number;
};

function sigmoid(z: number): number {
  if (z >= 0) {
    const ez = Math.exp(-z);
    return 1 / (1 + ez);
  }
  const ez = Math.exp(z);
  return ez / (1 + ez);
}

export function fitLogistic(
  X: number[][],
  y: number[],
  opts: { epochs?: number; lr?: number; l2?: number; version?: string } = {},
): LogisticModel {
  const epochs = opts.epochs ?? 250;
  const lr = opts.lr ?? 0.35;
  const l2 = opts.l2 ?? 0.01;
  const dim = X[0]?.length ?? 0;
  const weights = new Array(dim).fill(0);
  let bias = 0;
  let loss = 0;

  for (let epoch = 0; epoch < epochs; epoch++) {
    const gradW = new Array(dim).fill(0);
    let gradB = 0;
    loss = 0;

    for (let i = 0; i < X.length; i++) {
      const x = X[i]!;
      let z = bias;
      for (let j = 0; j < dim; j++) z += weights[j]! * x[j]!;
      const p = sigmoid(z);
      const yi = y[i]!;
      loss += -(yi * Math.log(p + 1e-9) + (1 - yi) * Math.log(1 - p + 1e-9));
      const err = p - yi;
      for (let j = 0; j < dim; j++) gradW[j] += err * x[j]!;
      gradB += err;
    }

    const n = Math.max(1, X.length);
    loss = loss / n;
    for (let j = 0; j < dim; j++) {
      gradW[j] = gradW[j]! / n + l2 * weights[j]!;
      weights[j]! -= lr * gradW[j]!;
    }
    bias -= lr * (gradB / n);
  }

  return {
    weights,
    bias,
    version: opts.version ?? "logreg-v1",
    trainedAt: new Date().toISOString(),
    samples: X.length,
    epochs,
    loss,
  };
}

export function predictProba(model: LogisticModel, x: number[]): number {
  let z = model.bias;
  for (let i = 0; i < model.weights.length; i++) z += model.weights[i]! * x[i]!;
  const p = 1 / (1 + Math.exp(-z));
  return Math.min(0.999, Math.max(0.001, p));
}
