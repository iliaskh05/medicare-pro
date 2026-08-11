import { useState } from "react";
import { FilePlus2, Loader2 } from "lucide-react";
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
import { telechargerDossierPdf } from "@/lib/pdf-export";

export type DocumentContext = {
  patient: string;
  reference: string;
  examen: string;
  total: number;
  acompte: number;
};

const defaultContext: DocumentContext = {
  patient: "Karim Bennani",
  reference: "PAT-1042",
  examen: "IRM Cérébrale",
  total: 1500,
  acompte: 500,
};

const mad = (n: number) => `${n.toLocaleString("fr-MA")} DH`;

const modeles = [
  "Facture d'acompte",
  "Facture solde",
  "Compte Rendu Médical",
  "Demande de prise en charge",
] as const;

export function DocumentMenu({
  context = defaultContext,
  variant = "outline",
  size,
  className,
}: {
  context?: DocumentContext;
  variant?: "outline" | "default" | "ghost";
  size?: "sm" | "default";
  className?: string;
}) {
  const [loading, setLoading] = useState<string | null>(null);

  const generer = (modele: string) => {
    if (loading) return;
    setLoading(modele);
    {
      const reste = context.total - context.acompte;
      const lignes = [
        { label: "Patient", valeur: context.patient },
        { label: "Dossier", valeur: context.reference },
        { label: "Examen", valeur: context.examen },
        { label: "Montant total", valeur: mad(context.total) },
        { label: "Acompte encaissé", valeur: mad(context.acompte) },
        { label: "Reste à payer", valeur: mad(reste) },
      ];
      telechargerDossierPdf({
        titre: modele,
        reference: `${context.reference}-${modele.slice(0, 3).toUpperCase()}`,
        lignes,
        blocs: [
          {
            titre: "Objet",
            contenu: `${modele} émis(e) par le Centre d'Imagerie Médicale pour l'examen « ${context.examen} ».`,
          },
        ],
        mention:
          "Hébergement sécurisé HDS — Conforme aux directives de la CNDP (Loi 09-08) sur la protection des données.",
      });
      setLoading(null);
      toast.success(`${modele} générée`, {
        description: `${context.patient} · ${context.reference} — PDF prêt au téléchargement.`,
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={className} disabled={loading !== null}>
          {loading ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <FilePlus2 className="mr-2 size-4" />
          )}
          {loading ? "Génération…" : "Créer un document"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Modèles disponibles</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {modeles.map((m) => (
          <DropdownMenuItem key={m} onClick={() => generer(m)} className="py-2">
            {m}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
