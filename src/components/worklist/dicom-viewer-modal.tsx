import { useEffect, useMemo, useState } from "react";
import {
  Contrast,
  Crosshair,
  Hand,
  Loader2,
  Maximize2,
  Move,
  Ruler,
  ScanLine,
  SunMedium,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  fetchImagerieExamen,
  type ImagerieSeries,
  type ImagerieStudy,
} from "@/lib/api/imagerie";

type ViewerTool = "zoom" | "window" | "measure" | "pan";

type DicomViewerModalProps = {
  examenId: string | null;
  patientLabel?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DicomViewerModal({
  examenId,
  patientLabel,
  open,
  onOpenChange,
}: DicomViewerModalProps) {
  const [study, setStudy] = useState<ImagerieStudy | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSeriesUid, setActiveSeriesUid] = useState<string | null>(null);
  const [frameIndex, setFrameIndex] = useState(0);
  const [tool, setTool] = useState<ViewerTool>("zoom");
  const [zoom, setZoom] = useState(1);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);

  useEffect(() => {
    if (!open || !examenId) {
      setStudy(null);
      setError(null);
      setActiveSeriesUid(null);
      setFrameIndex(0);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setZoom(1);
    setBrightness(100);
    setContrast(100);
    setTool("zoom");

    fetchImagerieExamen(examenId, controller.signal)
      .then((data) => {
        setStudy(data);
        const first = data.series?.[0];
        setActiveSeriesUid(first?.seriesInstanceUID ?? null);
        setFrameIndex(0);
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        setStudy(null);
        setError(e instanceof Error ? e.message : "Impossible de charger l'étude DICOM");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [open, examenId]);

  const activeSeries: ImagerieSeries | null = useMemo(() => {
    if (!study?.series?.length) return null;
    return (
      study.series.find((s) => s.seriesInstanceUID === activeSeriesUid) ?? study.series[0] ?? null
    );
  }, [study, activeSeriesUid]);

  const activeImage = activeSeries?.images?.[frameIndex] ?? activeSeries?.images?.[0] ?? null;

  function selectSeries(series: ImagerieSeries) {
    setActiveSeriesUid(series.seriesInstanceUID);
    setFrameIndex(0);
  }

  function resetView() {
    setZoom(1);
    setBrightness(100);
    setContrast(100);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex h-[96vh] w-[98vw] max-w-[98vw] flex-col gap-0 overflow-hidden rounded-md border border-neutral-800 bg-[#07090c] p-0 text-neutral-100 shadow-2xl",
          "[&>button]:right-3 [&>button]:top-3 [&>button]:text-neutral-400 [&>button]:hover:bg-neutral-800 [&>button]:hover:text-neutral-100",
        )}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Visionneuse d&apos;imagerie</DialogTitle>
          <DialogDescription>
            Consultation des clichés DICOM simulés pour l&apos;examen {examenId}.
          </DialogDescription>
        </DialogHeader>

        {/* Toolbar clinique */}
        <div className="flex h-12 shrink-0 items-center gap-1 border-b border-neutral-800 bg-[#0c0f14] px-3">
          <div className="mr-3 flex items-center gap-2 border-r border-neutral-800 pr-3">
            <ScanLine className="size-4 text-emerald-500/80" aria-hidden />
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold tracking-wide text-neutral-100">
                RadioCRM · Viewer
              </p>
              <p className="truncate text-[10px] text-neutral-500">
                {patientLabel || study?.patientName || "—"}
                {study ? ` · ${study.modality} · ${study.numberOfImages} img` : null}
              </p>
            </div>
          </div>

          <ToolButton
            active={tool === "zoom"}
            label="Zoom"
            onClick={() => setTool("zoom")}
            icon={Maximize2}
          />
          <ToolButton
            active={tool === "window"}
            label="Contraste"
            onClick={() => setTool("window")}
            icon={Contrast}
          />
          <ToolButton
            active={tool === "measure"}
            label="Mesure"
            onClick={() => setTool("measure")}
            icon={Ruler}
          />
          <ToolButton
            active={tool === "pan"}
            label="Pan"
            onClick={() => setTool("pan")}
            icon={Hand}
          />

          <div className="mx-2 h-6 w-px bg-neutral-800" />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 text-neutral-300 hover:bg-neutral-800 hover:text-white"
            onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.15).toFixed(2)))}
            aria-label="Zoom arrière"
          >
            <ZoomOut className="size-4" />
          </Button>
          <span className="w-12 text-center text-[11px] tabular-nums text-neutral-400">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 text-neutral-300 hover:bg-neutral-800 hover:text-white"
            onClick={() => setZoom((z) => Math.min(3, +(z + 0.15).toFixed(2)))}
            aria-label="Zoom avant"
          >
            <ZoomIn className="size-4" />
          </Button>

          <div className="ml-auto flex items-center gap-3">
            {(tool === "window" || tool === "zoom") && (
              <div className="hidden items-center gap-2 md:flex">
                <SunMedium className="size-3.5 text-neutral-500" />
                <Slider
                  value={[brightness]}
                  min={40}
                  max={160}
                  step={1}
                  className="w-24"
                  onValueChange={(v) => setBrightness(v[0] ?? 100)}
                  aria-label="Luminosité"
                />
                <Contrast className="size-3.5 text-neutral-500" />
                <Slider
                  value={[contrast]}
                  min={40}
                  max={180}
                  step={1}
                  className="w-24"
                  onValueChange={(v) => setContrast(v[0] ?? 100)}
                  aria-label="Contraste"
                />
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 border-neutral-700 bg-transparent text-[11px] text-neutral-300 hover:bg-neutral-800 hover:text-white"
              onClick={resetView}
            >
              Reset
            </Button>
          </div>
        </div>

        {/* Corps : sidebar séries + canvas */}
        <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="flex min-h-0 flex-col border-b border-neutral-800 bg-[#0a0c10] md:border-b-0 md:border-r">
            <div className="border-b border-neutral-800 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                Séries
              </p>
              {study ? (
                <p className="mt-0.5 truncate font-mono text-[10px] text-neutral-600">
                  {study.studyInstanceUID}
                </p>
              ) : null}
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-xs text-neutral-500">
                  <Loader2 className="size-4 animate-spin" /> Chargement PACS…
                </div>
              ) : null}
              {error ? (
                <p className="px-2 py-6 text-center text-xs text-red-400">{error}</p>
              ) : null}
              {study?.series?.map((series) => {
                const selected = series.seriesInstanceUID === activeSeries?.seriesInstanceUID;
                return (
                  <button
                    key={series.seriesInstanceUID}
                    type="button"
                    onClick={() => selectSeries(series)}
                    className={cn(
                      "w-full rounded border p-1.5 text-left transition-colors",
                      selected
                        ? "border-emerald-600/50 bg-emerald-950/40"
                        : "border-neutral-800 bg-neutral-950/60 hover:border-neutral-600",
                    )}
                  >
                    <div className="aspect-square overflow-hidden rounded-sm border border-neutral-800 bg-black">
                      <img
                        src={series.thumbnailUrl}
                        alt={series.seriesDescription}
                        className="size-full object-cover opacity-90"
                        loading="lazy"
                      />
                    </div>
                    <p className="mt-1.5 truncate text-[11px] font-medium text-neutral-200">
                      {series.seriesDescription}
                    </p>
                    <p className="text-[10px] text-neutral-500">
                      {series.modality} · {series.numberOfInstances} images
                    </p>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="relative flex min-h-0 flex-col bg-black">
            <div className="pointer-events-none absolute left-3 top-3 z-10 space-y-0.5 font-mono text-[10px] text-emerald-400/80">
              <p>{study?.modality ?? "—"}</p>
              <p>{activeSeries?.seriesDescription ?? "—"}</p>
              <p>
                Img {activeImage ? activeImage.instanceNumber : 0}/
                {activeSeries?.numberOfInstances ?? 0}
              </p>
              <p className="text-neutral-500">
                Tool: {tool === "window" ? "W/L" : tool.toUpperCase()}
              </p>
            </div>

            <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-4">
              {loading ? (
                <Loader2 className="size-8 animate-spin text-neutral-600" />
              ) : activeImage ? (
                <div
                  className={cn(
                    "relative max-h-full max-w-full transition-transform",
                    tool === "pan" && "cursor-move",
                    tool === "measure" && "cursor-crosshair",
                    tool === "zoom" && "cursor-zoom-in",
                  )}
                  style={{ transform: `scale(${zoom})` }}
                >
                  <img
                    src={activeImage.url}
                    alt={`Instance ${activeImage.instanceNumber}`}
                    className="max-h-[75vh] max-w-full select-none object-contain"
                    draggable={false}
                    style={{
                      filter: `brightness(${brightness}%) contrast(${contrast}%)`,
                    }}
                  />
                  {tool === "measure" ? (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <div className="flex items-center gap-1 text-amber-300/80">
                        <Crosshair className="size-4" />
                        <span className="font-mono text-[10px]">mesure (démo)</span>
                      </div>
                      <div className="absolute left-1/4 top-1/2 h-px w-1/2 bg-amber-400/70" />
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-neutral-600">
                  <Move className="size-8" />
                  <p className="text-xs">Aucune image à afficher</p>
                </div>
              )}
            </div>

            {activeSeries && activeSeries.images.length > 1 ? (
              <div className="flex items-center gap-3 border-t border-neutral-800 bg-[#0c0f14] px-4 py-2">
                <span className="text-[10px] uppercase tracking-wider text-neutral-500">
                  Coupe
                </span>
                <Slider
                  value={[frameIndex]}
                  min={0}
                  max={Math.max(0, activeSeries.images.length - 1)}
                  step={1}
                  className="flex-1"
                  onValueChange={(v) => setFrameIndex(v[0] ?? 0)}
                  aria-label="Navigation dans la série"
                />
                <span className="w-14 text-right font-mono text-[11px] text-neutral-400">
                  {frameIndex + 1}/{activeSeries.images.length}
                </span>
              </div>
            ) : null}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ToolButton({
  active,
  label,
  onClick,
  icon: Icon,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  icon: typeof ZoomIn;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={cn(
        "h-8 gap-1.5 rounded px-2 text-[11px] font-medium",
        active
          ? "bg-emerald-950/60 text-emerald-300 hover:bg-emerald-950/80 hover:text-emerald-200"
          : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100",
      )}
      aria-pressed={active}
      title={label}
    >
      <Icon className="size-3.5" />
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );
}
