import { useCallback, useEffect, useState, type HTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toastMessage } from "@/lib/api/errors";
import {
  checkPatientDuplicates,
  createPatient,
  type PatientDuplicateMatch,
  type PatientRow,
  type PatientWritePayload,
} from "@/lib/api/patients";

const MUTUELLES = ["AMO", "CNSS", "CNOPS", "Privée", "Sans"] as const;

export type PatientCreateDraft = {
  nom: string;
  prenom: string;
  cin: string;
  dateNaissance: string;
  sexe: string;
  telephone: string;
  telephoneSecondaire: string;
  email: string;
  adresse: string;
  ville: string;
  mutuelle: string;
  numAffiliation: string;
  conventionType: string;
  medecinTraitant: string;
  vip: boolean;
  pacemaker: boolean;
  pregnant: boolean;
  contrastAllergy: boolean;
  medicalAlerts: string;
  force: boolean;
};

const emptyDraft = (): PatientCreateDraft => ({
  nom: "",
  prenom: "",
  cin: "",
  dateNaissance: "",
  sexe: "",
  telephone: "",
  telephoneSecondaire: "",
  email: "",
  adresse: "",
  ville: "",
  mutuelle: "AMO",
  numAffiliation: "",
  conventionType: "",
  medecinTraitant: "",
  vip: false,
  pacemaker: false,
  pregnant: false,
  contrastAllergy: false,
  medicalAlerts: "",
  force: false,
});

type FieldErrors = Partial<Record<keyof PatientCreateDraft, string>>;

function validateDraft(draft: PatientCreateDraft): FieldErrors {
  const errors: FieldErrors = {};
  if (!draft.nom.trim()) errors.nom = "Nom obligatoire";
  if (!draft.prenom.trim()) errors.prenom = "Prénom obligatoire";
  if (!draft.cin.trim()) errors.cin = "CIN / pièce d'identité obligatoire";
  if (!draft.dateNaissance) errors.dateNaissance = "Date de naissance obligatoire";
  if (!draft.sexe) errors.sexe = "Sexe obligatoire";
  if (!draft.telephone.trim()) errors.telephone = "Téléphone principal obligatoire";
  else if (draft.telephone.replace(/\D/g, "").length < 8) {
    errors.telephone = "Numéro de téléphone invalide";
  }
  return errors;
}

function SectionTitle({ children }: { children: string }) {
  return (
    <p className="col-span-full border-b border-border pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </p>
  );
}

/**
 * Modal de création patient réutilisable (liste patients + workflow RDV).
 */
