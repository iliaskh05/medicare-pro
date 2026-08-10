import { useState } from "react";
import { Contrast, Eye, EyeOff, Maximize2, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Pill } from "@/components/ui-kit";
import { cn } from "@/lib/utils";
import type { AnnotationScan, Scan } from "@/data/mock-extra";

const severiteTone = {
  critique: "destructive",
  suspect: "warning",
  normal: "success",
} as const;

const severiteColor: Record<AnnotationScan["severite"], string> = {
  critique: "var(--destructive)",
  suspect: "var(--warning)",
  normal: "var(--success)",
};

export function ScanViewer({ scan }: { scan: Scan }) {
  const [zoom, setZoom] = useState(1);
  const [contraste, setContraste] = useState(100);
  const [surbrillance, setSurbrillance] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(scan.annotations[0]?.id ?? null);

  const reset = () => {
    setZoom(1);
    setContraste(100);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="overflow-hidden rounded-xl border border-border bg-foreground/95">
        <div className="flex flex-wrap items-center gap-2 border-b border-border/40 px-3 py-2">
          <Pill tone="primary" className="bg-primary/20 text-primary-foreground ring-primary/40">
            {scan.examen}
          </Pill>
          <span className="text-xs text-primary-foreground/70">
            {scan.patient} · {scan.date}
          </span>
          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-primary-foreground hover:bg-primary-foreground/15"
              onClick={() => setZoom((z) => Math.max(1, +(z - 0.2).toFixed(2)))}
              aria-label="Zoom arrière"
            >
              <ZoomOut className="size-4" />
            </Button>
            <span className="w-10 text-center text-xs tabular-nums text-primary-foreground/80">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-primary-foreground hover:bg-primary-foreground/15"
              onClick={() => setZoom((z) => Math.min(3, +(z + 0.2).toFixed(2)))}
              aria-label="Zoom avant"
            >
              <ZoomIn className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-primary-foreground hover:bg-primary-foreground/15"
              onClick={reset}
              aria-label="Réinitialiser la vue"
            >
              <RotateCcw className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-primary-foreground hover:bg-primary-foreground/15"
              onClick={() => setSurbrillance((s) => !s)}
              aria-label={surbrillance ? "Masquer les surbrillances" : "Afficher les surbrillances"}
            >
              {surbrillance ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
            </Button>
          </div>
        </div>

        <div className="relative aspect-square w-full overflow-hidden">
          <div
            className="absolute inset-0 origin-center transition-transform duration-300"
            style={{ transform: `scale(${zoom})` }}
          >
            <img
              src={scan.image}
              alt={`${scan.examen} — ${scan.patient}`}
              width={1024}
              height={1024}
              loading="lazy"
              className="size-full object-cover"
              style={{ filter: `contrast(${contraste}%)` }}
            />
            {calqueIA ? (
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="pointer-events-none absolute inset-0 size-full"
                aria-hidden
              >
                <path
                  d="M38 42 C44 33, 60 33, 66 43 C72 53, 66 66, 54 68 C42 70, 33 60, 36 50 Z"
                  fill="var(--destructive)"
                  fillOpacity="0.16"
                  stroke="var(--destructive)"
                  strokeWidth="0.9"
                  strokeDasharray="3 1.5"
                  className="animate-pulse"
                />
                <path
                  d="M56 52 C60 48, 68 50, 69 56 C70 62, 63 65, 59 61 Z"
                  fill="none"
                  stroke="var(--destructive)"
                  strokeWidth="0.7"
                />
              </svg>
            ) : null}

            {surbrillance
              ? scan.annotations.map((a) => {
                  const isActive = a.id === activeId;
                  return (
                    <button
                      key={a.id}
                      onClick={() => setActiveId(a.id)}
                      className={cn(
                        "absolute rounded-lg border-2 transition-all",
                        isActive ? "shadow-elevated" : "opacity-70 hover:opacity-100",
                      )}
                      style={{
                        left: `${a.x}%`,
                        top: `${a.y}%`,
                        width: `${a.w}%`,
                        height: `${a.h}%`,
                        borderColor: severiteColor[a.severite],
                        backgroundColor: isActive
                          ? `color-mix(in oklab, ${severiteColor[a.severite]} 22%, transparent)`
                          : "transparent",
                      }}
                      aria-label={a.libelle}
                    >
                      <span
                        className="absolute -top-6 left-0 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground"
                        style={{ backgroundColor: severiteColor[a.severite] }}
                      >
                        {a.libelle} · {a.confiance}%
                      </span>
                    </button>
                  );
                })
              : null}
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-border/40 px-3 py-2.5">
          <Contrast className="size-4 shrink-0 text-primary-foreground/70" />
          <Slider
            value={[contraste]}
            min={60}
            max={180}
            step={5}
            onValueChange={([v]) => setContraste(v ?? 100)}
            className="max-w-56"
            aria-label="Contraste"
          />
          <span className="text-xs tabular-nums text-primary-foreground/70">{contraste}%</span>
          <Maximize2 className="ml-auto size-4 text-primary-foreground/40" />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2.5">
          <Label htmlFor="surbrillance" className="text-sm">
            Surbrillance des analyses IA
          </Label>
          <Switch id="surbrillance" checked={surbrillance} onCheckedChange={setSurbrillance} />
        </div>

        <ul className="space-y-2">
          {scan.annotations.map((a) => (
            <li key={a.id}>
              <button
                onClick={() => setActiveId(a.id)}
                className={cn(
                  "w-full rounded-xl border bg-card p-3 text-left transition-colors",
                  a.id === activeId ? "border-primary bg-accent" : "border-border hover:bg-accent/60",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold">{a.libelle}</p>
                  <Pill tone={severiteTone[a.severite]}>{a.confiance}%</Pill>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{a.description}</p>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
