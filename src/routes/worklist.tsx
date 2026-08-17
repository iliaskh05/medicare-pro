import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ClipboardList,
  Eye,
  FileDown,
  FileText,
  ListFilter,
  MoreHorizontal,
  Receipt,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { NouvelExamenDialog } from "@/components/worklist/nouvel-examen-dialog";
import { ExamenSheet } from "@/components/worklist/examen-sheet";
import { DicomViewerModal } from "@/components/worklist/dicom-viewer-modal";
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
  return new Date().toISOString().slice(0, 10);
}

function WorklistPage() {
  const [date, setDate] = useState(today);
  const [items, setItems] = useState<WorklistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [query, setQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("tous");
  const [modalite, setModalite] = useState("toutes");
  const [statutCr, setStatutCr] = useState("tous");
  const [paiement, setPaiement] = useState("tous");
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  const [selected, setSelected] = useState<WorklistItem | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [viewerExamenId, setViewerExamenId] = useState<string | null>(null);
  const [viewerPatient, setViewerPatient] = useState<string>("");
  const [viewerOpen, setViewerOpen] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(query.trim()), 300);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);
    fetchWorklist(
      {
        date,
        search: debouncedSearch || undefined,
        status: statusFilter === "tous" ? undefined : statusFilter,
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
  }, [date, debouncedSearch, statusFilter, reloadKey]);

  const rows = useMemo(() => {
    return items.filter(
      (i) =>
        (modalite === "toutes" || i.modalite === modalite) &&
        (statutCr === "tous" || i.statutCr === statutCr) &&
        (paiement === "tous" || i.paiement === paiement),
    );
  }, [items, modalite, statutCr, paiement]);

  const openSheet = useCallback((item: WorklistItem) => {
    setSelected(item);
    setSheetOpen(true);
  }, []);

  const openImagerie = useCallback((item: WorklistItem) => {
    setViewerExamenId(item.id);
    setViewerPatient(item.patient);
    setViewerOpen(true);
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
    async (item: WorklistItem, patch: Partial<WorklistItem>) => {
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
    if (item.etatPatient !== "arrive") {
      toast.error("La facture PDF n'est disponible que pour un examen terminé.");
      return;
    }
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
    <div className="space-y-5">
      <PageHeader
        title="Worklist du jour"
        subtitle={
          isLoading
            ? "Chargement de la file d'attente…"
            : `${rows.length} examen(s) affiché(s) — Centre d'Imagerie Médicale`
        }
        actions={
          <NouvelExamenDialog
            onCreated={() => {
              setReloadKey((k) => k + 1);
            }}
          />
        }
      />

      <Card data-tour="worklist-filtres">
        <CardContent className="grid gap-3 p-4 lg:grid-cols-12">
          <div className="space-y-1.5 lg:col-span-3">
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
          <div className="space-y-1.5 lg:col-span-2">
            <Label className="text-xs text-muted-foreground">État patient</Label>
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
          <div className="space-y-1.5 lg:col-span-2">
            <Label className="text-xs text-muted-foreground">Compte rendu</Label>
            <Select value={statutCr} onValueChange={setStatutCr}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Tous les statuts</SelectItem>
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
        </CardContent>
      </Card>

      {error ? (
        <ServiceNotice
          message={error || "File d'attente en attente de connexion au serveur du centre."}
          onRetry={() => setReloadKey((k) => k + 1)}
        />
      ) : null}

      <Card data-tour="worklist-table">
        <CardContent className="px-0 py-0" aria-busy={isLoading}>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">État</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>N° séjour</TableHead>
                  <TableHead className="hidden lg:table-cell">Médecin</TableHead>
                  <TableHead>Date examen</TableHead>
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
                        <TableCell colSpan={10} className="px-6">
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
                        <TableCell className="font-mono text-xs">{i.numSejour}</TableCell>
                        <TableCell className="hidden lg:table-cell">{i.medecin}</TableCell>
                        <TableCell className="whitespace-nowrap">{i.dateExamen}</TableCell>
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
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Voir l'imagerie — ${i.patient}`}
                              title="Voir l'imagerie"
                              onClick={() => openImagerie(i)}
                            >
                              <Eye className="size-4" />
                            </Button>
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
                                <DropdownMenuItem onClick={() => openImagerie(i)}>
                                  <Eye className="mr-2 size-4" /> Voir l&apos;imagerie
                                </DropdownMenuItem>
                                {i.etatPatient === "arrive" ? (
                                  <DropdownMenuItem onClick={() => void downloadFacture(i)}>
                                    <FileDown className="mr-2 size-4" /> Facture PDF
                                  </DropdownMenuItem>
                                ) : null}
                                <DropdownMenuItem onClick={() => window.print()}>
                                  <Receipt className="mr-2 size-4" /> Reçu / Facture
                                </DropdownMenuItem>
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
                    <TableCell colSpan={10} className="p-0">
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
        </CardContent>
      </Card>

      <ExamenSheet item={selected} open={sheetOpen} onOpenChange={setSheetOpen} />
      <DicomViewerModal
        examenId={viewerExamenId}
        patientLabel={viewerPatient}
        open={viewerOpen}
        onOpenChange={(open) => {
          setViewerOpen(open);
          if (!open) setViewerExamenId(null);
        }}
      />
    </div>
  );
}
