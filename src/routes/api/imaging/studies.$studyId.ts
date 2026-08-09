import { createFileRoute } from "@tanstack/react-router";

import { jsonError, jsonOk, requireApiAuth } from "@/server/auth/secure";
import { getAnalysis, getStudy } from "@/server/imaging/pipeline";

export const Route = createFileRoute("/api/imaging/studies/$studyId")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          requireApiAuth(request);
          const study = getStudy(params.studyId);
          return jsonOk({ study, analysis: getAnalysis(params.studyId) });
        } catch (e) {
          return jsonError(e);
        }
      },
    },
  },
});
