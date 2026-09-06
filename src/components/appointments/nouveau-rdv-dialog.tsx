import { useEffect, useMemo, useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { PatientCreateDialog } from "@/components/patients/patient-create-dialog";
import { ReferentCombobox } from "@/components/worklist/referent-combobox";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import {
  createAppointment,
  fetchAppointments,
  fetchResources,
  type AppointmentDto,
  type ResourceDto,
} from "@/lib/api/appointments";
import { fetchCatalogue, type CatalogueActe } from "@/lib/api/catalogue";
import { searchPatients, type PatientRow } from "@/lib/api/patients";
import {
  appointmentTime,
  generateDaySlots,
  isActiveAppointmentStatus,
  rangesOverlap,
  timeToMinutes,
} from "@/lib/appointment-slots";
import { toLocalDateKey } from "@/lib/date";
import { toastMessage } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

const TIME_SLOTS = generateDaySlots();

type Step = "form" | "confirm";

export type NouveauRdvDefaults = {
  date?: string;
  time?: string;
  resourceId?: string;
};

export function NouveauRdvDialog({
  open,
  onOpenChange,
  defaults,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaults?: NouveauRdvDefaults;
  onCreated?: (row: AppointmentDto) => void;
}) {
  const [step, setStep] = useState<Step>("form");
  const [patientQuery, setPatientQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [patientHits, setPatientHits] = useState<PatientRow[]>([]);
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [patient, setPatient] = useState<PatientRow | null>(null);
  const [createPatientOpen, setCreatePatientOpen] = useState(false);

  const [actes, setActes] = useState<CatalogueActe[]>([]);
  const [catalogueId, setCatalogueId] = useState("");
  const [resources, setResources] = useState<ResourceDto[]>([]);
  const [dayAppointments, setDayAppointments] = useState<AppointmentDto[]>([]);

  const [date, setDate] = useState(toLocalDateKey());
  const [time, setTime] = useState("09:00");
  const [resourceId, setResourceId] = useState("");
  const [notes, setNotes] = useState("");
  const [prescripteur, setPrescripteur] = useState<{ id: string | null; nom: string }>({
    id: null,
    nom: "",
  });
  const [saving, setSaving] = useState(false);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);

  const acte = actes.find((a) => String(a.id) === catalogueId) ?? null;

  const compatibleRooms = useMemo(() => {
    const active = resources.filter((r) => r.actif !== false);
    if (!acte?.modalite) return active;
    return active.filter(
      (r) =>
        Boolean(r.modalite) &&
        r.modalite!.toUpperCase() === acte.modalite.toUpperCase(),
    );
  }, [resources, acte]);

  const selectedRoom = compatibleRooms.find((r) => r.id === resourceId) ?? null;

  const roomConflict = useMemo(() => {
    if (!resourceId || !date || !time || !acte) return false;
    const startMin = timeToMinutes(time);
    const duration = acte.dureeMinutes ?? 30;
    const endMin = startMin + duration;
    return dayAppointments.some((appt) => {
      if (!isActiveAppointmentStatus(String(appt.statut))) return false;
      if (String(appt.resourceId ?? "") !== resourceId) return false;
      const otherStart = timeToMinutes(appointmentTime(appt.startsAt));
      if (otherStart < 0 || Number.isNaN(otherStart)) return false;
      const otherEnd = appt.endsAt
        ? timeToMinutes(appointmentTime(appt.endsAt))
        : otherStart + (appt.dureeMinutes || 30);
      return rangesOverlap(startMin, endMin, otherStart, otherEnd);
    });
  }, [acte, date, dayAppointments, resourceId, time]);

  const noCompatibleRoom = Boolean(acte && compatibleRooms.length === 0);
  const roomHorsService = Boolean(
    resourceId && resources.some((r) => r.id === resourceId && r.actif === false),
  );

  useEffect(() => {
    if (!open) return;
    setStep("form");
    setPatient(null);
    setPatientQuery("");
    setCatalogueId("");
    setNotes("");
    setPrescripteur({ id: null, nom: "" });
    setDate(defaults?.date || toLocalDateKey());
    setTime(defaults?.time && TIME_SLOTS.includes(defaults.time) ? defaults.time : "09:00");
    setResourceId(defaults?.resourceId ?? "");
    setDiscardConfirmOpen(false);
  }, [open, defaults?.date, defaults?.time, defaults?.resourceId]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(patientQuery.trim()), 280);
    return () => window.clearTimeout(t);
  }, [patientQuery]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    fetchCatalogue(true, controller.signal)
      .then(setActes)
      .catch(() => setActes([]));
    fetchResources(controller.signal)
      .then(setResources)
      .catch(() => setResources([]));
    return () => controller.abort();
  }, [open]);

  useEffect(() => {
    if (!open || !date) return;
    const controller = new AbortController();
    fetchAppointments({ from: date, to: date }, controller.signal)
      .then(setDayAppointments)
      .catch(() => setDayAppointments([]));
    return () => controller.abort();
  }, [open, date]);

  useEffect(() => {
    if (!open || step !== "form" || patient) return;
    const controller = new AbortController();
    setSearchingPatients(true);
    searchPatients(
      {
        ...(debouncedQuery ? { search: debouncedQuery } : {}),
        page: 0,
        size: 8,
      },
      controller.signal,
    )
      .then((page) => {
        if (!controller.signal.aborted) setPatientHits(page.content);
      })
      .catch(() => {
        if (!controller.signal.aborted) setPatientHits([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setSearchingPatients(false);
      });
    return () => controller.abort();
  }, [debouncedQuery, open, patient, step]);

  useEffect(() => {
    if (!acte) return;
    if (resourceId && !compatibleRooms.some((r) => r.id === resourceId)) {
      setResourceId("");
    }
  }, [acte, compatibleRooms, resourceId]);

  const validationError = (): string | null => {
    if (!patient) return "Sélectionnez un patient.";
    if (!acte) return "Sélectionnez un examen.";
    if (!date) return "Choisissez une date.";
    if (!time) return "Choisissez une heure.";
    if (noCompatibleRoom) {
      return "Aucune salle compatible n'est disponible pour cet examen.";
    }
    if (!resourceId || !selectedRoom) return "Sélectionnez une salle spécialisée.";
    if (roomHorsService) return "Cette salle est hors service.";
    if (roomConflict) return "Cette salle est déjà occupée sur ce créneau.";
    return null;
  };

  const requestClose = () => {
    if (step === "confirm" || patient || catalogueId || notes.trim()) {
      setDiscardConfirmOpen(true);
      return;
    }
    onOpenChange(false);
  };

  const submit = async () => {
    const err = validationError();
    if (err) {
      toast.error(err);
      return;
    }
    if (!patient || !acte || !selectedRoom) return;
    setSaving(true);
    try {
      const created = await createAppointment({
        patientId: patient.id,
        catalogueId: acte.id,
        resourceId: selectedRoom.id,
        dateHeure: `${date}T${time}`,
        dureeMinutes: acte.dureeMinutes ?? 30,
        modalite: acte.modalite,
        motif: acte.nom,
        salle: selectedRoom.libelle,
        ...(prescripteur.id ? { prescripteurId: prescripteur.id } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      toast.success("Rendez-vous créé.");
      onCreated?.(created);
      onOpenChange(false);
    } catch (e) {
      toast.error(toastMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) requestClose();
          else onOpenChange(true);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {step === "confirm" ? "Confirmer le rendez-vous" : "Nouveau rendez-vous"}
            </DialogTitle>
            <DialogDescription>
              {step === "confirm"
                ? "Vérifiez les informations avant de créer le rendez-vous."
                : "Patient, examen, créneau et salle spécialisée."}
            </DialogDescription>
          </DialogHeader>

          {step === "form" ? (
            <div className="space-y-4 py-1">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>Patient</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setCreatePatientOpen(true)}
                  >
                    <UserPlus className="mr-1.5 size-3.5" />
                    Créer un patient
                  </Button>
                </div>
                {patient ? (
                  <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{patient.nomComplet}</p>
                      <p className="text-xs text-muted-foreground">
                        {patient.numeroDossier ?? patient.id} · {patient.cin}
                      </p>
                    </div>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setPatient(null)}>
                      Changer
                    </Button>
                  </div>
                ) : (
                  <>
                    <Input
                      placeholder="Rechercher nom, CIN, téléphone…"
                      value={patientQuery}
                      onChange={(e) => setPatientQuery(e.target.value)}
                    />
                    <div className="max-h-36 overflow-y-auto rounded-md border border-border">
                      {searchingPatients ? (
                        <p className="px-3 py-2 text-xs text-muted-foreground">Recherche…</p>
                      ) : patientHits.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-muted-foreground">Aucun résultat</p>
                      ) : (
                        patientHits.map((row) => (
                          <button
                            key={row.id}
                            type="button"
                            className="flex w-full flex-col border-b border-border px-3 py-2 text-left last:border-0 hover:bg-muted/40"
                            onClick={() => setPatient(row)}
                          >
                            <span className="text-sm font-medium">{row.nomComplet}</span>
                            <span className="text-[11px] text-muted-foreground">
                              {row.cin} · {row.telephone}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-2">
                <Label>Examen</Label>
                <Select
                  {...(catalogueId ? { value: catalogueId } : {})}
                  onValueChange={setCatalogueId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un examen" />
                  </SelectTrigger>
                  <SelectContent>
                    {actes.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.nom} · {a.modalite}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Heure</Label>
                  <Select value={time} onValueChange={setTime}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_SLOTS.map((slot) => (
                        <SelectItem key={slot} value={slot}>
                          {slot}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Salle spécialisée</Label>
                <Select
                  {...(resourceId ? { value: resourceId } : {})}
                  onValueChange={setResourceId}
                  disabled={!acte || noCompatibleRoom}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        !acte
                          ? "Choisir d'abord un examen"
                          : noCompatibleRoom
                            ? "Aucune salle compatible"
                            : "Choisir une salle"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {compatibleRooms.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.libelle}
                        {r.modalite ? ` · ${r.modalite}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {noCompatibleRoom ? (
                  <p className="text-xs text-destructive">
                    Aucune salle compatible n&apos;est disponible pour cet examen.
                  </p>
                ) : null}
                {roomConflict ? (
                  <p className="text-xs text-destructive">
                    Cette salle est déjà occupée sur ce créneau.
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label>Médecin référent (optionnel)</Label>
                <ReferentCombobox value={prescripteur} onChange={setPrescripteur} />
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Informations complémentaires…"
                />
              </div>
            </div>
          ) : (
            <dl className="grid gap-2 py-2 text-sm">
              <Recap label="Patient" value={patient?.nomComplet ?? "—"} />
              <Recap label="Examen" value={acte?.nom ?? "—"} />
              <Recap label="Date" value={date} />
              <Recap label="Heure" value={time} />
              <Recap label="Salle" value={selectedRoom?.libelle ?? "—"} />
              <Recap
                label="Référent"
                value={prescripteur.nom.trim() || "Non précisé"}
              />
              {notes.trim() ? <Recap label="Notes" value={notes.trim()} /> : null}
            </dl>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            {step === "form" ? (
              <>
                <Button type="button" variant="outline" onClick={requestClose}>
                  Annuler
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    const err = validationError();
                    if (err) {
                      toast.error(err);
                      return;
                    }
                    setStep("confirm");
                  }}
                >
                  Continuer
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={() => setStep("form")}>
                  Retour
                </Button>
                <Button type="button" disabled={saving} onClick={submit}>
                  {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  Confirmer la création
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={discardConfirmOpen} onOpenChange={setDiscardConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Annuler la saisie ?</DialogTitle>
            <DialogDescription>
              Les informations du rendez-vous en cours seront perdues.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDiscardConfirmOpen(false)}>
              Continuer la saisie
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                setDiscardConfirmOpen(false);
                onOpenChange(false);
              }}
            >
              Abandonner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PatientCreateDialog
        open={createPatientOpen}
        onOpenChange={setCreatePatientOpen}
        onCreated={(created) => {
          setPatient(created);
          setCreatePatientOpen(false);
        }}
      />
    </>
  );
}

function Recap({ label, value }: { label: string; value: string }) {
  return (
    <div className={cn("flex justify-between gap-3 border-b border-border/60 py-1.5")}>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
