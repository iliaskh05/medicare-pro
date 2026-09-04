import { Check, Copy } from "lucide-react";
import { useState, type MouseEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  className?: string;
  /** Compact for table cells */
  size?: "sm" | "md";
  showCopy?: boolean;
};

/**
 * Badge mono pour le n° de séjour d'un examen, avec copie optionnelle.
 */
export function SejourBadge({
  value,
  className,
  size = "md",
  showCopy = true,
}: Props) {
  const [copied, setCopied] = useState(false);

  if (!value) return <span className="text-muted-foreground">—</span>;

  const copy = async (e?: MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("N° séjour copié", { description: value });
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Impossible de copier le n° séjour");
    }
  };

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-md border border-primary/25 bg-primary/5 font-mono font-semibold tracking-tight text-foreground",
        size === "sm" ? "px-1.5 py-0.5 text-xs" : "px-2 py-1 text-sm",
        className,
      )}
    >
      <span className="truncate" title={value}>
        {value}
      </span>
      {showCopy ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "shrink-0 text-muted-foreground hover:text-foreground",
            size === "sm" ? "size-5" : "size-6",
          )}
          aria-label={`Copier le n° séjour ${value}`}
          title="Copier le n° séjour"
          onClick={(e) => void copy(e)}
        >
          {copied ? (
            <Check className={size === "sm" ? "size-3" : "size-3.5"} />
          ) : (
            <Copy className={size === "sm" ? "size-3" : "size-3.5"} />
          )}
        </Button>
      ) : null}
    </span>
  );
}
