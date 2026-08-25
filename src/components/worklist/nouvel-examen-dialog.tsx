import { useCallback, useEffect, useState } from "react";
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
import { fetchResources, type ResourceDto } from "@/lib/api/appointments";
import { MODALITES, createExamen, type WorklistItem } from "@/lib/api/worklist";
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
  resourceId: "",
  salle: "",
  dateHeure: "",
};

export function NouvelExamenDialog({ onCreated }: { onCreated?: (item?: WorklistItem) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [resources, setResources] = useState<ResourceDto[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [resourcesError, setResourcesError] = useState<string | null>(null);
  const [prescripteur, setPrescripteur] = useState<{ id: string | null; nom: string }>({
    id: null,
    nom: "",
  });
  const [touched, setTouched] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setResourcesLoading(true);
    setResourcesError(null);
    fetchResources(controller.signal)
      .then((rows) => {
        const active = rows.filter((r) => r.actif !== false);
        setResources(active);
        setDraft((d) => {
          if (d.resourceId) return d;
          const first = active[0];
          if (!first) return d;
          return { ...d, resourceId: first.id, salle: first.libelle };
        });
      })
      .catch((e: unknown) => {
        setResources([]);
        setResourcesError(
          e instanceof Error ? e.message : "Impossible de charger les salles / machines",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setResourcesLoading(false);
      });
    return () => controller.abort();
  }, [open]);

  const errors = {
    nom: draft.nom.trim() === "",
    prenom: draft.prenom.trim() === "",
    cin: draft.cin.trim() === "",
    dateHeure: draft.dateHeure === "",
    resourceId: draft.resourceId.trim() === "",
    prescripteur: prescripteur.nom.trim() === "",
  };
  const isValid = !Object.values(errors).some(Boolean) && !resourcesError && resources.length > 0;
  const invalid = (key: keyof typeof errors) =>
    touched && errors[key] ? "border-destructive focus-visible:ring-destructive/40" : "";

  const submit = useCallback(async () => {
    setTouched(true);
    if (!isValid) {
      toast.error(
        resourcesError || resources.length === 0
          ? "Sélectionnez une salle / machine valide (ressources indisponibles)."
          : "Complétez les champs obligatoires du formulaire.",
      );
      return;
    }
    setIsSaving(true);
    try {
      const selected = resources.find((r) => r.id === draft.resourceId);
      const created = await createExamen({
        ...draft,
        nom: draft.nom.trim().toUpperCase(),
        prenom: draft.prenom.trim(),
        cin: draft.cin.trim().toUpperCase(),
        salle: selected?.libelle ?? draft.salle,
        resourceId: draft.resourceId,
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
  }, [draft, isValid, onCreated, prescripteur, resources, resourcesError]);

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
              <Label>Salle / machine *</Label>
              {resourcesLoading ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Chargement des ressources…
                </p>
              ) : resourcesError ? (
                <p className="text-sm text-destructive">{resourcesError}</p>
              ) : resources.length === 0 ? (
                <p className="text-sm text-destructive">Aucune salle / machine active.</p>
              ) : (
                <Select
                  value={draft.resourceId || undefined}
                  onValueChange={(v) => {
                    const selected = resources.find((r) => r.id === v);
                    setDraft((d) => ({
                      ...d,
                      resourceId: v,
                      salle: selected?.libelle ?? d.salle,
                      modalite: selected?.modalite || d.modalite,
                    }));
                  }}
                >
                  <SelectTrigger className={cn(invalid("resourceId"))}>
                    <SelectValue placeholder="Choisir une salle" />
                  </SelectTrigger>
                  <SelectContent>
                    {resources.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.libelle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
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

        <section className="space-y-4">
          <h3 className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
            Médecin prescripteur *
          </h3>
          <div className={cn(touched && errors.prescripteur && "rounded-md ring-1 ring-destructive/40")}>
            <ReferentCombobox value={prescripteur} onChange={setPrescripteur} />
          </div>
        </section>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
            Annuler
          </Button>
          <Button onClick={() => void submit()} disabled={isSaving || resourcesLoading}>
            {isSaving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
