import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Loader2,
  MoreHorizontal,
  ReceiptText,
  ScanLine,
  Search,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataState, LastUpdated } from "@/components/data-state";
import { KpiCard, PageHeader, Pill } from "@/components/ui-kit";
import { useDisplayPreference } from "@/hooks/use-display-preference";
import { useRole } from "@/hooks/use-role";
import { fetchInvoices } from "@/lib/api/billing";
import { describeApiError, toastMessage, type FriendlyError } from "@/lib/api/errors";
import {
  checkPatientDuplicates,
  createPatient,
  searchPatients,
  type PatientDuplicateMatch,
  type PatientRow,
  type PatientWritePayload,
} from "@/lib/api/patients";
import { fetchWorklist } from "@/lib/api/worklist";
import { toLocalDateKey } from "@/lib/date";
import { formatMAD } from "@/types/domain";

export const Route = createFileRoute("/patients")({
  validateSearch: (search: Record<string, unknown>) => ({
    nouveau: search["nouveau"] === "1" || search["nouveau"] === true,
  }),
  head: () => ({
    meta: [
      { title: "Gestion des patients — RadioCRM" },
      {
        name: "description",
        content:
          "Recherchez et filtrez les dossiers patients par mutuelle (AMO, CNSS, CNOPS, Privée) et créez de nouveaux dossiers.",
      },
      { property: "og:title", content: "Gestion des patients — RadioCRM" },
      {
        property: "og:description",
        content:
          "Base patients du centre de radiologie avec CIN, mutuelle et historique d'examens.",
      },
    ],
  }),
  component: PatientsPage,
});

const mutuelleTones: Record<string, "primary" | "neutral"> = {
  AMO: "primary",
  CNSS: "neutral",
  CNOPS: "neutral",
  Privée: "neutral",
};

const MUTUELLES = ["AMO", "CNSS", "CNOPS", "Privée"];
const SEXES = [
  { value: "tous", label: "Tous les sexes" },
  { value: "M", label: "Masculin" },
  { value: "F", label: "Féminin" },
];
const PAGE_SIZE = 20;

type Draft = {
  nom: string;
  prenom: string;
  cin: string;
  dateNaissance: string;
  sexe: string;
  telephone: string;
  email: string;
  adresse: string;
  ville: string;
  mutuelle: string;
  numAffiliation: string;
  force: boolean;
};

const emptyDraft = (): Draft => ({
  nom: "",
  prenom: "",
  cin: "",
  dateNaissance: "",
  sexe: "",
  telephone: "",
  email: "",
  adresse: "",
  ville: "",
  mutuelle: "AMO",
  numAffiliation: "",
  force: false,
});

