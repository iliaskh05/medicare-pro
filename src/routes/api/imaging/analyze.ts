import { createFileRoute } from "@tanstack/react-router";

import { jsonError, jsonOk, parseJsonBody, requireApiAuth } from "@/server/auth/secure";
import { analyzeStudy } from "@/server/imaging/pipeline";

export const Route = createFileRoute("/api/imaging/analyze")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          requireApiAuth(request);
          const contentType = request.headers.get("content-type") ?? "";

          if (contentType.includes("multipart/form-data")) {
            const form = await request.formData();
            const studyId = String(form.get("studyId") ?? "");
            const file = form.get("file");
            let buffer: ArrayBuffer | undefined;
            if (file && typeof file === "object" && "arrayBuffer" in file) {
              buffer = await (file as File).arrayBuffer();
            }
            const result = await analyzeStudy(studyId, buffer);
            return jsonOk(result);
          }

          const body = await parseJsonBody<{ studyId: string; imageBase64?: string }>(request);
          let buffer: ArrayBuffer | undefined;
          if (body.imageBase64) {
            const b64 = body.imageBase64.includes(",")
              ? body.imageBase64.split(",")[1]!
              : body.imageBase64;
            const bin = atob(b64);
            const bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            buffer = bytes.buffer;
          }
          const result = await analyzeStudy(body.studyId, buffer);
          return jsonOk(result);
        } catch (e) {
          return jsonError(e);
        }
      },
    },
  },
});
