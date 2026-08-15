import {
  AlertTriangle,
  CircleDot,
  Clock,
  CreditCard,
  FileSignature,
  FileText,
  Printer,
  PenLine,
  UserCheck,
  Wallet,
} from "lucide-react";
import type { ComponentType } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { EtatPatient, StatutCompteRendu, StatutPaiement } from "@/lib/api/worklist";

type BadgeDef = {
  label: string;
  icon: ComponentType<{ className?: string }>;
  className: string;
};

const etatMap: Record<EtatPatient, BadgeDef> = {
  attendu: {
    label: "Attendu",
    icon: CircleDot,
    className: "border-border bg-muted text-muted-foreground",
  },
  arrive: {
    label: "Terminé",
    icon: UserCheck,
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  retard: {
    label: "En retard",
    icon: Clock,
    className: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  attente_longue: {
    label: "Trop attendu",
    icon: AlertTriangle,
    className: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
  },
};

const crMap: Record<StatutCompteRendu, BadgeDef> = {
  a_faire: {
    label: "À dicter",
    icon: FileText,
    className: "border-border bg-muted text-muted-foreground",
  },
  en_redaction: {
    label: "En rédaction",
    icon: PenLine,
    className: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  signe: {
    label: "Signé",
    icon: FileSignature,
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  imprime: {
    label: "Imprimé",
    icon: Printer,
    className: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
};

const paiementMap: Record<StatutPaiement, BadgeDef> = {
  impaye: {
    label: "Impayé",
    icon: Wallet,
    className: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
  },
  cote: {
    label: "Coté",
    icon: CreditCard,
    className: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
  paye: {
    label: "Payé",
    icon: CreditCard,
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
};

function Badge({ def }: { def: BadgeDef }) {
  const Icon = def.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap",
        def.className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {def.label}
    </span>
  );
}

export function EtatPatientBadge({ etat }: { etat: EtatPatient }) {
  return <Badge def={etatMap[etat] ?? etatMap.attendu} />;
}

/** Pastille cliquable pour changer l'état patient (PATCH /api/worklist/{id}/status). */
export function EtatPatientStatusMenu({
  etat,
  onSelect,
  disabled,
}: {
  etat: EtatPatient;
  onSelect: (next: EtatPatient) => void;
  disabled?: boolean;
}) {
  const current = etatMap[etat] ?? etatMap.attendu;
  const Icon = current.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            current.className,
            disabled && "pointer-events-none opacity-60",
          )}
          onClick={(e) => e.stopPropagation()}
          aria-label="Modifier l'état du patient"
        >
          <Icon className="size-3.5" aria-hidden />
          {current.label}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuLabel className="text-xs">État patient</DropdownMenuLabel>
        {(Object.keys(etatMap) as EtatPatient[]).map((key) => {
          const def = etatMap[key];
          const ItemIcon = def.icon;
          return (
            <DropdownMenuItem key={key} onClick={() => onSelect(key)}>
              <ItemIcon className="mr-2 size-3.5" />
              {def.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function CompteRenduBadge({ statut }: { statut: StatutCompteRendu }) {
  return <Badge def={crMap[statut] ?? crMap.a_faire} />;
}

export function PaiementBadge({ statut }: { statut: StatutPaiement }) {
  return <Badge def={paiementMap[statut] ?? paiementMap.impaye} />;
}

export const ETAT_LABELS = etatMap;
export const CR_LABELS = crMap;
export const PAIEMENT_LABELS = paiementMap;