function formatDateLabel(value?: string | null): string {
  if (!value?.trim()) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("fr-MA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function PatientsPage() {
  const { nouveau } = Route.useSearch();
  const navigate = useNavigate();
  const { canCreate, canAccess } = useRole();
  const canBilling = canAccess("billing");
  const { setMode, isCardsView } = useDisplayPreference("patients", "table");

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [mutuelle, setMutuelle] = useState("toutes");
  const [sexe, setSexe] = useState("tous");
  const [ville, setVille] = useState("");
  const [page, setPage] = useState(0);

  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [listStatus, setListStatus] = useState<"loading" | "ready" | "error" | "empty">("loading");
  const [listError, setListError] = useState<FriendlyError | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [examensDuJour, setExamensDuJour] = useState<number | null>(null);
  const [soldeByPatient, setSoldeByPatient] = useState<Map<string, number>>(new Map());
  const [patientsAvecReste, setPatientsAvecReste] = useState<number | null>(null);

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [duplicates, setDuplicates] = useState<PatientDuplicateMatch[]>([]);
  const [checkingDup, setCheckingDup] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (nouveau && canCreate("patients")) setOpen(true);
  }, [nouveau, canCreate]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    setPage(0);
  }, [debouncedQuery, mutuelle]);

  useEffect(() => {
    const controller = new AbortController();
    setListStatus("loading");
    setListError(null);

    const params: {
      search?: string;
      mutuelle?: string;
      page?: number;
      size?: number;
    } = { page, size: PAGE_SIZE };
    if (debouncedQuery) params.search = debouncedQuery;
    if (mutuelle !== "toutes") params.mutuelle = mutuelle;

    searchPatients(params, controller.signal)
      .then((res) => {
        if (controller.signal.aborted) return;
        setPatients(res.content);
        setTotalElements(res.totalElements);
        setTotalPages(Math.max(1, res.totalPages));
        setLastUpdated(new Date());
        setListStatus(res.content.length === 0 ? "empty" : "ready");
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setListError(describeApiError(err));
        setListStatus("error");
      });

    return () => controller.abort();
  }, [debouncedQuery, mutuelle, page, reloadKey]);

  useEffect(() => {
    const controller = new AbortController();
    const today = toLocalDateKey();

    fetchWorklist({ date: today, size: 500 }, controller.signal)
      .then((rows) => {
        if (!controller.signal.aborted) setExamensDuJour(rows.length);
      })
      .catch(() => {
        if (!controller.signal.aborted) setExamensDuJour(null);
      });

    if (canBilling) {
      fetchInvoices(controller.signal)
        .then((invoices) => {
          if (controller.signal.aborted) return;
          const map = new Map<string, number>();
          for (const inv of invoices) {
            if (inv.resteACharge <= 0) continue;
            const id = String(inv.patientId);
            map.set(id, (map.get(id) ?? 0) + inv.resteACharge);
          }
          setSoldeByPatient(map);
          setPatientsAvecReste(map.size);
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          setSoldeByPatient(new Map());
          setPatientsAvecReste(null);
        });
    } else {
      setSoldeByPatient(new Map());
      setPatientsAvecReste(null);
    }

    return () => controller.abort();
  }, [canBilling, reloadKey]);

  const villes = useMemo(() => {
    const set = new Set<string>();
    for (const p of patients) {
      if (p.ville?.trim()) set.add(p.ville.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "fr"));
  }, [patients]);

  const filtered = useMemo(() => {
    const v = ville.trim().toLowerCase();
    return patients.filter((p) => {
      const matchSexe =
        sexe === "tous" ||
        (p.sexe ?? "").toUpperCase().startsWith(sexe.toUpperCase());
      const matchVille = !v || (p.ville ?? "").toLowerCase().includes(v);
      return matchSexe && matchVille;
    });
  }, [patients, sexe, ville]);

  const viewStatus =
    listStatus === "ready" && filtered.length === 0 ? "empty" : listStatus;

  const canSubmit =
    draft.nom.trim() !== "" &&
    draft.cin.trim() !== "" &&
    (duplicates.length === 0 || draft.force);

  const runDuplicateCheck = useCallback(async (signal?: AbortSignal) => {
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

      const matches = await checkPatientDuplicates(dupParams, signal);
      setDuplicates(matches);
      if (matches.length > 0) {
        setDraft((d) => ({ ...d, force: false }));
      }
      return matches;
    } catch (e) {
      toast.error(toastMessage(e));
      return [];
    } finally {
      setCheckingDup(false);
    }
  }, [draft.cin, draft.nom, draft.prenom, draft.telephone, draft.dateNaissance]);

  const submitDraft = useCallback(async () => {
    if (!canSubmit) return;
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
        nomComplet: [draft.nom, draft.prenom].filter(Boolean).join(" ").trim(),
        cin: draft.cin.trim().toUpperCase(),
        mutuelle: draft.mutuelle,
      };
      if (draft.prenom.trim()) payload.prenom = draft.prenom.trim();
      if (draft.dateNaissance) payload.dateNaissance = draft.dateNaissance;
      if (draft.sexe) payload.sexe = draft.sexe;
      if (draft.telephone.trim()) payload.telephone = draft.telephone.trim();
      if (draft.email.trim()) payload.email = draft.email.trim();
      if (draft.adresse.trim()) payload.adresse = draft.adresse.trim();
      if (draft.ville.trim()) payload.ville = draft.ville.trim();
      if (draft.numAffiliation.trim()) payload.numAffiliation = draft.numAffiliation.trim();
      if (matches.length > 0) payload.force = true;

      const created = await createPatient(payload);
      setDraft(emptyDraft());
      setDuplicates([]);
      setOpen(false);
      setPage(0);
      setReloadKey((k) => k + 1);
      toast.success(`Dossier créé pour ${created.nomComplet}`);
      void navigate({ to: "/patient/$patientId", params: { patientId: created.id } });
    } catch (e) {
      toast.error(toastMessage(e));
    } finally {
      setIsSaving(false);
    }
  }, [canSubmit, duplicates, draft, navigate, runDuplicateCheck]);

  const soldeLabel = (patientId: string): string => {
    if (!canBilling || patientsAvecReste === null) return "—";
    const solde = soldeByPatient.get(patientId) ?? 0;
    return solde > 0 ? formatMAD(solde) : formatMAD(0);
  };

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Patients"
        title="Patients"
        subtitle={
          listStatus === "loading"
            ? "Chargement des dossiers…"
            : `${totalElements.toLocaleString("fr-MA")} dossier(s)`
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant={!isCardsView ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("table")}
              aria-pressed={!isCardsView}
            >
              <List className="mr-1.5 size-4" /> Tableau
            </Button>
            <Button
              variant={isCardsView ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("cards")}
              aria-pressed={isCardsView}
            >
              <LayoutGrid className="mr-1.5 size-4" /> Cartes
            </Button>
            {canCreate("patients") ? (
              <Dialog
                open={open}
                onOpenChange={(v) => {
                  setOpen(v);
                  if (!v) {
                    setDraft(emptyDraft());
                    setDuplicates([]);
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="mr-2 size-4" /> Nouveau patient
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Nouveau dossier patient</DialogTitle>
                    <DialogDescription>
                      Identité, contact et couverture. Un contrôle anti-doublon s&apos;exécute sur
                      le CIN.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="pat-nom">Nom *</Label>
                      <Input
                        id="pat-nom"
                        value={draft.nom}
                        onChange={(e) => setDraft((d) => ({ ...d, nom: e.target.value }))}
                        autoComplete="family-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pat-prenom">Prénom</Label>
                      <Input
                        id="pat-prenom"
                        value={draft.prenom}
                        onChange={(e) => setDraft((d) => ({ ...d, prenom: e.target.value }))}
                        autoComplete="given-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pat-cin">CIN *</Label>
                      <Input
                        id="pat-cin"
                        value={draft.cin}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, cin: e.target.value, force: false }))
                        }
                        onBlur={() => void runDuplicateCheck()}
                        autoComplete="off"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pat-naissance">Date de naissance</Label>
                      <Input
                        id="pat-naissance"
                        type="date"
                        value={draft.dateNaissance}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, dateNaissance: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Sexe</Label>
                      <Select
                        value={draft.sexe || "unset"}
                        onValueChange={(v) =>
                          setDraft((d) => ({ ...d, sexe: v === "unset" ? "" : v }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Non précisé" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unset">Non précisé</SelectItem>
                          <SelectItem value="M">Masculin</SelectItem>
                          <SelectItem value="F">Féminin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pat-tel">Téléphone</Label>
                      <Input
                        id="pat-tel"
                        value={draft.telephone}
                        onChange={(e) => setDraft((d) => ({ ...d, telephone: e.target.value }))}
                        inputMode="tel"
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="pat-email">Email</Label>
                      <Input
                        id="pat-email"
                        type="email"
                        value={draft.email}
                        onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="pat-adresse">Adresse</Label>
                      <Input
                        id="pat-adresse"
                        value={draft.adresse}
                        onChange={(e) => setDraft((d) => ({ ...d, adresse: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pat-ville">Ville</Label>
                      <Input
                        id="pat-ville"
                        value={draft.ville}
                        onChange={(e) => setDraft((d) => ({ ...d, ville: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Mutuelle</Label>
                      <Select
                        value={draft.mutuelle}
                        onValueChange={(v) => setDraft((d) => ({ ...d, mutuelle: v }))}
                      >
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
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="pat-affil">N° affiliation</Label>
                      <Input
                        id="pat-affil"
                        value={draft.numAffiliation}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, numAffiliation: e.target.value }))
                        }
                      />
                    </div>
                  </div>

                  {checkingDup ? (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" /> Vérification des doublons…
                    </p>
                  ) : null}

                  {duplicates.length > 0 ? (
                    <Alert variant="destructive">
                      <AlertTriangle className="size-4" />
                      <AlertTitle>Doublons potentiels détectés</AlertTitle>
                      <AlertDescription>
                        <ul className="mt-2 space-y-1">
                          {duplicates.map((d) => (
                            <li key={d.patientId}>
                              <Link
                                to="/patient/$patientId"
                                params={{ patientId: d.patientId }}
                                className="underline underline-offset-2"
                              >
                                {d.nomComplet || d.patientId}
                              </Link>
                              {d.numeroDossier ? ` · ${d.numeroDossier}` : ""}
                              {d.champsIdentiques.length
                                ? ` · ${d.champsIdentiques.join(", ")}`
                                : ""}
                              {d.score ? ` · score ${d.score}` : ""}
                            </li>
                          ))}
                        </ul>
                        <label className="mt-3 flex items-start gap-2 text-sm text-foreground">
                          <Checkbox
                            checked={draft.force}
                            onCheckedChange={(c) =>
                              setDraft((d) => ({ ...d, force: c === true }))
                            }
                          />
                          <span>
                            Je confirme la création malgré le(s) doublon(s) (force).
                          </span>
                        </label>
                      </AlertDescription>
                    </Alert>
                  ) : null}

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                      Annuler
                    </Button>
                    <Button disabled={!canSubmit || isSaving} onClick={() => void submitDraft()}>
                      {isSaving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                      Enregistrer le dossier
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Patients actifs"
          value={listStatus === "error" ? "—" : totalElements}
          hint="Total dossiers"
          icon={Users}
        />
        <KpiCard
          label="Nouveaux"
          value="—"
          hint="Date de création non fournie par l'API"
          icon={UserPlus}
        />
        <KpiCard
          label="Examens du jour"
          value={examensDuJour === null ? "—" : examensDuJour}
          hint={toLocalDateKey()}
          icon={ScanLine}
        />
        <KpiCard
          label="Reste à payer"
          value={patientsAvecReste === null ? "—" : patientsAvecReste}
          hint={canBilling ? "Patients avec solde > 0" : "Accès facturation requis"}
          icon={Wallet}
          tone="warning"
        />
      </div>

      <div className="app-surface overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border px-4 py-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Rechercher un patient"
              placeholder="Rechercher par nom, CIN ou téléphone…"
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={mutuelle} onValueChange={setMutuelle}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Mutuelle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="toutes">Toutes mutuelles</SelectItem>
                {MUTUELLES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sexe} onValueChange={setSexe}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEXES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={ville || "toutes"}
              onValueChange={(v) => setVille(v === "toutes" ? "" : v)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Ville" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="toutes">Toutes les villes</SelectItem>
                {villes.map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div data-tour="patients-table" aria-busy={listStatus === "loading"}>
          <DataState
            status={viewStatus}
            error={listError}
            onRetry={() => setReloadKey((k) => k + 1)}
            skeletonRows={6}
            emptyTitle="Aucun dossier patient"
            emptyDescription={
              totalElements === 0 && !debouncedQuery && mutuelle === "toutes"
                ? "Aucun dossier n'a encore été enregistré côté serveur."
                : "Aucun dossier ne correspond à cette recherche ou à ces filtres."
            }
          >
            {isCardsView ? (
              <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((p) => (
                  <div key={p.id} className="app-surface flex flex-col gap-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        to="/patient/$patientId"
                        params={{ patientId: p.id }}
                        className="min-w-0"
                      >
                        <p className="font-semibold hover:underline">{p.nomComplet}</p>
                        <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                          {p.numeroDossier ?? p.id}
                        </p>
                      </Link>
                      <Pill tone={mutuelleTones[p.mutuelle] ?? "neutral"}>
                        {p.mutuelle || "—"}
                      </Pill>
                    </div>
                    <dl className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <dt className="text-xs text-muted-foreground">Téléphone</dt>
                        <dd>{p.telephone || "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Prochain RDV</dt>
                        <dd>{formatDateLabel(p.prochainRdv)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Dernier examen</dt>
                        <dd>—</dd>
                      </div>
                      {canBilling ? (
                        <div>
                          <dt className="text-xs text-muted-foreground">Solde</dt>
                          <dd className="tabular-nums">{soldeLabel(p.id)}</dd>
                        </div>
                      ) : null}
                    </dl>
                    <PatientActions patient={p} canBilling={canBilling} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">Patient</TableHead>
                      <TableHead>N° dossier</TableHead>
                      <TableHead className="hidden md:table-cell">Téléphone</TableHead>
                      <TableHead className="hidden lg:table-cell">Dernier examen</TableHead>
                      <TableHead>Prochain RDV</TableHead>
                      <TableHead>Mutuelle</TableHead>
                      {canBilling ? <TableHead className="text-right">Solde</TableHead> : null}
                      <TableHead className="pr-6 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="pl-6">
                          <Link
                            to="/patient/$patientId"
                            params={{ patientId: p.id }}
                            className="block"
                          >
                            <p className="font-medium text-foreground hover:underline">
                              {p.nomComplet}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {[p.sexe, p.age ? `${p.age} ans` : null, p.ville]
                                .filter(Boolean)
                                .join(" · ") || "—"}
                            </p>
                          </Link>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {p.numeroDossier ?? p.id}
                        </TableCell>
                        <TableCell className="hidden text-sm md:table-cell">
                          {p.telephone || "—"}
                        </TableCell>
                        <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                          —
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDateLabel(p.prochainRdv)}
                        </TableCell>
                        <TableCell>
                          <Pill tone={mutuelleTones[p.mutuelle] ?? "neutral"}>
                            {p.mutuelle || "—"}
                          </Pill>
                        </TableCell>
                        {canBilling ? (
                          <TableCell className="text-right text-sm tabular-nums">
                            {soldeLabel(p.id)}
                          </TableCell>
                        ) : null}
                        <TableCell className="pr-6 text-right">
                          <PatientActions patient={p} canBilling={canBilling} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-6 py-4 sm:flex-row">
              <div className="space-y-1 text-center sm:text-left">
                <p className="text-sm text-muted-foreground">
                  {filtered.length} sur cette page · {totalElements} au total · page {page + 1} /{" "}
                  {totalPages}
                </p>
                <LastUpdated at={lastUpdated} />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  <ChevronLeft className="mr-1 size-4" aria-hidden /> Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page + 1 >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Suivant <ChevronRight className="ml-1 size-4" aria-hidden />
                </Button>
              </div>
            </div>
          </DataState>
        </div>
      </div>
    </div>
  );
}

function PatientActions({
  patient,
  canBilling,
}: {
  patient: PatientRow;
  canBilling: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={`Actions pour ${patient.nomComplet}`}>
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem asChild>
          <Link to="/patient/$patientId" params={{ patientId: patient.id }}>
            Ouvrir dossier
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/accueil" search={{ mode: "rdv", patientId: patient.id }}>
            <CalendarPlus className="mr-2 size-4" /> Nouveau RDV
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/worklist">
            <ScanLine className="mr-2 size-4" /> Nouvel examen
          </Link>
        </DropdownMenuItem>
        {canBilling ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link
                to="/patient/$patientId"
                params={{ patientId: patient.id }}
                search={{ tab: "facturation" } as never}
              >
                <ReceiptText className="mr-2 size-4" /> Voir factures
              </Link>
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
