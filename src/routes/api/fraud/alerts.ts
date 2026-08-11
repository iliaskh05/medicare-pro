import { createFileRoute } from "@tanstack/react-router";

import { HttpError, jsonError, jsonOk, parseJsonBody, requireApiAuth } from "@/server/auth/secure";
import { decideInvoice, listAlerts, runFullScan } from "@/server/fraud/hybrid-engine";
import { factures, facturesSuspectes } from "@/types/domain";

export const Route = createFileRoute("/api/fraud/alerts")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          requireApiAuth(request);
          let alerts = listAlerts();
          if (alerts.length === 0) {
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
            const map = new Map(corpus.map((c) => [c.id, c]));
            alerts = await runFullScan([...map.values()]);
          }
          const url = new URL(request.url);
          const min = Number(url.searchParams.get("minScore") ?? 0);
          return jsonOk({ alerts: alerts.filter((a) => a.score >= min) });
        } catch (e) {
          return jsonError(e);
        }
      },
      PATCH: async ({ request }) => {
        try {
          requireApiAuth(request);
          const body = await parseJsonBody<{
            invoiceId: string;
            decision: "validated" | "blocked";
          }>(request);
          if (!body.invoiceId || !body.decision) {
            throw new HttpError(400, "invoiceId et decision requis", "bad_request");
          }
          const updated = decideInvoice(body.invoiceId, body.decision);
          return jsonOk(updated);
        } catch (e) {
          return jsonError(e);
        }
      },
    },
  },
});
