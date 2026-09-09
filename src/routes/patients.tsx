import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  LayoutGrid,
  List,
  MoreHorizontal,
  ReceiptText,
  ScanLine,
  Search,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
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
import { PatientCreateDialog } from "@/components/patients/patient-create-dialog";
import { KpiCard, PageHeader, Pill } from "@/components/ui-kit";
import { useDisplayPreference } from "@/hooks/use-display-preference";
import { useRole } from "@/hooks/use-role";
import { fetchInvoices } from "@/lib/api/billing";
import { describeApiError, type FriendlyError } from "@/lib/api/errors";
import {
  searchPatients,
  type PatientRow,
} from "@/lib/api/patients";
import { fetchWorklist } from "@/lib/api/worklist";
import { toLocalDateKey } from "@/lib/date";
import { downloadExcelWorkbook, excelFilename } from "@/lib/excel-export";
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
            <Button
              variant="outline"
              size="sm"
              disabled={filtered.length === 0}
              onClick={() => {
                void (async () => {
                  try {
                    await downloadExcelWorkbook({
                      filename: excelFilename("Patients"),
                      sheets: [
                        {
                          name: "Patients",
                          columns: [
                            { header: "N° dossier", key: "num", width: 14 },
                            { header: "Nom", key: "nom", width: 18 },
                            { header: "Prénom", key: "prenom", width: 16 },
                            { header: "Téléphone", key: "tel", width: 14 },
                            { header: "CIN", key: "cin", width: 12 },
                            { header: "Assurance", key: "mutuelle", width: 14 },
                            { header: "Ville", key: "ville", width: 14 },
                            { header: "Statut", key: "statut", width: 12 },
                          ],
                          rows: filtered.map((p) => {
                            const parts = (p.nomComplet || "").trim().split(/\s+/);
                            const prenom = parts.length > 1 ? parts.slice(0, -1).join(" ") : "";
                            const nom = parts.length > 0 ? parts[parts.length - 1] : p.nomComplet;
                            return {
                              num: p.numeroDossier ?? p.id,
                              nom,
                              prenom,
                              tel: p.telephone ?? "",
                              cin: p.cin ?? "",
                              mutuelle: p.mutuelle ?? "",
                              ville: p.ville ?? "",
                              statut: p.vip ? "VIP" : "Actif",
                            };
                          }),
                        },
                      ],
                    });
                    toast.success(`Export Excel — ${filtered.length} patient(s)`);
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Export impossible");
                  }
                })();
              }}
            >
              <FileSpreadsheet className="mr-1.5 size-4" /> Exporter Excel
            </Button>
            {canCreate("patients") ? (
              <Button onClick={() => setOpen(true)}>
                <UserPlus className="mr-2 size-4" /> Nouveau patient
              </Button>
            ) : null}
          </div>
        }
      />

      <PatientCreateDialog
        open={open}
        onOpenChange={setOpen}
        onCreated={() => {
          setPage(0);
          setReloadKey((k) => k + 1);
        }}
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
