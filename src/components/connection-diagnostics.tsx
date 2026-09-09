import { useCallback, useEffect, useState } from "react";
import { Check, RefreshCw, Server, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { describeApiError } from "@/lib/api/errors";
import {
  clearJavaApiBaseOverride,
  getJavaApiBase,
  setJavaApiBase,
} from "@/lib/api/config";

type Probe = {
  server: boolean;
  api: boolean;
  database: boolean;
  auth: boolean;
  message: string | null;
};

async function probe(base: string, signal?: AbortSignal): Promise<Probe> {
  const url = `${base.replace(/\/$/, "")}/api/system/health`;
  try {
    const res = await fetch(url, { signal, headers: { Accept: "application/json" } });
    if (!res.ok) {
      return {
        server: true,
        api: false,
        database: false,
        auth: false,
        message: "Le serveur répond mais l'API n'est pas opérationnelle.",
      };
    }
    const data = (await res.json()) as { status?: string; api?: string; database?: string };
    const apiUp = data.api === "UP" || data.status === "UP" || data.status === "DEGRADED";
    const dbUp = data.database === "UP";
    return {
      server: true,
      api: apiUp,
      database: dbUp,
      auth: apiUp,
      message: apiUp
        ? null
        : "Le serveur MediCare Pro est actuellement inaccessible.",
    };
  } catch (error) {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      return {
        server: false,
        api: false,
        database: false,
        auth: false,
        message: "Connexion au réseau du centre perdue.",
      };
    }
    const friendly = describeApiError(error);
    return {
      server: false,
      api: false,
      database: false,
      auth: false,
      message: friendly.message,
    };
  }
}

function Row({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      {ok ? (
        <Check className="size-4 text-emerald-600" aria-hidden />
      ) : (
        <X className="size-4 text-destructive" aria-hidden />
      )}
      <span>{ok ? `✓ ${label}` : `✕ ${label}`}</span>
    </li>
  );
}

export function ConnectionDiagnostics({ compact = false }: { compact?: boolean }) {
  const [url, setUrl] = useState(() => getJavaApiBase());
  const [probeState, setProbeState] = useState<Probe | null>(null);
  const [loading, setLoading] = useState(false);

  const run = useCallback(async () => {
    setLoading(true);
    const controller = new AbortController();
    const result = await probe(getJavaApiBase(), controller.signal);
    setProbeState(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    void run();
  }, [run]);

  function applyUrl() {
    const next = url.trim();
    if (!next) {
      clearJavaApiBaseOverride();
      setUrl(getJavaApiBase());
    } else {
      setJavaApiBase(next);
      setUrl(getJavaApiBase());
    }
    void run();
  }

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <div className="space-y-2">
        <Label htmlFor="server-url" className="flex items-center gap-1.5 text-xs">
          <Server className="size-3.5" />
          Adresse du serveur
        </Label>
        <div className="flex gap-2">
          <Input
            id="server-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="http://SERVER_IP:8080"
            className="font-mono text-xs"
            autoComplete="off"
          />
          <Button type="button" variant="secondary" onClick={applyUrl} disabled={loading}>
            Tester
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Enregistrée sur ce poste uniquement — pas besoin de reconstruire l&apos;application.
        </p>
      </div>

      {probeState ? (
        <div className="rounded-lg border border-border bg-background/60 px-3 py-2">
          {probeState.server && probeState.api ? (
            <ul className="space-y-1">
              <Row ok={probeState.server} label="Serveur accessible" />
              <Row ok={probeState.api} label="API opérationnelle" />
              <Row ok={probeState.auth} label="Authentification disponible" />
              {probeState.database ? (
                <Row ok label="Base de données" />
              ) : (
                <Row ok={false} label="Base de données" />
              )}
            </ul>
          ) : (
            <div className="space-y-2 text-sm">
              <p className="font-medium text-destructive">✕ Serveur MediCare inaccessible</p>
              <p className="text-muted-foreground">{probeState.message}</p>
              <p className="text-xs text-muted-foreground">
                Vérifiez :
                <br />• votre connexion au réseau du centre
                <br />• l&apos;adresse du serveur
                <br />• que le serveur MediCare est démarré
              </p>
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => void run()}
            disabled={loading}
          >
            <RefreshCw className="mr-1.5 size-3.5" />
            Réessayer
          </Button>
        </div>
      ) : null}
    </div>
  );
}
