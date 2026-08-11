import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { PageHeader, Pill } from "@/components/ui-kit";
import { ScanViewer } from "@/components/scan-viewer";
import { fetchScans } from "@/lib/api/imaging";
import type { Scan } from "@/types/imaging";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/imagerie")({
  head: () => ({
    meta: [
      { title: "Visionneuse de scans médicaux — RadioCRM" },
      {
        name: "description",
        content:
          "Visionneuse d'imagerie médicale avec zoom, contraste et surbrillance des zones analysées par l'IA du centre de radiologie.",
      },
      { property: "og:title", content: "Visionneuse de scans médicaux — RadioCRM" },
      {
        property: "og:description",
        content: "Consultez les IRM, scanners et radios avec les annotations automatiques.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ImageriePage,
});

function ImageriePage() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    fetchScans(controller.signal)
      .then((rows) => {
        setScans(rows);
        setActiveId(rows[0]?.id ?? null);
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        setScans([]);
        setActiveId(null);
        setError(e instanceof Error ? e : new Error("Service indisponible"));
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [reloadKey]);

  const retry = useCallback(() => setReloadKey((k) => k + 1), []);
  const active = scans.find((s) => s.id === activeId) ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visionneuse de scans"
        subtitle="Imagerie du jour avec surbrillance des zones analysées automatiquement"
      />

      {isLoading ? (
        <div className="grid gap-4 xl:grid-cols-[16rem_minmax(0,1fr)]">
          <Card>
            <CardContent className="space-y-3 p-4">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <Skeleton className="aspect-square w-full" />
            </CardContent>
          </Card>
        </div>
      ) : error ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <p className="text-sm font-medium text-muted-foreground">
              Impossible de charger les examens d'imagerie.
            </p>
            <Button variant="outline" onClick={retry}>
              <RotateCcw className="mr-2 size-4" /> Réessayer
            </Button>
          </CardContent>
        </Card>
      ) : scans.length === 0 || !active ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[16rem_minmax(0,1fr)]">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Examens disponibles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-3 pb-3">
              {scans.map((s) => {
                const critiques = (s.annotations ?? []).filter(
                  (a) => a.severite === "critique",
                ).length;
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveId(s.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border p-2 text-left transition-colors",
                      s.id === active.id
                        ? "border-primary bg-accent"
                        : "border-border hover:bg-accent/60",
                    )}
                  >
                    <img
                      src={s.image}
                      alt=""
                      width={1024}
                      height={1024}
                      loading="lazy"
                      className="size-12 shrink-0 rounded-lg object-cover"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{s.examen}</p>
                      <p className="truncate text-xs text-muted-foreground">{s.patient}</p>
                      {critiques > 0 ? (
                        <Pill tone="destructive" className="mt-1">
                          {critiques} zone(s) critique(s)
                        </Pill>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>{active.examen}</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {active.patient} · {active.medecin} · {active.date}
                </p>
              </div>
              <Pill tone="primary">{active.id}</Pill>
            </CardHeader>
            <CardContent>
              <ScanViewer scan={active} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
