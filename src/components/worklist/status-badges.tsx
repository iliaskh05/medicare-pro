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
    label: "En attente",
    icon: CircleDot,
    className: "border-border bg-muted text-muted-foreground",
  },
  arrive: {
    label: "Arrivé",
    icon: UserCheck,
    className: "border-info/25 bg-info/10 text-info",
  },
  retard: {
    label: "En retard",
    icon: Clock,
    className: "border-warning/30 bg-warning/10 text-warning",
  },
  attente_longue: {
    label: "Attente longue",
    icon: AlertTriangle,
    className: "border-destructive/25 bg-destructive/10 text-destructive",
  },
};

const crMap: Record<StatutCompteRendu, BadgeDef> = {
  a_faire: {
    label: "Brouillon",
    icon: FileText,
    className: "border-border bg-muted text-muted-foreground",
  },
  en_redaction: {
    label: "En rédaction",
    icon: PenLine,
    className: "border-warning/30 bg-warning/10 text-warning",
  },
  signe: {
    label: "Signé",
    icon: FileSignature,
    className: "border-success/25 bg-success/10 text-success",
  },
  imprime: {
    label: "Validé",
    icon: Printer,
    className: "border-info/25 bg-info/10 text-info",
  },
};

const paiementMap: Record<StatutPaiement, BadgeDef> = {
  impaye: {
    label: "Impayée",
    icon: Wallet,
    className: "border-destructive/25 bg-destructive/10 text-destructive",
  },
  cote: {
    label: "Partiellement payé",
    icon: CreditCard,
    className: "border-warning/30 bg-warning/10 text-warning",
  },
  paye: {
    label: "Payée",
    icon: CreditCard,
    className: "border-success/25 bg-success/10 text-success",
  },
};

function Badge({ def }: { def: BadgeDef }) {
  const Icon = def.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
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
            "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
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

const dossierMap: Record<string, BadgeDef> = {
  a_preparer: {
    label: "À préparer",
    icon: FileText,
    className: "border-border bg-muted text-muted-foreground",
  },
  pret: {
    label: "Dossier prêt",
    icon: FileSignature,
    className: "border-info/25 bg-info/10 text-info",
  },
  remis: {
    label: "Remis",
    icon: UserCheck,
    className: "border-success/25 bg-success/10 text-success",
  },
  non_remis: {
    label: "Non remis",
    icon: AlertTriangle,
    className: "border-warning/30 bg-warning/10 text-warning",
  },
  envoye: {
    label: "Envoyé",
    icon: Printer,
    className: "border-primary/20 bg-primary/10 text-primary",
  },
};

export function DossierBadge({ statut }: { statut?: string }) {
  const def = dossierMap[statut ?? "a_preparer"] ?? dossierMap.a_preparer;
  return <Badge def={def} />;
}

export const DOSSIER_LABELS = dossierMap;
