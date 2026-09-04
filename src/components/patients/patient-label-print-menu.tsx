import { Printer, StickyNote, Tags } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  printPatientLabels,
  type PatientLabelPayload,
} from "@/lib/printing/label-print";
import { cn } from "@/lib/utils";

type Props = {
  payload: PatientLabelPayload;
  /** Bouton compact (worklist) ou standard (dossier) */
  size?: "sm" | "default" | "icon";
  variant?: "default" | "outline" | "secondary" | "ghost";
  className?: string;
  label?: string;
};

/**
 * Menu d'impression d'étiquettes associé à un dossier patient :
 * étiquette, auto-collant, ou les deux.
 */
export function PatientLabelPrintMenu({
  payload,
  size = "sm",
  variant = "outline",
  className,
  label = "Imprimer étiquette",
}: Props) {
  const run = (kind: "etiquette" | "autocollant" | "les_deux") => {
    try {
      printPatientLabels(payload, kind);
      toast.success(
        kind === "les_deux"
          ? "Impression étiquette + auto-collant"
          : kind === "autocollant"
            ? "Impression auto-collant"
            : "Impression étiquette",
        { description: `Dossier ${payload.numeroDossier}` },
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Impression impossible");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" size={size} variant={variant} className={cn(className)}>
          <Printer className={size === "icon" ? "size-4" : "mr-1.5 size-4"} />
          {size === "icon" ? <span className="sr-only">{label}</span> : label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Dossier {payload.numeroDossier}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => run("etiquette")}>
          <Tags className="mr-2 size-4" /> Imprimer l&apos;étiquette
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => run("autocollant")}>
          <StickyNote className="mr-2 size-4" /> Imprimer l&apos;auto-collant
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => run("les_deux")}>
          <Printer className="mr-2 size-4" /> Imprimer les deux
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
