import { createFileRoute } from "@tanstack/react-router";

import { jsonError, jsonOk, requireApiAuth } from "@/server/auth/secure";
import { listStudies } from "@/server/imaging/pipeline";

export const Route = createFileRoute("/api/imaging/studies")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          requireApiAuth(request);
          return jsonOk({ studies: listStudies() });
        } catch (e) {
          return jsonError(e);
        }
      },
    },
  },
});
