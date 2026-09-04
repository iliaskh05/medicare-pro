import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ClipboardList,
  FileDown,
  FileText,
  ListFilter,
  MoreHorizontal,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { EmptyState, PageHeader, ServiceNotice } from "@/components/ui-kit";
import {
  CompteRenduBadge,
  EtatPatientStatusMenu,
  PaiementBadge,
} from "@/components/worklist/status-badges";
import { ExamenSheet } from "@/components/worklist/examen-sheet";
import { PatientLabelPrintMenu } from "@/components/patients/patient-label-print-menu";
import { SejourBadge } from "@/components/sejour-badge";
import { downloadFactureExamen } from "@/lib/api/factures";
import { ApiError } from "@/lib/api/config";
import {
  MODALITES,
  fetchWorklist,
  updateExamenStatus,
  updateWorklistStatut,
  type EtatPatient,
  type StatutCompteRendu,
  type StatutPaiement,
  type WorklistItem,
} from "@/lib/api/worklist";
import { fetchResources, type ResourceDto } from "@/lib/api/appointments";
import { fetchRadiologues, type StaffRadiologue } from "@/lib/api/staff";
import { useDisplayPreference } from "@/hooks/use-display-preference";
import { fetchMyPreference } from "@/lib/api/preferences";
import { toLocalDateKey } from "@/lib/date";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/worklist")({
  head: () => ({
    meta: [
      { title: "Worklist du jour — File d'attente | RadioCRM" },
      {
        name: "description",
        content:
          "File d'attente du centre d'imagerie : état patient, comptes rendus, salles et statut de paiement filtrables par date et modalité.",
      },
      { property: "og:title", content: "Worklist du jour — File d'attente | RadioCRM" },
      {
        property: "og:description",
        content:
          "Tableau de bord opérationnel du RIS : suivi temps réel des examens, comptes rendus et encaissements.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WorklistPage,
});

function today(): string {
  return toLocalDateKey();
}

function WorklistPage() {
  const { mode, setMode, isTableView } = useDisplayPreference("worklist", "table");
  const [date, setDate] = useState(today);
  const [items, setItems] = useState<WorklistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [query, setQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("tous");
  const [modalite, setModalite] = useState("toutes");
  const [salle, setSalle] = useState("toutes");
  const [radiologueId, setRadiologueId] = useState("tous");
  const [statutCr, setStatutCr] = useState("tous");
  const [paiement, setPaiement] = useState("tous");
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [resources, setResources] = useState<ResourceDto[]>([]);
  const [radiologues, setRadiologues] = useState<StaffRadiologue[]>([]);

  const [selected, setSelected] = useState<WorklistItem | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [refreshSec, setRefreshSec] = useState(30);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(query.trim()), 300);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();
    void fetchMyPreference("ui", controller.signal)
      .then((ui) => {
        const sec = Number(ui?.["refreshIntervalSec"]);
        if (Number.isFinite(sec) && sec >= 10 && sec <= 300) setRefreshSec(sec);
      })
      .catch(() => {
        /* keep default */
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setReloadKey((k) => k + 1), refreshSec * 1000);
    return () => window.clearInterval(id);
  }, [refreshSec]);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetchResources(controller.signal),
      fetchRadiologues(controller.signal),
    ])
      .then(([resourceRows, radiologueRows]) => {
        setResources(resourceRows.filter((r) => r.actif !== false));
        setRadiologues(radiologueRows);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setResources([]);
        setRadiologues([]);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);
    fetchWorklist(
      {
        date,
        search: debouncedSearch || undefined,
        status: statusFilter === "tous" ? undefined : statusFilter,
        modalite: modalite === "toutes" ? undefined : modalite,
        radiologueId: radiologueId === "tous" ? undefined : radiologueId,
      },
      controller.signal,
    )
      .then((rows) => setItems(rows))
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        if (e instanceof ApiError && e.code === "aborted") return;
        setItems([]);
        setError(e instanceof Error ? e.message : "Service worklist indisponible");
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [date, debouncedSearch, statusFilter, modalite, radiologueId, reloadKey]);

  const salleOptions = useMemo(() => {
    return resources
      .map((r) => r.libelle)
      .filter((label) => label.trim())
      .sort((a, b) => a.localeCompare(b, "fr"));
  }, [resources]);

  const rows = useMemo(() => {
    return items.filter(
      (i) =>
        (statutCr === "tous" || i.statutCr === statutCr) &&
        (paiement === "tous" || i.paiement === paiement) &&
        (salle === "toutes" || i.salle === salle),
    );
  }, [items, statutCr, paiement, salle]);

  const openSheet = useCallback((item: WorklistItem) => {
    setSelected(item);
    setSheetOpen(true);
  }, []);

  const changeEtatPatient = useCallback(async (item: WorklistItem, nouveauStatut: EtatPatient) => {
    if (item.etatPatient === nouveauStatut) return;
    setStatusUpdatingId(item.id);
    try {
      await updateExamenStatus(item.id, nouveauStatut);
      toast.success(`État mis à jour — ${item.patient}`);
      setReloadKey((k) => k + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Mise à jour impossible.");
    } finally {
      setStatusUpdatingId(null);
    }
  }, []);

  const changeStatut = useCallback(
    async (item: WorklistItem, patch: Partial<Pick<WorklistItem, "etatPatient" | "statutCr" | "paiement">>) => {
      if (patch.etatPatient) {
        await changeEtatPatient(item, patch.etatPatient);
        return;
      }
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, ...patch } : i)));
      try {
        await updateWorklistStatut(item.id, patch);
        toast.success(`Statut mis à jour — ${item.patient}`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Mise à jour impossible.");
        setReloadKey((k) => k + 1);
      }
    },
    [changeEtatPatient],
  );

  const downloadFacture = useCallback(async (item: WorklistItem) => {
    try {
      await downloadFactureExamen(item.id, item.patient);
      toast.success(`Facture PDF téléchargée — ${item.patient}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Téléchargement de la facture impossible.");
    }
  }, []);

  const crOptions: { value: StatutCompteRendu; label: string }[] = [
    { value: "a_faire", label: "À dicter" },
    { value: "en_redaction", label: "En rédaction" },
    { value: "signe", label: "Signé" },
    { value: "imprime", label: "Imprimé" },
  ];
  const paiementOptions: { value: StatutPaiement; label: string }[] = [
    { value: "impaye", label: "Impayé" },
    { value: "cote", label: "Coté" },
    { value: "paye", label: "Payé" },
  ];

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Activité médicale"
        title="Examens"
        subtitle={
          isLoading
            ? "Chargement de la file d'attente…"
            : `${rows.length} examen(s) — worklist du ${date}`
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant={isTableView ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("table")}
            >
              Tableau
            </Button>
            <Button
              variant={mode === "compact" || mode === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("compact")}
            >
              Compact
            </Button>
            <Button
              variant="outline"
              disabled={rows.length === 0}
              onClick={() => {
                const header = [
                  "Patient",
                  "Sejour",
                  "Examen",
                  "Modalite",
                  "Date",
                  "Etat",
                  "Compte rendu",
                  "Paiement",
                ];
                const body = rows.map((r) =>
                  [r.patient, r.numSejour, r.description, r.modalite, r.dateExamen, r.etatPatient, r.statutCr, r.paiement]
                    .map((v) => `"${String(v).replaceAll('"', '""')}"`)
                    .join(","),
                );
                const blob = new Blob([[header.join(","), ...body].join("\n")], {
                  type: "text/csv;charset=utf-8",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `examens-${date}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              <FileDown className="mr-1.5 size-4" /> Exporter CSV
            </Button>
            <Button asChild>
              <Link to="/accueil" search={{ mode: "rdv" }}>
                Nouvel examen
              </Link>
            </Button>
          </div>
        }
      />

      {error ? (
        <ServiceNotice
          message={error || "File d'attente en attente de connexion au serveur du centre."}
          onRetry={() => setReloadKey((k) => k + 1)}
        />
      ) : null}

      <div className="app-surface overflow-hidden" data-tour="worklist-filtres">
        <div className="grid gap-3 border-b border-border px-4 py-3 lg:grid-cols-12">
          <div className="space-y-1.5 lg:col-span-2">
            <Label htmlFor="wl-search" className="text-xs text-muted-foreground">
              Chercher patient
            </Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="wl-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nom, CIN ou n° séjour…"
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-1.5 lg:col-span-2">
            <Label htmlFor="wl-date" className="text-xs text-muted-foreground">
              Date
            </Label>
            <Input
              id="wl-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value || today())}
            />
          </div>
          <div className="space-y-1.5 lg:col-span-1">
            <Label className="text-xs text-muted-foreground">État</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Tous</SelectItem>
                <SelectItem value="attendu">En attente</SelectItem>
                <SelectItem value="arrive">Terminé</SelectItem>
                <SelectItem value="retard">En retard</SelectItem>
                <SelectItem value="attente_longue">Trop attendu</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 lg:col-span-1">
            <Label className="text-xs text-muted-foreground">Modalité</Label>
            <Select value={modalite} onValueChange={setModalite}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="toutes">Toutes</SelectItem>
                {MODALITES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 lg:col-span-1">
            <Label className="text-xs text-muted-foreground">Salle</Label>
            <Select value={salle} onValueChange={setSalle} disabled={salleOptions.length === 0}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="toutes">Toutes</SelectItem>
                {salleOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 lg:col-span-2">
            <Label className="text-xs text-muted-foreground">Radiologue</Label>
            <Select
              value={radiologueId}
              onValueChange={setRadiologueId}
              disabled={radiologues.length === 0}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Tous</SelectItem>
                {radiologues.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.nomComplet}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 lg:col-span-1">
            <Label className="text-xs text-muted-foreground">CR</Label>
            <Select value={statutCr} onValueChange={setStatutCr}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Tous</SelectItem>
                {crOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 lg:col-span-1">
            <Label className="text-xs text-muted-foreground">Paiement</Label>
            <Select value={paiement} onValueChange={setPaiement}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Tous</SelectItem>
                {paiementOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end lg:col-span-1">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setReloadKey((k) => k + 1)}
              aria-label="Actualiser la worklist"
            >
              <RefreshCw className="size-4" />
            </Button>
          </div>
        </div>

        <div
          data-tour="worklist-table"
          aria-busy={isLoading}
          className={cn(!isTableView && "text-[13px] [&_td]:py-1.5 [&_th]:py-2")}
        >
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">État</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>N° séjour</TableHead>
                  <TableHead className="hidden lg:table-cell">Médecin</TableHead>
                  <TableHead>Date examen</TableHead>
                  <TableHead className="hidden md:table-cell">Modalité</TableHead>
                  <TableHead className="hidden xl:table-cell">Salle</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Compte rendu</TableHead>
                  <TableHead>Paiement</TableHead>
                  <TableHead className="pr-6 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={`sk-${i}`}>
                        <TableCell colSpan={11} className="px-6">
                          <Skeleton className="h-7 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  : rows.map((i) => (
                      <TableRow
                        key={i.id}
                        className="cursor-pointer text-sm"
                        onClick={() => openSheet(i)}
                      >
                        <TableCell className="pl-6" onClick={(e) => e.stopPropagation()}>
                          <EtatPatientStatusMenu
                            etat={i.etatPatient}
                            disabled={statusUpdatingId === i.id}
                            onSelect={(next) => void changeEtatPatient(i, next)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{i.patient}</TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <SejourBadge value={i.numSejour} size="sm" />
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">{i.medecin}</TableCell>
                        <TableCell className="whitespace-nowrap">{i.dateExamen}</TableCell>
                        <TableCell className="hidden md:table-cell">{i.modalite}</TableCell>
                        <TableCell className="hidden xl:table-cell">{i.salle}</TableCell>
                        <TableCell className="max-w-56 truncate">{i.description}</TableCell>
                        <TableCell>
                          <CompteRenduBadge statut={i.statutCr} />
                        </TableCell>
                        <TableCell>
                          <PaiementBadge statut={i.paiement} />
                        </TableCell>
                        <TableCell
                          className="pr-6 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1">
                            {i.patientId ? (
                              <PatientLabelPrintMenu
                                size="icon"
                                variant="ghost"
                                payload={{
                                  patientId: String(i.patientId),
                                  nom: i.patient,
                                  numeroDossier: i.numSejour || String(i.patientId),
                                  ...(i.cin ? { cin: i.cin } : {}),
                                  examen: i.description || i.modalite,
                                  dateHeure: i.dateExamen,
                                }}
                              />
                            ) : null}
                            {i.etatPatient === "arrive" ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Facture PDF — ${i.patient}`}
                                title="Facture PDF"
                                onClick={() => void downloadFacture(i)}
                              >
                                <FileDown className="size-4" />
                              </Button>
                            ) : null}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={`Actions pour ${i.patient}`}
                                >
                                  <MoreHorizontal className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel>{i.patient}</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => openSheet(i)}>
                                  <ClipboardList className="mr-2 size-4" /> Détails
                                </DropdownMenuItem>
                                {i.etatPatient === "arrive" ? (
                                  <DropdownMenuItem onClick={() => void downloadFacture(i)}>
                                    <FileDown className="mr-2 size-4" /> Facture PDF
                                  </DropdownMenuItem>
                                ) : null}
                                <DropdownMenuItem onClick={() => openSheet(i)}>
                                  <FileText className="mr-2 size-4" /> Ouvrir compte rendu
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel className="text-xs text-muted-foreground">
                                  Modifier le statut
                                </DropdownMenuLabel>
                                <DropdownMenuItem
                                  onClick={() => changeStatut(i, { etatPatient: "arrive" })}
                                >
                                  <SlidersHorizontal className="mr-2 size-4" /> Marquer terminé
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => changeStatut(i, { statutCr: "signe" })}
                                >
                                  <SlidersHorizontal className="mr-2 size-4" /> Compte rendu signé
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => changeStatut(i, { paiement: "paye" })}
                                >
                                  <SlidersHorizontal className="mr-2 size-4" /> Marquer payé
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                {!isLoading && rows.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={11} className="p-0">
                      <EmptyState
                        icon={ListFilter}
                        title="Aucun examen dans la file d'attente"
                        description="Aucune donnée disponible pour cette date et ces filtres."
                      />
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <ExamenSheet
        item={selected}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onDownloadFacture={(exam) => void downloadFacture(exam)}
        onUpdated={(exam) => {
          setSelected(exam);
          setItems((prev) => prev.map((i) => (i.id === exam.id ? exam : i)));
        }}
      />
    </div>
  );
}
