import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { Sigma, TrendingUp } from "lucide-react";

import { Pill } from "@/components/ui-kit";

/**
 * Nuage de points illustrant le clustering des signaux faibles :
 * cluster standard (dossiers conformes) vs dossier analysé (outlier).
 */
type Point = { x: number; y: number; z: number; label: string };

const clusterStandard: Point[] = [
  { x: 320, y: 1.0, z: 60, label: "Cluster conforme" },
  { x: 350, y: 1.1, z: 60, label: "Cluster conforme" },
  { x: 380, y: 0.9, z: 60, label: "Cluster conforme" },
  { x: 410, y: 1.2, z: 60, label: "Cluster conforme" },
  { x: 430, y: 1.0, z: 60, label: "Cluster conforme" },
  { x: 455, y: 1.3, z: 60, label: "Cluster conforme" },
  { x: 470, y: 1.1, z: 60, label: "Cluster conforme" },
  { x: 495, y: 1.4, z: 60, label: "Cluster conforme" },
  { x: 520, y: 1.2, z: 60, label: "Cluster conforme" },
  { x: 545, y: 1.5, z: 60, label: "Cluster conforme" },
];

const clusterSuspect: Point[] = [
  { x: 610, y: 2.1, z: 80, label: "Signal faible" },
  { x: 655, y: 2.4, z: 80, label: "Signal faible" },
  { x: 700, y: 2.2, z: 80, label: "Signal faible" },
];

const dossierAnalyse: Point[] = [{ x: 880, y: 3.4, z: 190, label: "Dossier analysé" }];

export function ClusterScatter({
  deviation = 3.4,
  interpretation = "Risque élevé de sur-facturation",
}: {
  deviation?: number;
  interpretation?: string;
}) {
  return (
    <div className="space-y-3">
      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 8, right: 8, bottom: 4, left: -18 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="x"
              name="Montant facturé (MAD)"
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              stroke="var(--border)"
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Actes / session"
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              stroke="var(--border)"
            />
            <ZAxis type="number" dataKey="z" range={[40, 200]} />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "var(--card)",
                fontSize: 12,
              }}
              formatter={(value: number, name) => [value, name]}
            />
            <Scatter name="Cluster conforme" data={clusterStandard} fill="var(--primary)" fillOpacity={0.45} />
            <Scatter name="Signaux faibles" data={clusterSuspect} fill="var(--warning)" fillOpacity={0.75} />
            <Scatter
              name="Dossier analysé"
              data={dossierAnalyse}
              fill="var(--destructive)"
              shape="star"
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-primary/60" /> Cluster conforme
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-warning" /> Signaux faibles
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-destructive" /> Dossier analysé
        </span>
      </div>

      <div className="rounded-xl bg-destructive/8 p-3 ring-1 ring-inset ring-destructive/20">
        <div className="flex items-center justify-between gap-2">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold">
            <Sigma className="size-3.5 text-destructive" />
            Déviation du cluster standard
          </p>
          <Pill tone="destructive">
            <TrendingUp className="mr-1 size-3" />+{deviation.toFixed(1)} σ
          </Pill>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">
            +{deviation.toFixed(1)} écarts-types
          </span>{" "}
          au-dessus de la moyenne des dossiers comparables — {interpretation}.
        </p>
      </div>
    </div>
  );
}
