import { createFileRoute } from "@tanstack/react-router";

import { jsonError, jsonOk, requireApiAuth } from "@/server/auth/secure";
import { listRooms } from "@/server/chat/hub";
import { domainRefs } from "@/server/store/memory-store";

export const Route = createFileRoute("/api/chat/rooms")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          requireApiAuth(request);
          return jsonOk({ rooms: listRooms(), doctors: domainRefs.doctors });
        } catch (e) {
          return jsonError(e);
        }
      },
    },
  },
});