export function PatientCreateDialog({
  open,
  onOpenChange,
  onCreated,
  navigateToDossier = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (patient: PatientRow) => void;
  /** Si true, le parent peut naviguer ; par défaut on reste sur place. */
  navigateToDossier?: boolean;
}) {
  const [draft, setDraft] = useState<PatientCreateDraft>(emptyDraft);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [duplicates, setDuplicates] = useState<PatientDuplicateMatch[]>([]);
  const [checkingDup, setCheckingDup] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setDraft(emptyDraft());
      setDuplicates([]);
      setFieldErrors({});
    }
  }, [open]);

  const runDuplicateCheck = useCallback(async () => {
    const cin = draft.cin.trim();
    if (!cin) {
      setDuplicates([]);
      return [];
    }
    setCheckingDup(true);
    try {
      const dupParams: { nom?: string; cin?: string; telephone?: string; naissance?: string } = {
        cin,
      };
      const nom = [draft.nom, draft.prenom].filter(Boolean).join(" ").trim();
      if (nom) dupParams.nom = nom;
      if (draft.telephone.trim()) dupParams.telephone = draft.telephone.trim();
      if (draft.dateNaissance) dupParams.naissance = draft.dateNaissance;
      const matches = await checkPatientDuplicates(dupParams);
      setDuplicates(matches);
      if (matches.length > 0) setDraft((d) => ({ ...d, force: false }));
      return matches;
    } catch (e) {
      toast.error(toastMessage(e));
      return [];
    } finally {
      setCheckingDup(false);
    }
  }, [draft.cin, draft.nom, draft.prenom, draft.telephone, draft.dateNaissance]);

  const submit = async () => {
    const errors = validateDraft(draft);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast.error("Formulaire incomplet", {
        description: "Corrigez les champs obligatoires signalés.",
      });
      return;
    }
    if (duplicates.length > 0 && !draft.force) {
      toast.error("Doublon possible", {
        description: "Confirmez la création forcée ou vérifiez le dossier existant.",
      });
      return;
    }

    setIsSaving(true);
    try {
      let matches = duplicates;
      if (matches.length === 0) {
        matches = await runDuplicateCheck();
        if (matches.length > 0 && !draft.force) {
          setIsSaving(false);
          return;
        }
      }

      const payload: PatientWritePayload = {
        nom: draft.nom.trim(),
        prenom: draft.prenom.trim(),
        nomComplet: `${draft.nom.trim()} ${draft.prenom.trim()}`.trim(),
        cin: draft.cin.trim().toUpperCase(),
        dateNaissance: draft.dateNaissance,
        sexe: draft.sexe,
        telephone: draft.telephone.trim(),
        mutuelle: draft.mutuelle,
        vip: draft.vip,
        pacemaker: draft.pacemaker,
        pregnant: draft.pregnant,
        contrastAllergy: draft.contrastAllergy,
      };
      if (draft.telephoneSecondaire.trim()) {
        payload.telephoneDomicile = draft.telephoneSecondaire.trim();
      }
      if (draft.email.trim()) payload.email = draft.email.trim();
      if (draft.adresse.trim()) payload.adresse = draft.adresse.trim();
      if (draft.ville.trim()) payload.ville = draft.ville.trim();
      if (draft.numAffiliation.trim()) payload.numAffiliation = draft.numAffiliation.trim();
      if (draft.conventionType.trim()) payload.conventionType = draft.conventionType.trim();
      if (draft.medecinTraitant.trim()) payload.medecinTraitant = draft.medecinTraitant.trim();
      if (draft.medicalAlerts.trim()) payload.medicalAlerts = draft.medicalAlerts.trim();
      if (matches.length > 0) payload.force = true;

      const created = await createPatient(payload);
      toast.success("Patient créé avec succès", {
        description: created.numeroDossier
          ? `Dossier ${created.numeroDossier} — ${created.nomComplet}`
          : created.nomComplet,
      });
      onOpenChange(false);
      onCreated?.(created);
      if (navigateToDossier) {
        /* parent decides navigation */
      }
    } catch (e) {
      const msg = toastMessage(e);
      if (/existe déjà|duplicate|unique|dossier/i.test(msg)) {
        toast.error("Ce numéro de dossier ou CIN existe déjà", { description: msg });
      } else {
        toast.error(msg);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const set =
    (key: keyof PatientCreateDraft) =>
    (value: string | boolean) => {
      setDraft((d) => ({ ...d, [key]: value, ...(key === "cin" ? { force: false } : {}) }));
      setFieldErrors((prev) => {
        if (!prev[key]) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
    };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
          <DialogTitle>Nouveau patient</DialogTitle>
          <DialogDescription>
            Identité, contact et couverture — champs marqués * obligatoires.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <SectionTitle>Identité</SectionTitle>
            <Field
              id="pc-nom"
              label="Nom *"
              value={draft.nom}
              error={fieldErrors.nom}
              onChange={set("nom")}
              autoComplete="family-name"
            />
            <Field
              id="pc-prenom"
              label="Prénom *"
              value={draft.prenom}
              error={fieldErrors.prenom}
              onChange={set("prenom")}
              autoComplete="given-name"
            />
            <Field
              id="pc-cin"
              label="CIN / Passeport *"
              value={draft.cin}
              error={fieldErrors.cin}
              onChange={set("cin")}
              onBlur={() => void runDuplicateCheck()}
            />
            <Field
              id="pc-naissance"
              label="Date de naissance *"
              type="date"
              value={draft.dateNaissance}
              error={fieldErrors.dateNaissance}
              onChange={set("dateNaissance")}
            />
            <div className="space-y-1.5">
              <Label>Sexe *</Label>
              <Select value={draft.sexe || undefined} onValueChange={(v) => set("sexe")(v)}>
                <SelectTrigger className={fieldErrors.sexe ? "border-destructive" : undefined}>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Masculin</SelectItem>
                  <SelectItem value="F">Féminin</SelectItem>
                </SelectContent>
              </Select>
              {fieldErrors.sexe ? (
                <p className="text-xs text-destructive">{fieldErrors.sexe}</p>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground sm:col-span-1 sm:self-end">
              Le n° de dossier est attribué automatiquement à la création.
            </p>

            <SectionTitle>Contact</SectionTitle>
            <Field
              id="pc-tel"
              label="Téléphone principal *"
              value={draft.telephone}
              error={fieldErrors.telephone}
              onChange={set("telephone")}
              inputMode="tel"
            />
            <Field
              id="pc-tel2"
              label="Téléphone secondaire"
              value={draft.telephoneSecondaire}
              onChange={set("telephoneSecondaire")}
              inputMode="tel"
            />
            <Field
              id="pc-email"
              label="Email"
              type="email"
              value={draft.email}
              onChange={set("email")}
              className="sm:col-span-2"
            />
            <Field
              id="pc-adresse"
              label="Adresse"
              value={draft.adresse}
              onChange={set("adresse")}
              className="sm:col-span-2"
            />
            <Field id="pc-ville" label="Ville" value={draft.ville} onChange={set("ville")} />

            <SectionTitle>Assurance / Mutuelle</SectionTitle>
            <div className="space-y-1.5">
              <Label>Mutuelle / Assurance</Label>
              <Select value={draft.mutuelle} onValueChange={(v) => set("mutuelle")(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MUTUELLES.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Field
              id="pc-affil"
              label="N° d'adhérent"
              value={draft.numAffiliation}
              onChange={set("numAffiliation")}
            />
            <Field
              id="pc-contrat"
              label="N° / type de contrat"
              value={draft.conventionType}
              onChange={set("conventionType")}
              className="sm:col-span-2"
            />

            <SectionTitle>Informations administratives</SectionTitle>
            <Field
              id="pc-medecin"
              label="Médecin prescripteur / traitant"
              value={draft.medecinTraitant}
              onChange={set("medecinTraitant")}
              className="sm:col-span-2"
            />
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="pc-alerts">Alertes / notes administratives</Label>
              <Input
                id="pc-alerts"
                value={draft.medicalAlerts}
                onChange={(e) => set("medicalAlerts")(e.target.value)}
                placeholder="Allergies contrastes, pacemaker, grossesse…"
              />
            </div>
            <div className="grid gap-2 sm:col-span-2 sm:grid-cols-2">
              {(
                [
                  ["vip", "VIP"],
                  ["pacemaker", "Pacemaker"],
                  ["pregnant", "Grossesse"],
                  ["contrastAllergy", "Allergie contraste"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                  <span>{label}</span>
                  <Switch
                    checked={draft[key]}
                    onCheckedChange={(c) => set(key)(c)}
                  />
                </label>
              ))}
            </div>
          </div>

          {duplicates.length > 0 ? (
            <Alert variant="destructive">
              <AlertTitle>Doublon possible ({duplicates.length})</AlertTitle>
              <AlertDescription className="space-y-2">
                <ul className="list-inside list-disc text-xs">
                  {duplicates.slice(0, 3).map((d) => (
                    <li key={d.patientId}>
                      {d.nomComplet}
                      {d.numeroDossier ? ` · ${d.numeroDossier}` : ""}
                    </li>
                  ))}
                </ul>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={draft.force}
                    onCheckedChange={(c) => set("force")(c === true)}
                  />
                  Créer quand même (forcé)
                </label>
              </AlertDescription>
            </Alert>
          ) : null}
          {checkingDup ? (
            <p className="text-xs text-muted-foreground">Vérification anti-doublon…</p>
          ) : null}
        </div>

        <DialogFooter className="shrink-0 border-t border-border px-6 py-3">
          <Button variant="outline" disabled={isSaving} onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button disabled={isSaving} onClick={() => void submit()}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" /> Création…
              </>
            ) : (
              "Créer le patient"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  type = "text",
  className,
  autoComplete,
  inputMode,
  onBlur,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  type?: string;
  className?: string;
  autoComplete?: string;
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
  onBlur?: () => void;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        autoComplete={autoComplete}
        inputMode={inputMode}
        className={error ? "border-destructive" : undefined}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
