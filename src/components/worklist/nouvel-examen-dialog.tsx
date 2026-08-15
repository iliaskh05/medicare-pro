import { useCallback, useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ReferentCombobox } from "@/components/worklist/referent-combobox";
import { MODALITES, SALLES, createExamen, type WorklistItem } from "@/lib/api/worklist";
import { typesExamen } from "@/types/domain";
import { cn } from "@/lib/utils";

const emptyDraft = {
  nom: "",
  prenom: "",
  cin: "",
  naissance: "",
  sexe: "F",
  telephone: "",
  typeExamen: typesExamen[0] ?? "",
  modalite: MODALITES[0] as string,
  salle: SALLES[0] as string,
  dateHeure: "",
};

export function NouvelExamenDialog({ onCreated }: { onCreated?: (item?: WorklistItem) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [prescripteur, setPrescripteur] = useState<{ id: string | null; nom: string }>({
    id: null,
    nom: "",
  });
  const [touched, setTouched] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const errors = {
    nom: draft.nom.trim() === "",
    prenom: draft.prenom.trim() === "",
    cin: draft.cin.trim() === "",
    dateHeure: draft.dateHeure === "",
    prescripteur: prescripteur.nom.trim() === "",
  };
  const isValid = !Object.values(errors).some(Boolean);
  const invalid = (key: keyof typeof errors) =>
    touched && errors[key] ? "border-destructive focus-visible:ring-destructive/40" : "";

  const submit = useCallback(async () => {
    setTouched(true);
    if (!isValid) {
      toast.error("Complétez les champs obligatoires du formulaire.");
      return;
    }
    setIsSaving(true);
    try {
      const created = await createExamen({
        ...draft,
        nom: draft.nom.trim().toUpperCase(),
        prenom: draft.prenom.trim(),
        cin: draft.cin.trim().toUpperCase(),
        prescripteurId: prescripteur.id,
        prescripteurNom: prescripteur.nom.trim(),
      });
      onCreated?.(created);
      toast.success(`Examen enregistré pour ${created.patient}`);
      setDraft(emptyDraft);
      setPrescripteur({ id: null, nom: "" });
      setTouched(false);
      setOpen(false);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Enregistrement impossible : service indisponible.",
      );
    } finally {
      setIsSaving(false);
    }
  }, [draft, isValid, onCreated, prescripteur]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-tour="worklist-nouveau">
          <UserPlus className="mr-2 size-4" /> Nouveau patient / examen
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Création d&apos;un examen</DialogTitle>
          <DialogDescription>
            Identité du patient, acte programmé et médecin prescripteur.
          </DialogDescription>
        </DialogHeader>

        <section className="space-y-4">
          <h3 className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
            Informations patient
          </h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="ne-nom">Nom *</Label>
              <Input
                id="ne-nom"
                className={cn(invalid("nom"))}
                value={draft.nom}
                onChange={(e) => setDraft((d) => ({ ...d, nom: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ne-prenom">Prénom *</Label>
              <Input
                id="ne-prenom"
                className={cn(invalid("prenom"))}
                value={draft.prenom}
                onChange={(e) => setDraft((d) => ({ ...d, prenom: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ne-cin">CIN *</Label>
              <Input
                id="ne-cin"
                className={cn(invalid("cin"))}
                value={draft.cin}
                onChange={(e) => setDraft((d) => ({ ...d, cin: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ne-naissance">Date de naissance</Label>
              <Input
                id="ne-naissance"
                type="date"
                value={draft.naissance}
                onChange={(e) => setDraft((d) => ({ ...d, naissance: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Sexe</Label>
              <Select
                value={draft.sexe}
                onValueChange={(v) => setDraft((d) => ({ ...d, sexe: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="F">Féminin</SelectItem>
                  <SelectItem value="M">Masculin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ne-tel">Téléphone</Label>
              <Input
                id="ne-tel"
                value={draft.telephone}
                onChange={(e) => setDraft((d) => ({ ...d, telephone: e.target.value }))}
              />
            </div>
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <h3 className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
            Informations examen
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Type d&apos;examen</Label>
              <Select
                value={draft.typeExamen}
                onValueChange={(v) => setDraft((d) => ({ ...d, typeExamen: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {typesExamen.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Modalité</Label>
              <Select
                value={draft.modalite}
                onValueChange={(v) => setDraft((d) => ({ ...d, modalite: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODALITES.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Salle</Label>
              <Select
                value={draft.salle}
                onValueChange={(v) => setDraft((d) => ({ ...d, salle: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SALLES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ne-date">Date & heure *</Label>
              <Input
                id="ne-date"
                type="datetime-local"
                className={cn(invalid("dateHeure"))}
                value={draft.dateHeure}
                onChange={(e) => setDraft((d) => ({ ...d, dateHeure: e.target.value }))}
              />
            </div>
          </div>
        </section>

        <Separator />

        <section className="space-y-2">
          <h3 className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
            Médecin prescripteur *
          </h3>
          <ReferentCombobox value={prescripteur} onChange={setPrescripteur} />
          {touched && errors.prescripteur ? (
            <p className="text-xs font-medium text-destructive">
              Le médecin correspondant est obligatoire.
            </p>
          ) : null}
        </section>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button onClick={submit} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Enregistrer l&apos;examen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
