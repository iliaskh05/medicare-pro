import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ReferentCombobox } from "@/components/worklist/referent-combobox";
import { EmptyState, Surface } from "@/components/ui-kit";
import { fetchResources, createAppointment, fetchAppointments, type AppointmentDto, type ResourceDto } from "@/lib/api/appointments";
import { fetchCatalogue, type CatalogueActe } from "@/lib/api/catalogue";
import { createPatient, fetchPatientData, searchPatients, type PatientRow } from "@/lib/api/patients";
import { createExamen, fetchWorklist, type WorklistItem } from "@/lib/api/worklist";
import { formatMAD } from "@/types/domain";
import { cn } from "@/lib/utils";

export type AdmissionMode = "rdv" | "walkin";

function nowLocalInput() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AdmissionWizard({
  mode,
  initialPatientId,
  onCreated,
}: {
  mode: AdmissionMode;
  initialPatientId?: string | undefined;
  onCreated?: ((item: WorklistItem) => void) | undefined;
}) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [patient, setPatient] = useState<PatientRow | null>(null);
  const [creatingPatient, setCreatingPatient] = useState(false);
  const [newPatient, setNewPatient] = useState({
    nom: "",
    prenom: "",
    cin: "",
    naissance: "",
    sexe: "F",
    telephone: "",
  });

  const [actes, setActes] = useState<CatalogueActe[]>([]);
  const [acteId, setActeId] = useState<number | null>(null);
  const [dateHeure, setDateHeure] = useState(nowLocalInput());
  const [resources, setResources] = useState<ResourceDto[]>([]);
  const [resourceId, setResourceId] = useState("");
  const [salle, setSalle] = useState("");
  const [acompte, setAcompte] = useState("0");
  const [prescripteur, setPrescripteur] = useState<{ id: string | null; nom: string }>({
    id: null,
    nom: "",
  });
  const [dayExams, setDayExams] = useState<WorklistItem[]>([]);
  const [dayAppointments, setDayAppointments] = useState<AppointmentDto[]>([]);
  const [saving, setSaving] = useState(false);

  const acte = actes.find((a) => a.id === acteId) ?? null;
  const total = acte?.prix ?? 0;
  const avance = Math.min(Math.max(Number(acompte) || 0, 0), total);
  const reste = Math.max(total - avance, 0);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query.trim()), 280);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();
    fetchCatalogue(true, controller.signal)
      .then(setActes)
      .catch(() => setActes([]));
    fetchResources(controller.signal)
      .then((rows) => {
        const active = rows.filter((r) => r.actif !== false);
        setResources(active);
      })
      .catch(() => setResources([]));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!initialPatientId) return;
    const controller = new AbortController();
    setLoadingPatients(true);
    fetchPatientData(initialPatientId, controller.signal)
      .then((found) => {
        if (!controller.signal.aborted && found) {
          setPatient(found);
          setStep(2);
        }
      })
      .catch(() => {
        /* ignore */
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingPatients(false);
      });
    return () => controller.abort();
  }, [initialPatientId]);

  useEffect(() => {
    if (step !== 1) return;
    const controller = new AbortController();
    setLoadingPatients(true);
    searchPatients(
      {
        ...(debouncedQuery ? { search: debouncedQuery } : {}),
        page: 0,
        size: 12,
      },
      controller.signal,
    )
      .then((page) => {
        if (!controller.signal.aborted) setPatients(page.content);
      })
      .catch(() => {
        if (!controller.signal.aborted) setPatients([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingPatients(false);
      });
    return () => controller.abort();
  }, [debouncedQuery, step]);

  useEffect(() => {
    if (mode === "walkin") setDateHeure(nowLocalInput());
  }, [mode]);

  useEffect(() => {
    const day = dateHeure.slice(0, 10);
    if (!day) return;
    const controller = new AbortController();
    fetchWorklist({ date: day }, controller.signal)
      .then(setDayExams)
      .catch(() => setDayExams([]));
    fetchAppointments({ from: day, to: day }, controller.signal)
      .then(setDayAppointments)
      .catch(() => setDayAppointments([]));
    return () => controller.abort();
  }, [dateHeure]);

  const filtered = patients;

  const conflict = useMemo(() => {
    if ((!resourceId && !salle) || !dateHeure || !acte) return null;
    const start = new Date(dateHeure).getTime();
    const duration = (acte.dureeMinutes ?? 30) * 60_000;
    const end = start + duration;

    const examHit =
      dayExams.find((exam) => {
        const sameResource =
          resourceId && exam.resourceId
            ? String(exam.resourceId) === resourceId
            : Boolean(salle && exam.salle && exam.salle === salle);
        if (!sameResource) return false;
        const other = new Date(exam.dateExamenRaw ?? exam.dateExamen.replace(" ", "T")).getTime();
        if (Number.isNaN(other)) return false;
        return other < end && other + 30 * 60_000 > start;
      }) ?? null;
    if (examHit) {
      return {
        label: `${examHit.patient} · ${examHit.description} · ${examHit.dateExamen}`,
      };
    }

    const apptHit =
      dayAppointments.find((appt) => {
        if (appt.statut === "CANCELLED" || appt.statut === "NO_SHOW") return false;
        const sameResource =
          resourceId && appt.resourceId
            ? String(appt.resourceId) === resourceId
            : Boolean(salle && appt.salle && appt.salle === salle);
        if (!sameResource) return false;
        const otherStart = new Date(appt.startsAt).getTime();
        const otherEnd = appt.endsAt
          ? new Date(appt.endsAt).getTime()
          : otherStart + (appt.dureeMinutes || 30) * 60_000;
        if (Number.isNaN(otherStart)) return false;
        return otherStart < end && otherEnd > start;
      }) ?? null;
    if (apptHit) {
      return {
        label: `${apptHit.patient} · ${apptHit.examenLibelle || apptHit.modalite} · ${apptHit.startsAt}`,
      };
    }
    return null;
  }, [acte, dateHeure, dayAppointments, dayExams, resourceId, salle]);

  const createNew = async () => {
    if (!newPatient.nom.trim() || !newPatient.prenom.trim() || !newPatient.cin.trim()) {
      toast.error("Nom, prénom et CIN sont obligatoires.");
      return;
    }
    setCreatingPatient(true);
    try {
      const payload: Parameters<typeof createPatient>[0] = {
        nom: newPatient.nom.trim().toUpperCase(),
        prenom: newPatient.prenom.trim(),
        nomComplet: `${newPatient.nom.trim().toUpperCase()} ${newPatient.prenom.trim()}`,
        cin: newPatient.cin.trim().toUpperCase(),
        mutuelle: "AMO",
        sexe: newPatient.sexe,
      };
      if (newPatient.telephone.trim()) payload.telephone = newPatient.telephone.trim();
      if (newPatient.naissance) payload.dateNaissance = newPatient.naissance;
      const created = await createPatient(payload);
      setPatient(created);
      setPatients((rows) => [created, ...rows.filter((r) => r.id !== created.id)]);
      setStep(2);
      toast.success("Patient enregistré.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Création patient impossible.");
    } finally {
      setCreatingPatient(false);
    }
  };

  const confirm = async () => {
    if (!patient) {
      toast.error("Sélectionnez un patient.");
      return;
    }
    if (!acte) {
      toast.error("Sélectionnez un examen du catalogue, ou créez un acte dans Examens & tarifs.");
      return;
    }
    if (mode === "rdv" && !dateHeure) {
      toast.error("Choisissez une date et une heure.");
      return;
    }
    if (avance > total) {
      toast.error("L'avance ne peut pas dépasser le montant total.");
      return;
    }
    if (conflict) {
      toast.error("Créneau en conflit — choisissez un autre horaire ou une autre salle.");
      return;
    }
    setSaving(true);
    try {
      const selected = resources.find((r) => r.id === resourceId);
      if (mode === "rdv") {
        const notesParts = [
          avance > 0 ? `Avance demandée: ${avance} MAD (à encaisser au check-in / caisse)` : null,
          reste > 0 && avance > 0 ? `Reste prévu: ${reste} MAD` : null,
        ].filter(Boolean);
        const apptPayload: Parameters<typeof createAppointment>[0] = {
          patientId: patient.id,
          catalogueId: acte.id,
          dateHeure,
          dureeMinutes: acte.dureeMinutes ?? 30,
          modalite: acte.modalite,
          motif: acte.nom,
        };
        if (resourceId) apptPayload.resourceId = resourceId;
        const salleLabel = (selected?.libelle ?? salle).trim();
        if (salleLabel) apptPayload.salle = salleLabel;
        if (prescripteur.id) apptPayload.prescripteurId = prescripteur.id;
        if (notesParts.length) apptPayload.notes = notesParts.join(" · ");
        await createAppointment(apptPayload);
        toast.success(
          avance > 0
            ? "Rendez-vous créé dans l'agenda. Avance notée — encaissement au check-in / caisse."
            : "Rendez-vous confirmé dans l'agenda.",
        );
        onCreated?.({
          id: "",
          numSejour: "",
          patient: patient.nomComplet,
          patientId: patient.id,
          medecin: "",
          dateExamen: dateHeure,
          salle: selected?.libelle ?? salle,
          description: acte.nom,
          modalite: acte.modalite,
          etatPatient: "attendu",
          statutCr: "a_faire",
          paiement: avance >= total && total > 0 ? "paye" : avance > 0 ? "cote" : "impaye",
        });
        navigate({ to: "/agenda" });
      } else {
        const created = await createExamen({
          patientId: patient.id,
          catalogueId: acte.id,
          dateHeure: nowLocalInput(),
          salle: selected?.libelle ?? salle,
          resourceId: resourceId || null,
          prescripteurId: prescripteur.id,
          prescripteurNom: prescripteur.nom,
          passageSansRdv: true,
          acompte: avance,
          typeExamen: acte.nom,
          modalite: acte.modalite,
        });
        toast.success("Passage enregistré — patient en file d'attente.");
        onCreated?.(created);
        navigate({ to: "/file-attente" });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  const steps =
    mode === "rdv"
      ? ["Patient", "Examen", "Créneau", "Médecin", "Paiement", "Confirmation"]
      : ["Patient", "Examen", "Paiement", "Confirmation"];

  return (
    <div className="space-y-5">
      <ol className="flex flex-wrap gap-2">
        {steps.map((label, index) => (
          <li
            key={label}
            className={cn(
              "rounded-full px-3 py-1 text-[11px] font-semibold ring-1 ring-inset",
              step === index + 1
                ? "bg-primary text-primary-foreground ring-primary"
                : "bg-muted/60 text-muted-foreground ring-border",
            )}
          >
            {index + 1}. {label}
          </li>
        ))}
      </ol>

      {step === 1 ? (
        <Surface className="p-5">
          <div className="flex items-center gap-2">
            <Search className="size-4 text-muted-foreground" />
            <Input
              placeholder="Nom, prénom, CIN, téléphone ou n° dossier"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {loadingPatients ? (
            <p className="mt-4 text-sm text-muted-foreground">Recherche des dossiers…</p>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={UserPlus}
              title="Aucun patient trouvé"
              description="Créez le dossier avant de poursuivre l'admission."
              compact
            />
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {filtered.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between py-3 text-left hover:bg-muted/40"
                    onClick={() => {
                      setPatient(row);
                      setStep(2);
                    }}
                  >
                    <span>
                      <span className="block text-sm font-semibold">{row.nomComplet}</span>
                      <span className="text-xs text-muted-foreground">
                        {row.numeroDossier ?? row.id} · {row.cin} · {row.telephone}
                      </span>
                    </span>
                    <span className="text-xs font-semibold text-primary">Sélectionner</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6 grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
            <p className="sm:col-span-2 text-sm font-semibold">Nouveau patient</p>
            <div>
              <Label>Nom</Label>
              <Input value={newPatient.nom} onChange={(e) => setNewPatient({ ...newPatient, nom: e.target.value })} />
            </div>
            <div>
              <Label>Prénom</Label>
              <Input
                value={newPatient.prenom}
                onChange={(e) => setNewPatient({ ...newPatient, prenom: e.target.value })}
              />
            </div>
            <div>
              <Label>CIN</Label>
              <Input value={newPatient.cin} onChange={(e) => setNewPatient({ ...newPatient, cin: e.target.value })} />
            </div>
            <div>
              <Label>Téléphone</Label>
              <Input
                value={newPatient.telephone}
                onChange={(e) => setNewPatient({ ...newPatient, telephone: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Button onClick={createNew} disabled={creatingPatient}>
                {creatingPatient ? <Loader2 className="mr-2 size-4 animate-spin" /> : <UserPlus className="mr-2 size-4" />}
                Enregistrer le patient
              </Button>
            </div>
          </div>
        </Surface>
      ) : null}

      {step === 2 ? (
        <Surface className="p-5 space-y-4">
          <p className="text-sm text-muted-foreground">
            Patient : <span className="font-semibold text-foreground">{patient?.nomComplet}</span>
          </p>
          {actes.length === 0 ? (
            <EmptyState
              icon={Search}
              title="Catalogue vide"
              description="Aucun acte tarifé n'est encore configuré. Un administrateur doit ajouter les examens dans Examens & tarifs. Aucun prix n'est inventé."
              compact
            />
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {actes.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setActeId(row.id);
                      setStep(mode === "rdv" ? 3 : 3);
                    }}
                    className={cn(
                      "w-full rounded-lg border px-4 py-3 text-left transition-colors",
                      acteId === row.id ? "border-primary bg-primary-soft" : "border-border hover:bg-muted/40",
                    )}
                  >
                    <span className="block text-sm font-semibold">{row.nom}</span>
                    <span className="text-xs text-muted-foreground">
                      {row.modalite}
                      {row.dureeMinutes ? ` · ${row.dureeMinutes} min` : ""} · {formatMAD(row.prix)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Button variant="outline" onClick={() => setStep(1)}>
            Retour
          </Button>
        </Surface>
      ) : null}

      {mode === "rdv" && step === 3 ? (
        <Surface className="p-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Date et heure</Label>
              <Input type="datetime-local" value={dateHeure} onChange={(e) => setDateHeure(e.target.value)} />
            </div>
            <div>
              <Label>Salle / machine (optionnel)</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={resourceId}
                onChange={(e) => {
                  const id = e.target.value;
                  setResourceId(id);
                  const selected = resources.find((r) => r.id === id);
                  setSalle(selected?.libelle ?? "");
                }}
              >
                <option value="">Non précisée</option>
                {resources.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.libelle}
                    {r.modalite ? ` · ${r.modalite}` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {conflict ? (
            <p className="text-sm text-warning">
              Créneau potentiellement occupé : {conflict.label}.
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Les créneaux affichés correspondent aux examens réellement planifiés. Aucune grille fictive n'est générée.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(2)}>
              Retour
            </Button>
            <Button onClick={() => setStep(4)}>Continuer</Button>
          </div>
        </Surface>
      ) : null}

      {((mode === "rdv" && step === 4) || (mode === "walkin" && step === 3 && acte)) && mode === "rdv" && step === 4 ? (
        <Surface className="p-5 space-y-4">
          <ReferentCombobox value={prescripteur} onChange={setPrescripteur} />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(3)}>
              Retour
            </Button>
            <Button onClick={() => setStep(5)}>Continuer</Button>
          </div>
        </Surface>
      ) : null}

      {mode === "walkin" && step === 3 && acte ? (
        <Surface className="p-5 space-y-4">
          <ReferentCombobox value={prescripteur} onChange={setPrescripteur} />
          <PaymentBlock total={total} acompte={acompte} setAcompte={setAcompte} reste={reste} />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(2)}>
              Retour
            </Button>
            <Button onClick={() => setStep(4)}>Voir le récapitulatif</Button>
          </div>
        </Surface>
      ) : null}

      {mode === "rdv" && step === 5 ? (
        <Surface className="p-5 space-y-4">
          <PaymentBlock total={total} acompte={acompte} setAcompte={setAcompte} reste={reste} />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(4)}>
              Retour
            </Button>
            <Button onClick={() => setStep(6)}>Voir le récapitulatif</Button>
          </div>
        </Surface>
      ) : null}

      {((mode === "rdv" && step === 6) || (mode === "walkin" && step === 4)) && patient && acte ? (
        <Surface className="p-5 space-y-4">
          <dl className="grid gap-3 sm:grid-cols-2">
            <Recap label="Patient" value={patient.nomComplet} />
            <Recap label="Examen" value={acte.nom} />
            <Recap label="Date" value={mode === "walkin" ? "Passage immédiat" : dateHeure.replace("T", " ")} />
            <Recap label="Médecin" value={prescripteur.nom || "—"} />
            <Recap label="Prix" value={formatMAD(total)} />
            <Recap label="Avance" value={formatMAD(avance)} />
            <Recap label="Reste à payer" value={formatMAD(reste)} />
            <Recap label="Statut" value={avance <= 0 ? "Non payé" : avance >= total && total > 0 ? "Payé" : "Partiellement payé"} />
          </dl>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(mode === "rdv" ? 5 : 3)}>
              Retour
            </Button>
            <Button onClick={confirm} disabled={saving}>
              {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Confirmer
            </Button>
          </div>
        </Surface>
      ) : null}
    </div>
  );
}

function Recap({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm font-semibold">{value}</dd>
    </div>
  );
}

function PaymentBlock({
  total,
  acompte,
  setAcompte,
  reste,
}: {
  total: number;
  acompte: string;
  setAcompte: (v: string) => void;
  reste: number;
}) {
  const presets = [0, 300, 500, total].filter((v, i, arr) => v >= 0 && arr.indexOf(v) === i);
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Recap label="Montant total" value={formatMAD(total)} />
        <Recap label="Avance" value={formatMAD(Number(acompte) || 0)} />
        <Recap label="Reste" value={formatMAD(reste)} />
      </div>
      <div className="flex flex-wrap gap-2">
        {presets.map((v) => (
          <Button key={v} type="button" variant="outline" size="sm" onClick={() => setAcompte(String(v))}>
            {formatMAD(v)}
          </Button>
        ))}
      </div>
      <div>
        <Label>Montant personnalisé</Label>
        <Input type="number" min={0} max={total} step="0.01" value={acompte} onChange={(e) => setAcompte(e.target.value)} />
      </div>
    </div>
  );
}
