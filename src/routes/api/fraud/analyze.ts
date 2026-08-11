import { createFileRoute } from "@tanstack/react-router";

import { factures, facturesSuspectes } from "@/types/domain";
import { jsonError, jsonOk, parseJsonBody, requireApiAuth } from "@/server/auth/secure";
import {
  engineMeta,
  runFullScan,
  scoreInvoice,
  trainHybridEngine,
} from "@/server/fraud/hybrid-engine";

export const Route = createFileRoute("/api/fraud/analyze")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          requireApiAuth(request);
          return jsonOk({ engine: engineMeta() });
        } catch (e) {
          return jsonError(e);
        }
      },
      POST: async ({ request }) => {
        try {
          requireApiAuth(request);
          const body = await parseJsonBody<{
            mode?: "full" | "single" | "retrain";
            invoice?: {
              id: string;
              patient: string;
              examen: string;
              total: number;
              partMutuelle?: number;
            };
          }>(request);

          if (body.mode === "retrain") {
            const engine = trainHybridEngine();
            return jsonOk({ engine: engineMeta(), trainedAt: engine.trainedAt });
          }

          if (body.mode === "single" && body.invoice) {
            const score = await scoreInvoice(body.invoice);
            return jsonOk({ results: [score] });
          }

          const corpus = [
            ...factures.map((f) => ({
              id: f.id,
              patient: f.patient,
              examen: f.examen,
              total: f.total,
              partMutuelle: f.partMutuelle,
            })),
            ...facturesSuspectes.map((f) => ({
              id: f.id,
              patient: f.patient,
              examen: "IRM Cérébrale",
              total: f.montant,
              partMutuelle: Math.round(f.montant * 0.55),
            })),
          ];
          // dedupe
          const map = new Map(corpus.map((c) => [c.id, c]));
          const results = await runFullScan([...map.values()]);
          return jsonOk({ engine: engineMeta(), results });
        } catch (e) {
          return jsonError(e);
        }
      },
    },
  },
});
