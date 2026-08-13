import { useEffect, useState } from "react";
import { FileDown, History, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui-kit";
import {
  CompteRenduBadge,
  EtatPatientBadge,
  PaiementBadge,
} from "@/components/worklist/status-badges";
import { saveCompteRendu, type WorklistItem } from "@/lib/api/worklist";
import { formatMAD } from "@/types/domain";

function Field({ label, value }: { label: string; value?: string | number | undefined }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="truncate text-sm font-medium">{value === undefined || value === "" ? "—" : value}</p>
    </div>
  );
}

export function ExamenSheet({
  item,
  open,
  onOpenChange,
}: {
  item: WorklistItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [texte, setTexte] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setTexte(item?.compteRendu ?? "");
  }, [item]);

  if (!item) return null;

  const save = async () => {
    setIsSaving(true);
    try {
      await saveCompteRendu(item.id, texte);
      toast.success("Compte rendu enregistré.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-4 sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="truncate">{item.patient}</SheetTitle>
          <SheetDescription>
            Séjour {item.numSejour} · {item.description}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-wrap gap-2">
          <EtatPatientBadge etat={item.etatPatient} />
          <CompteRenduBadge statut={item.statutCr} />
          <PaiementBadge statut={item.paiement} />
        </div>

        <Tabs defaultValue="patient" className="flex min-h-0 flex-1 flex-col">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="patient">Informations patient</TabsTrigger>
            <TabsTrigger value="examen">Examen</TabsTrigger>
            <TabsTrigger value="cr">Compte rendu</TabsTrigger>
            <TabsTrigger value="historique">Historique</TabsTrigger>
          </TabsList>

          <TabsContent value="patient" className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Nom complet" value={item.patient} />
            <Field label="CIN" value={item.cin} />
            <Field label="Âge" value={item.age !== undefined ? `${item.age} ans` : undefined} />
            <Field label="Sexe" value={item.sexe} />
            <Field label="Téléphone" value={item.telephone} />
            <Field label="N° séjour" value={item.numSejour} />
          </TabsContent>

          <TabsContent value="examen" className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Description" value={item.description} />
            <Field label="Modalité" value={item.modalite} />
            <Field label="Salle" value={item.salle} />
            <Field label="Date d'examen" value={item.dateExamen} />
            <Field label="Radiologue" value={item.medecin} />
            <Field label="Prescripteur" value={item.prescripteur} />
            <Field
              label="Montant"
              value={item.montant !== undefined ? formatMAD(item.montant) : undefined}
            />
          </TabsContent>

          <TabsContent value="cr" className="mt-4 flex min-h-0 flex-1 flex-col gap-3">
            <Textarea
              aria-label="Éditeur de compte rendu"
              className="min-h-64 flex-1 font-mono text-sm"
              placeholder="Indication, technique, résultats, conclusion…"
              value={texte}
              onChange={(e) => setTexte(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Button onClick={save} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Save className="mr-2 size-4" />
                )}
                Enregistrer le compte rendu
              </Button>
              <Button variant="outline" onClick={() => window.print()}>
                <FileDown className="mr-2 size-4" /> Imprimer / PDF
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="historique" className="mt-4">
            {item.historique && item.historique.length > 0 ? (
              <ul className="space-y-3">
                {item.historique.map((h, i) => (
                  <li key={`${h.date}-${i}`} className="rounded-lg border border-border p-3">
                    <p className="text-sm font-medium">{h.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {h.date} · {h.auteur}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={History}
                title="Aucune action enregistrée"
                description="L'historique des actions apparaîtra ici dès la connexion au serveur du centre."
                compact
              />
            )}
          </TabsContent>
        </Tabs>

        <Separator />
        <p className="text-xs text-muted-foreground">
          RadioCRM — Centre d&apos;Imagerie Médicale · Direction : Mr Adnane
        </p>
      </SheetContent>
    </Sheet>
  );
}
