import { createFileRoute } from "@tanstack/react-router";

import { jsonError, jsonOk, parseJsonBody, requireApiAuth } from "@/server/auth/secure";
import { listReports, structureReport } from "@/server/llm/report-structurer";

export const Route = createFileRoute("/api/reports/structure")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          requireApiAuth(request);
          const url = new URL(request.url);
          const studyId = url.searchParams.get("studyId") ?? undefined;
          return jsonOk({ reports: listReports(studyId) });
        } catch (e) {
          return jsonError(e);
        }
      },
      POST: async ({ request }) => {
        try {
          requireApiAuth(request);
          const body = await parseJsonBody<{
            studyId: string;
            clinicalContext?: string;
            rawNotes?: string;
            draft?: boolean;
          }>(request);
          const report = await structureReport(body);
          return jsonOk(report);
        } catch (e) {
          return jsonError(e);
        }
      },
    },
  },
});
