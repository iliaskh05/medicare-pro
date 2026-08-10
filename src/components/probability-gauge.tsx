import { cn } from "@/lib/utils";

type Tone = "success" | "warning" | "destructive" | "primary";

const toneVar: Record<Tone, string> = {
  success: "var(--success)",
  warning: "var(--warning)",
  destructive: "var(--destructive)",
  primary: "var(--primary)",
};

export function toneFromProbability(p: number): Tone {
  if (p >= 0.8) return "destructive";
  if (p >= 0.6) return "warning";
  if (p >= 0.4) return "primary";
  return "success";
}

/**
 * Jauge semi-circulaire de probabilité (0 → 1).
 */
export function ProbabilityGauge({
  value,
  size = 96,
  label,
  className,
}: {
  value: number;
  size?: number;
  label?: string;
  className?: string;
}) {
  const clamped = Math.min(1, Math.max(0, value));
  const tone = toneFromProbability(clamped);
  const stroke = size / 10;
  const r = (size - stroke) / 2;
  const arc = Math.PI * r;

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <svg
        width={size}
        height={size / 2 + stroke}
        viewBox={`0 0 ${size} ${size / 2 + stroke}`}
        role="img"
        aria-label={`Probabilité ${Math.round(clamped * 100)} %`}
      >
        <path
          d={`M ${stroke / 2} ${size / 2} A ${r} ${r} 0 0 1 ${size - stroke / 2} ${size / 2}`}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        <path
          d={`M ${stroke / 2} ${size / 2} A ${r} ${r} 0 0 1 ${size - stroke / 2} ${size / 2}`}
          fill="none"
          stroke={toneVar[tone]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${arc * clamped} ${arc}`}
          className="transition-all duration-700"
        />
      </svg>
      <div className="-mt-2 text-center">
        <p
          className="text-lg font-bold leading-none tracking-tight"
          style={{ color: toneVar[tone] }}
        >
          {Math.round(clamped * 100)} %
        </p>
        {label ? <p className="mt-1 text-xs text-muted-foreground">{label}</p> : null}
      </div>
    </div>
  );
}

/** Mini jauge linéaire pour les tableaux. */
export function ProbabilityBar({ value }: { value: number }) {
  const clamped = Math.min(1, Math.max(0, value));
  const tone = toneFromProbability(clamped);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${clamped * 100}%`, backgroundColor: toneVar[tone] }}
        />
      </div>
      <span className="text-xs font-semibold tabular-nums" style={{ color: toneVar[tone] }}>
        {Math.round(clamped * 100)} %
      </span>
    </div>
  );
}
