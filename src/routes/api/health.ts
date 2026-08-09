import { createFileRoute } from "@tanstack/react-router";

import { jsonOk } from "@/server/auth/secure";
import { engineMeta, getEngine } from "@/server/fraud/hybrid-engine";
import { subscriberCount } from "@/server/realtime/events";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        getEngine();
        return jsonOk({
          service: "radiocrm-api",
          status: "ok",
          realtimeSubscribers: subscriberCount(),
          fraudEngine: engineMeta(),
        });
      },
    },
  },
});
