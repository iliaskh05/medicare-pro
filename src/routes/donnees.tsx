import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  Database,
  Download,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, PageHeader, Pill } from "@/components/ui-kit";
import { Skeleton } from "@/components/ui/skeleton";
import { WriteGuard } from "@/components/permission-guard";
import {
  commitImport,
  downloadTemplateFile,
  fetchDemoStatus,
  fetchImportHistory,
  loadCatalogueBaseline,
  loadDemoData,
  previewImport,
  resetDemoData,
  type DataImportJob,
  type DemoDatasetStatus,
  type ImportPreview,
} from "@/lib/api/admin-data";

export const Route = createFileRoute("/donnees")({
  head: () => ({ meta: [{ title: "Données & import — RadioCRM" }] }),
  component: DonneesPage,
});

function DonneesPage() {
  const [status, setStatus] = useState<DemoDatasetStatus | null>(null);
  const [history, setHistory] = useState<DataImportJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"INITIALIZATION" | "UPDATE">("INITIALIZATION");
  const [preview, setPreview] = useState<ImportPreview | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    Promise.all([fetchDemoStatus(), fetchImportHistory()])
      .then(([s, h]) => {
        setStatus(s);
        setHistory(h);
      })
      .catch((e: unknown) =>
        toast.error(e instanceof Error ? e.message : "Impossible de charger l'état des données"),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const run = async (key: string, action: () => Promise<unknown>, ok: string) => {
    setBusy(key);
    try {
      await action();
      toast.success(ok);
      refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Action impossible");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Administration"
        title="Données & import"
        subtitle="Catalogue marocain indicatif, jeu de démonstration et import Excel. Aucune écriture automatique au démarrage."
        actions={
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw className="mr-2 size-4" /> Actualiser
          </Button>
        }
      />

      <WriteGuard resource="settings">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Database className="size-4" /> Jeu de démonstration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <Skeleton className="h-24" />
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill tone={status?.loaded ? "success" : "neutral"}>
                      {status?.loaded ? "Chargé" : "Non chargé"}
                    </Pill>
                    <span className="text-sm text-muted-foreground">
                      {status?.totalMarkers ?? 0} marqueurs DEMO
                    </span>
                  </div>
                  {status?.countsByType && Object.keys(status.countsByType).length > 0 ? (
                    <ul className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                      {Object.entries(status.countsByType).map(([k, v]) => (
                        <li key={k}>
                          {k}: <span className="font-semibold text-foreground">{v}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={busy != null}
                      onClick={() =>
                        run("load", () => loadDemoData(Boolean(status?.loaded)), "Jeu DEMO chargé")
                      }
                    >
                      {busy === "load" ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                      Charger / recharger
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy != null}
                      onClick={() =>
                        run("catalog", () => loadCatalogueBaseline(), "Catalogue indicatif importé")
                      }
                    >
                      Catalogue MAD seul
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busy != null || !status?.loaded}
                      onClick={() =>
                        run("reset", () => resetDemoData(), "Jeu DEMO réinitialisé")
                      }
                    >
                      <Trash2 className="mr-2 size-4" /> Réinitialiser DEMO
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Les patients DEMO-* et ressources associées sont marqués. Le reset n&apos;efface
                    pas le catalogue centre ni les données de production.
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileSpreadsheet className="size-4" /> Import Excel
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                size="sm"
                variant="outline"
                disabled={busy != null}
                onClick={() =>
                  run("tpl", () => downloadTemplateFile(), "Modèle téléchargé")
                }
              >
                <Download className="mr-2 size-4" /> Télécharger le modèle
              </Button>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                  value={mode}
                  onChange={(e) => setMode(e.target.value as "INITIALIZATION" | "UPDATE")}
                >
                  <option value="INITIALIZATION">INITIALIZATION (création seule)</option>
                  <option value="UPDATE">UPDATE (upsert par code)</option>
                </select>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="text-sm"
                  onChange={(e) => {
                    setFile(e.target.files?.[0] ?? null);
                    setPreview(null);
                  }}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!file || busy != null}
                  onClick={() =>
                    run("preview", async () => {
                      if (!file) return;
                      const p = await previewImport(file, mode);
                      setPreview(p);
                    }, "Prévisualisation prête")
                  }
                >
                  <Upload className="mr-2 size-4" /> Valider / prévisualiser
                </Button>
                <Button
                  size="sm"
                  disabled={!file || busy != null || (preview != null && preview.rowsValid === 0)}
                  onClick={() =>
                    run("commit", async () => {
                      if (!file) return;
                      await commitImport(file, mode);
                      setPreview(null);
                      setFile(null);
                    }, "Import confirmé")
                  }
                >
                  Confirmer l&apos;import
                </Button>
              </div>
              {preview ? (
                <div className="rounded-md border border-border p-3 text-sm">
                  <p>
                    {preview.rowsValid} valides · {preview.rowsRejected} rejetées ·{" "}
                    {preview.rowsTotal} total
                  </p>
                  {(preview.errors ?? []).slice(0, 8).map((err, i) => (
                    <p key={i} className="mt-1 text-xs text-destructive">
                      {err.sheet ? `${err.sheet} ` : ""}
                      {err.row != null ? `Ligne ${err.row}` : ""}
                      {err.column ? ` / ${err.column}` : ""}: {err.message}
                    </p>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">Historique des imports</CardTitle>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <EmptyState
                compact
                icon={FileSpreadsheet}
                title="Aucun import"
                description="Les imports Excel apparaîtront ici."
              />
            ) : (
              <div className="divide-y divide-border">
                {history.map((job) => (
                  <div
                    key={String(job.id)}
                    className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
                  >
                    <div>
                      <p className="font-semibold">{job.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {job.createdAt?.replace("T", " ").slice(0, 16)} · {job.createdByName ?? "—"}{" "}
                        · {job.importMode ?? "—"}
                      </p>
                    </div>
                    <div className="text-right text-xs">
                      <Pill tone={job.status === "SUCCESS" ? "success" : "warning"}>{job.status}</Pill>
                      <p className="mt-1 text-muted-foreground">
                        {job.rowsImported ?? 0}/{job.rowsTotal ?? 0} importés · {job.rowsRejected ?? 0}{" "}
                        rejetés
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </WriteGuard>
    </div>
  );
}
