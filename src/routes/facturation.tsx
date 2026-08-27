import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Banknote,
  Download,
  FileDown,
  Filter,
  MoreHorizontal,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Undo2,
  Wallet,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  EmptyState,
  KpiGrid,
  KpiStat,
  PageHeader,
  Pill,
  ServiceNotice,
} from "@/components/ui-kit";
import { useRole } from "@/hooks/use-role";
import {
  canCancelInvoice,
  canPayInvoice,
  canRefundInvoice,
  cancelInvoice,
  fetchInvoice,
  fetchInvoices,
  formatInvoiceMoney,
  INVOICE_STATUS_LABEL,
  invoiceStatusTone,
  payInvoice,
  refundInvoice,
  settleInvoice,
  submitInvoice,
  type Invoice,
  type InvoicePayload,
} from "@/lib/api/billing";
import { fetchCatalogue, type CatalogueActe } from "@/lib/api/catalogue";
import { downloadFactureExamen } from "@/lib/api/factures";
import { searchPatients, type PatientRow } from "@/lib/api/patients";
import { formatMAD } from "@/types/domain";

export const Route = createFileRoute("/facturation")({
  head: () => ({
    meta: [
      { title: "Saisie des actes & facturation — RadioCRM" },
      {
        name: "description",
        content:
          "Enregistrez un examen d'imagerie, la part mutuelle et le reste à charge patient en MAD, puis suivez l'historique des factures.",
      },
      { property: "og:title", content: "Saisie des actes & facturation — RadioCRM" },
      {
        property: "og:description",
        content: "Formulaire de saisie des actes et historique des factures du centre.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FacturationPage,
});

const PAYMENT_MODES: { value: InvoicePayload["modePaiement"]; label: string }[] = [
  { value: "espèces", label: "Espèces" },
  { value: "carte", label: "Carte bancaire" },
  { value: "chèque", label: "Chèque" },
  { value: "virement", label: "Virement" },
];

type CreateForm = {
  patientId: string;
  patientName: string;
  catalogueId: string;
  acte: string;
  montant: number;
  remise: number;
  acompte: number;
  modePaiement: InvoicePayload["modePaiement"];
  notes: string;
};

const emptyCreateForm = (): CreateForm => ({
  patientId: "",
  patientName: "",
  catalogueId: "",
  acte: "",
  montant: 0,
  remise: 0,
  acompte: 0,
  modePaiement: "carte",
  notes: "",
});

function invoiceExamenId(inv: Invoice): string | null {
  for (const item of inv.items ?? []) {
    if (item.examenId) return String(item.examenId);
  }
  return null;
}

function isUnpaid(inv: Invoice): boolean {
  if (inv.statut === "CANCELLED" || inv.statut === "REFUNDED" || inv.statut === "PAID") {
    return false;
  }
  return inv.resteACharge > 0;
}

function downloadCsv(filename: string, rows: string[][]) {
  const body = rows
    .map((cols) => cols.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["\uFEFF" + body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function FacturationPage() {
  const { canAccess, canCreate } = useRole();
  const canViewBilling = canAccess("billing");
  const canCreateBilling = canCreate("billing");

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [impayesOnly, setImpayesOnly] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [createForm, setCreateForm] = useState<CreateForm>(emptyCreateForm);
  const [creating, setCreating] = useState(false);
  const [catalogue, setCatalogue] = useState<CatalogueActe[]>([]);
  const [catalogueLoading, setCatalogueLoading] = useState(false);

  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState<PatientRow[]>([]);
  const [patientSearching, setPatientSearching] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<Invoice | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMode, setPayMode] = useState<InvoicePayload["modePaiement"]>("carte");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

  const retry = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    if (!canViewBilling) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setLoadFailed(false);

    fetchInvoices(controller.signal)
      .then((rows) => {
        setInvoices(rows);
        setLoadFailed(false);
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        setInvoices([]);
        setLoadFailed(true);
        setError(e instanceof Error ? e.message : "Impossible de charger les factures");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [reloadKey, canViewBilling]);

  const visibleInvoices = useMemo(
    () => (impayesOnly ? invoices.filter(isUnpaid) : invoices),
    [invoices, impayesOnly],
  );

  const kpis = useMemo(() => {
    if (loadFailed) {
      return { ca: null as string | null, encaissements: null, reste: null, mutuelle: null };
    }
    let ca = 0;
    let encaissements = 0;
    let reste = 0;
    let mutuelle = 0;
    for (const inv of invoices) {
      if (inv.statut !== "CANCELLED" && inv.statut !== "REFUNDED") {
        ca += inv.total;
      }
      encaissements += inv.amountPaid;
      reste += inv.resteACharge;
      mutuelle += inv.insuranceShare;
    }
    return {
      ca: formatInvoiceMoney(ca),
      encaissements: formatInvoiceMoney(encaissements),
      reste: formatInvoiceMoney(reste),
      mutuelle: formatInvoiceMoney(mutuelle),
    };
  }, [invoices, loadFailed]);

  const openCreate = useCallback(() => {
    setCreateForm(emptyCreateForm());
    setCreateStep(1);
    setPatientQuery("");
    setPatientResults([]);
    setCreateOpen(true);

    const controller = new AbortController();
    setCatalogueLoading(true);
    fetchCatalogue(true, controller.signal)
      .then((rows) => setCatalogue(rows.filter((a) => a.actif)))
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        setCatalogue([]);
        toast.error(e instanceof Error ? e.message : "Catalogue indisponible");
      })
      .finally(() => {
        if (!controller.signal.aborted) setCatalogueLoading(false);
      });
  }, []);

  // Patient search (debounced)
  useEffect(() => {
    if (!createOpen || createStep !== 1) return;
    const q = patientQuery.trim();
    if (q.length < 2) {
      setPatientResults([]);
      setPatientSearching(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setPatientSearching(true);
      searchPatients({ search: q, size: 15 }, controller.signal)
        .then((page) => setPatientResults(page.content))
        .catch((e: unknown) => {
          if (controller.signal.aborted) return;
          setPatientResults([]);
          toast.error(e instanceof Error ? e.message : "Recherche patient impossible");
        })
        .finally(() => {
          if (!controller.signal.aborted) setPatientSearching(false);
        });
    }, 280);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [patientQuery, createOpen, createStep]);

  const selectPatient = (p: PatientRow) => {
    setCreateForm((f) => ({
      ...f,
      patientId: p.id,
      patientName: p.nomComplet,
      notes: p.mutuelle ? `Mutuelle: ${p.mutuelle}` : f.notes,
    }));
  };

  const selectActe = (acteId: string) => {
    const acte = catalogue.find((a) => String(a.id) === acteId);
    if (!acte) return;
    setCreateForm((f) => ({
      ...f,
      catalogueId: String(acte.id),
      acte: acte.nom,
      montant: acte.prix,
    }));
  };

  const netMontant = Math.max(0, createForm.montant - createForm.remise);

  const submitCreate = async () => {
    if (!createForm.patientId || !createForm.acte || createForm.montant <= 0) {
      toast.error("Patient, acte et montant sont obligatoires.");
      return;
    }
    if (createForm.acompte > netMontant) {
      toast.error("L'acompte ne peut pas dépasser le montant net.");
      return;
    }
    setCreating(true);
    try {
      const payload: InvoicePayload = {
        patientId: createForm.patientId,
        patientName: createForm.patientName,
        acte: createForm.acte,
        montant: createForm.montant,
        modePaiement: createForm.modePaiement,
      };
      if (createForm.remise > 0) payload.remise = createForm.remise;
      if (createForm.acompte > 0) payload.acompte = createForm.acompte;
      if (createForm.notes.trim()) payload.notes = createForm.notes.trim();

      const { reference } = await submitInvoice(payload);
      toast.success(`Facture ${reference} créée.`);
      setCreateOpen(false);
      retry();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Création de facture impossible");
    } finally {
      setCreating(false);
    }
  };

  const openDetail = async (inv: Invoice) => {
    setDetail(inv);
    setDetailOpen(true);
    setPayAmount(String(inv.resteACharge > 0 ? inv.resteACharge : ""));
    setPayMode((inv.modePaiement as InvoicePayload["modePaiement"]) || "carte");
    setRefundAmount("");
    setRefundReason("");
    setCancelConfirmOpen(false);
    setDetailLoading(true);
    const controller = new AbortController();
    try {
      const fresh = await fetchInvoice(inv.id || inv.reference, controller.signal);
      setDetail(fresh);
      setPayAmount(String(fresh.resteACharge > 0 ? fresh.resteACharge : ""));
    } catch (e) {
      if (!controller.signal.aborted) {
        toast.error(e instanceof Error ? e.message : "Détail facture indisponible");
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const refreshDetail = async (id: string) => {
    try {
      const fresh = await fetchInvoice(id);
      setDetail(fresh);
      setPayAmount(String(fresh.resteACharge > 0 ? fresh.resteACharge : ""));
      retry();
    } catch {
      retry();
    }
  };

  const handlePay = async () => {
    if (!detail || !canPayInvoice(detail)) return;
    const montant = Number(payAmount);
    if (!Number.isFinite(montant) || montant <= 0) {
      toast.error("Montant de paiement invalide.");
      return;
    }
    if (montant > detail.resteACharge) {
      toast.error(`Le paiement ne peut pas dépasser ${formatMAD(detail.resteACharge)}.`);
      return;
    }
    setActionBusy(true);
    try {
      await payInvoice(detail.id || detail.reference, { montant, mode: payMode });
      toast.success("Paiement enregistré.");
      await refreshDetail(detail.id || detail.reference);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Paiement impossible");
    } finally {
      setActionBusy(false);
    }
  };

  const handleSettle = async () => {
    if (!detail || !canPayInvoice(detail)) return;
    setActionBusy(true);
    try {
      await settleInvoice(detail.reference || detail.id);
      toast.success("Facture soldée.");
      await refreshDetail(detail.id || detail.reference);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Règlement impossible");
    } finally {
      setActionBusy(false);
    }
  };

  const handleRefund = async () => {
    if (!detail || !canRefundInvoice(detail)) return;
    const montant = Number(refundAmount);
    const maxRefund = detail.amountPaid - detail.amountRefunded;
    if (!Number.isFinite(montant) || montant <= 0) {
      toast.error("Montant de remboursement invalide.");
      return;
    }
    if (montant > maxRefund) {
      toast.error(`Le remboursement ne peut pas dépasser ${formatMAD(maxRefund)}.`);
      return;
    }
    if (!refundReason.trim()) {
      toast.error("Indiquez le motif du remboursement.");
      return;
    }
    setActionBusy(true);
    try {
      await refundInvoice(detail.id || detail.reference, {
        montant,
        reason: refundReason.trim(),
      });
      toast.success("Remboursement enregistré.");
      await refreshDetail(detail.id || detail.reference);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Remboursement impossible");
    } finally {
      setActionBusy(false);
    }
  };

  const handleCancel = async () => {
    if (!detail || !canCancelInvoice(detail)) return;
    setActionBusy(true);
    try {
      await cancelInvoice(detail.id || detail.reference);
      toast.success("Facture annulée.");
      setCancelConfirmOpen(false);
      await refreshDetail(detail.id || detail.reference);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Annulation impossible");
    } finally {
      setActionBusy(false);
    }
  };

  const handlePdf = async (inv: Invoice) => {
    const examenId = invoiceExamenId(inv);
    if (!examenId) {
      toast.info("PDF disponible via l'examen");
      return;
    }
    try {
      await downloadFactureExamen(examenId, inv.patientName || "patient");
      toast.success("Facture PDF téléchargée.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Téléchargement PDF impossible");
    }
  };

  const handleExport = () => {
    if (visibleInvoices.length === 0) {
      toast.error("Aucune facture à exporter");
      return;
    }
    const header = [
      "Reference",
      "Patient",
      "Examen",
      "Total",
      "Mutuelle",
      "Paye",
      "Reste",
      "Date",
      "Statut",
      "Mode",
    ];
    const rows = visibleInvoices.map((inv) => [
      inv.reference || inv.id,
      inv.patientName,
      inv.examen || inv.acte,
      String(inv.total),
      String(inv.insuranceShare),
      String(inv.amountPaid),
      String(inv.resteACharge),
      inv.date,
      INVOICE_STATUS_LABEL[inv.statut],
      inv.modePaiement,
    ]);
    downloadCsv(`factures-${new Date().toISOString().slice(0, 10)}.csv`, [header, ...rows]);
    toast.success(`Export CSV — ${visibleInvoices.length} facture(s)`);
  };

  if (!canViewBilling) {
    return (
      <div className="page-shell">
        <PageHeader eyebrow="Gestion" title="Facturation" subtitle="Accès réservé" />
        <EmptyState
          icon={Receipt}
          title="Accès refusé"
          description="Vous n'avez pas la permission de consulter le module facturation."
        />
      </div>
    );
  }

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Gestion"
        title="Facturation"
        subtitle="Émission, encaissements et suivi des factures du centre"
        actions={
          <>
            <div className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5">
              <Filter className="size-3.5 text-muted-foreground" />
              <Label htmlFor="filter-impayes" className="text-xs font-medium">
                Impayés
              </Label>
              <Switch
                id="filter-impayes"
                checked={impayesOnly}
                onCheckedChange={setImpayesOnly}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={visibleInvoices.length === 0}
              onClick={handleExport}
            >
              <Download className="mr-1.5 size-4" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={retry} disabled={loading}>
              <RefreshCw className={`mr-1.5 size-4 ${loading ? "animate-spin" : ""}`} />
              Actualiser
            </Button>
            {canCreateBilling ? (
              <Button size="sm" onClick={openCreate}>
                <Plus className="mr-1.5 size-4" />
                Nouvelle facture
              </Button>
            ) : null}
          </>
        }
      />

      {error ? <ServiceNotice message={error} onRetry={retry} /> : null}

      <KpiGrid>
        <KpiStat
          label="CA"
          value={loadFailed ? "—" : kpis.ca}
          icon={Receipt}
          tone="primary"
          emphasis
          context="Hors annulées / remboursées"
        />
        <KpiStat
          label="Encaissements"
          value={loadFailed ? "—" : kpis.encaissements}
          icon={Banknote}
          tone="success"
          context="Somme des paiements"
        />
        <KpiStat
          label="Reste à payer"
          value={loadFailed ? "—" : kpis.reste}
          icon={Wallet}
          tone="warning"
          context="Charge patient ouverte"
        />
        <KpiStat
          label="Part mutuelle"
          value={loadFailed ? "—" : kpis.mutuelle}
          icon={Undo2}
          tone="info"
          context="Prise en charge assurance"
        />
      </KpiGrid>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base">Factures</CardTitle>
            <p className="text-sm text-muted-foreground">
              {impayesOnly
                ? `${visibleInvoices.length} impayée(s)`
                : `${visibleInvoices.length} facture(s)`}
            </p>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {loading ? (
            <div className="space-y-3 px-6 pb-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : visibleInvoices.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title={impayesOnly ? "Aucun impayé" : "Aucune facture"}
              description={
                impayesOnly
                  ? "Aucune facture avec un reste à charge pour le moment."
                  : "Créez une facture pour démarrer le suivi des encaissements."
              }
              action={
                canCreateBilling && !impayesOnly ? (
                  <Button size="sm" onClick={openCreate}>
                    <Plus className="mr-1.5 size-4" />
                    Nouvelle facture
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Facture</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead className="hidden md:table-cell">Examen</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="hidden text-right lg:table-cell">Mutuelle</TableHead>
                    <TableHead className="hidden text-right sm:table-cell">Payé</TableHead>
                    <TableHead className="text-right">Reste</TableHead>
                    <TableHead className="hidden md:table-cell">Date</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="pr-6 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleInvoices.map((inv) => (
                    <TableRow
                      key={inv.id || inv.reference}
                      className="cursor-pointer"
                      onClick={() => void openDetail(inv)}
                    >
                      <TableCell className="pl-6">
                        <p className="font-mono text-xs font-semibold">
                          {inv.reference || inv.id}
                        </p>
                      </TableCell>
                      <TableCell className="font-medium">{inv.patientName || "—"}</TableCell>
                      <TableCell className="hidden max-w-[12rem] truncate text-sm text-muted-foreground md:table-cell">
                        {inv.examen || inv.acte || "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {formatMAD(inv.total)}
                      </TableCell>
                      <TableCell className="hidden text-right text-sm tabular-nums text-muted-foreground lg:table-cell">
                        {formatMAD(inv.insuranceShare)}
                      </TableCell>
                      <TableCell className="hidden text-right text-sm tabular-nums sm:table-cell">
                        {formatMAD(inv.amountPaid)}
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold tabular-nums">
                        {formatMAD(inv.resteACharge)}
                      </TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                        {inv.date || "—"}
                      </TableCell>
                      <TableCell>
                        <Pill tone={invoiceStatusTone(inv.statut)}>
                          {INVOICE_STATUS_LABEL[inv.statut]}
                        </Pill>
                      </TableCell>
                      <TableCell className="pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreHorizontal className="size-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => void openDetail(inv)}>
                              Voir le détail
                            </DropdownMenuItem>
                            {canPayInvoice(inv) ? (
                              <DropdownMenuItem
                                onClick={() => {
                                  void (async () => {
                                    try {
                                      await settleInvoice(inv.reference || inv.id);
                                      toast.success(`Facture ${inv.reference || inv.id} soldée.`);
                                      retry();
                                    } catch (e) {
                                      toast.error(
                                        e instanceof Error ? e.message : "Règlement impossible",
                                      );
                                    }
                                  })();
                                }}
                              >
                                <Banknote className="mr-2 size-4" />
                                Régler le reste
                              </DropdownMenuItem>
                            ) : null}
                            <DropdownMenuItem onClick={() => void handlePdf(inv)}>
                              <FileDown className="mr-2 size-4" />
                              PDF
                            </DropdownMenuItem>
                            {canCancelInvoice(inv) ? (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => {
                                    void (async () => {
                                      await openDetail(inv);
                                      setCancelConfirmOpen(true);
                                    })();
                                  }}
                                >
                                  <XCircle className="mr-2 size-4" />
                                  Annuler
                                </DropdownMenuItem>
                              </>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Création — dialog multi-étapes */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Nouvelle facture</DialogTitle>
          </DialogHeader>

          <div className="mb-2 flex gap-2 text-xs font-medium text-muted-foreground">
            {[1, 2, 3].map((s) => (
              <span
                key={s}
                className={`rounded-md px-2 py-1 ring-1 ring-inset ${
                  createStep === s
                    ? "bg-primary/10 text-primary ring-primary/25"
                    : "bg-muted/50 ring-border"
                }`}
              >
                {s}. {s === 1 ? "Patient" : s === 2 ? "Acte" : "Paiement"}
              </span>
            ))}
          </div>

          {createStep === 1 ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="patient-search">Rechercher un patient</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    id="patient-search"
                    className="pl-9"
                    placeholder="Nom, CIN…"
                    value={patientQuery}
                    onChange={(e) => setPatientQuery(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>
              {createForm.patientId ? (
                <div className="rounded-md border border-border bg-primary-soft/40 px-3 py-2 text-sm">
                  <span className="font-medium">{createForm.patientName}</span>
                  <span className="ml-2 text-muted-foreground">sélectionné</span>
                </div>
              ) : null}
              <div className="max-h-56 overflow-y-auto rounded-md border border-border">
                {patientSearching ? (
                  <div className="space-y-2 p-3">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : patientResults.length === 0 ? (
                  <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                    {patientQuery.trim().length < 2
                      ? "Saisissez au moins 2 caractères."
                      : "Aucun patient trouvé."}
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {patientResults.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          className={`flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left text-sm hover:bg-muted/60 ${
                            createForm.patientId === p.id ? "bg-primary/5" : ""
                          }`}
                          onClick={() => selectPatient(p)}
                        >
                          <span className="font-medium">{p.nomComplet}</span>
                          <span className="text-xs text-muted-foreground">
                            {p.cin}
                            {p.mutuelle ? ` · ${p.mutuelle}` : ""}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : null}

          {createStep === 2 ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Acte (catalogue)</Label>
                {catalogueLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select value={createForm.catalogueId} onValueChange={selectActe}>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          catalogue.length === 0
                            ? "Aucun acte disponible"
                            : "Sélectionner un acte"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {catalogue.map((a) => (
                        <SelectItem key={a.id} value={String(a.id)}>
                          {a.nom}
                          {a.modalite ? ` · ${a.modalite}` : ""} — {formatMAD(a.prix)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="montant">Montant (MAD)</Label>
                  <Input
                    id="montant"
                    type="number"
                    min={0}
                    step={1}
                    value={createForm.montant || ""}
                    onChange={(e) =>
                      setCreateForm((f) => ({
                        ...f,
                        montant: Number(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="remise">Remise (MAD)</Label>
                  <Input
                    id="remise"
                    type="number"
                    min={0}
                    step={1}
                    value={createForm.remise || ""}
                    onChange={(e) =>
                      setCreateForm((f) => ({
                        ...f,
                        remise: Number(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                La part assurance est calculée côté serveur selon les règles mutuelle. Net après
                remise :{" "}
                <span className="font-semibold text-foreground">{formatMAD(netMontant)}</span>
              </p>
            </div>
          ) : null}

          {createStep === 3 ? (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Mode de paiement</Label>
                  <Select
                    value={createForm.modePaiement}
                    onValueChange={(modePaiement) =>
                      setCreateForm((f) => ({
                        ...f,
                        modePaiement: modePaiement as InvoicePayload["modePaiement"],
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_MODES.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="acompte">Acompte (optionnel)</Label>
                  <Input
                    id="acompte"
                    type="number"
                    min={0}
                    step={1}
                    value={createForm.acompte || ""}
                    onChange={(e) =>
                      setCreateForm((f) => ({
                        ...f,
                        acompte: Number(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  rows={2}
                  value={createForm.notes}
                  onChange={(e) => setCreateForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Mutuelle, remarques…"
                />
              </div>
              <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
                <p>
                  <span className="text-muted-foreground">Patient :</span>{" "}
                  <span className="font-medium">{createForm.patientName}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Acte :</span>{" "}
                  <span className="font-medium">{createForm.acte}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Net :</span>{" "}
                  <span className="font-semibold tabular-nums">{formatMAD(netMontant)}</span>
                  {createForm.acompte > 0 ? (
                    <span className="ml-2 text-muted-foreground">
                      · acompte {formatMAD(createForm.acompte)}
                    </span>
                  ) : null}
                </p>
              </div>
            </div>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-0">
            {createStep > 1 ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateStep((s) => s - 1)}
                disabled={creating}
              >
                Précédent
              </Button>
            ) : (
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Fermer
              </Button>
            )}
            {createStep < 3 ? (
              <Button
                type="button"
                onClick={() => {
                  if (createStep === 1 && !createForm.patientId) {
                    toast.error("Sélectionnez un patient.");
                    return;
                  }
                  if (createStep === 2 && (!createForm.acte || createForm.montant <= 0)) {
                    toast.error("Sélectionnez un acte et un montant.");
                    return;
                  }
                  setCreateStep((s) => s + 1);
                }}
              >
                Suivant
              </Button>
            ) : (
              <Button type="button" onClick={() => void submitCreate()} disabled={creating}>
                {creating ? "Création…" : "Créer la facture"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Détail facture */}
      <Sheet
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) {
            setDetail(null);
            setCancelConfirmOpen(false);
          }
        }}
      >
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="font-mono text-base">
              {detail?.reference || detail?.id || "Facture"}
            </SheetTitle>
            <SheetDescription>
              {detail?.patientName || "—"}
              {detail ? ` · ${INVOICE_STATUS_LABEL[detail.statut]}` : ""}
            </SheetDescription>
          </SheetHeader>

          {detailLoading && !detail ? (
            <div className="mt-6 space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : detail ? (
            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <DetailField label="Patient" value={detail.patientName || "—"} />
                <DetailField label="Date" value={detail.date || "—"} />
                <DetailField label="Examen / Acte" value={detail.examen || detail.acte || "—"} />
                <DetailField label="Mode" value={detail.modePaiement || "—"} />
                <DetailField label="Total" value={formatMAD(detail.total)} />
                <DetailField label="Remise" value={formatMAD(detail.remise)} />
                <DetailField label="Part mutuelle" value={formatMAD(detail.insuranceShare)} />
                <DetailField label="Part patient" value={formatMAD(detail.patientShare)} />
                <DetailField label="Payé" value={formatMAD(detail.amountPaid)} />
                <DetailField label="Remboursé" value={formatMAD(detail.amountRefunded)} />
                <DetailField label="Reste à charge" value={formatMAD(detail.resteACharge)} />
                <DetailField label="Reste global" value={formatMAD(detail.reste)} />
              </div>

              {detail.notes ? (
                <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Notes
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{detail.notes}</p>
                </div>
              ) : null}

              {detail.items?.length ? (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Lignes
                  </p>
                  <ul className="divide-y divide-border rounded-md border border-border text-sm">
                    {detail.items.map((it, idx) => (
                      <li
                        key={it.id ?? `${it.label}-${idx}`}
                        className="flex items-center justify-between gap-2 px-3 py-2"
                      >
                        <span className="min-w-0 truncate">
                          {it.label || "Ligne"}
                          {it.quantity > 1 ? ` ×${it.quantity}` : ""}
                        </span>
                        <span className="shrink-0 tabular-nums">{formatMAD(it.lineTotal)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => void handlePdf(detail)}>
                  <FileDown className="mr-1.5 size-4" />
                  PDF
                </Button>
                <Pill tone={invoiceStatusTone(detail.statut)}>
                  {INVOICE_STATUS_LABEL[detail.statut]}
                </Pill>
              </div>

              {canPayInvoice(detail) ? (
                <div className="space-y-3 rounded-md border border-border p-3">
                  <p className="text-sm font-semibold">Paiement</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="pay-montant">Montant (max {formatMAD(detail.resteACharge)})</Label>
                      <Input
                        id="pay-montant"
                        type="number"
                        min={0}
                        max={detail.resteACharge}
                        step={1}
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Mode</Label>
                      <Select
                        value={payMode}
                        onValueChange={(v) =>
                          setPayMode(v as InvoicePayload["modePaiement"])
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PAYMENT_MODES.map((m) => (
                            <SelectItem key={m.value} value={m.value}>
                              {m.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" disabled={actionBusy} onClick={() => void handlePay()}>
                      Enregistrer le paiement
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={actionBusy}
                      onClick={() => void handleSettle()}
                    >
                      <Banknote className="mr-1.5 size-4" />
                      Solder le reste
                    </Button>
                  </div>
                </div>
              ) : null}

              {canRefundInvoice(detail) ? (
                <div className="space-y-3 rounded-md border border-border p-3">
                  <p className="text-sm font-semibold">Remboursement</p>
                  <div className="space-y-1.5">
                    <Label htmlFor="refund-montant">
                      Montant (max {formatMAD(detail.amountPaid - detail.amountRefunded)})
                    </Label>
                    <Input
                      id="refund-montant"
                      type="number"
                      min={0}
                      step={1}
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="refund-reason">Motif</Label>
                    <Textarea
                      id="refund-reason"
                      rows={2}
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                      placeholder="Motif du remboursement…"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={actionBusy}
                    onClick={() => void handleRefund()}
                  >
                    <Undo2 className="mr-1.5 size-4" />
                    Rembourser
                  </Button>
                </div>
              ) : null}

              {canCancelInvoice(detail) ? (
                <div className="space-y-3 rounded-md border border-destructive/30 p-3">
                  <p className="text-sm font-semibold text-destructive">Annulation</p>
                  {!cancelConfirmOpen ? (
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={actionBusy}
                      onClick={() => setCancelConfirmOpen(true)}
                    >
                      <XCircle className="mr-1.5 size-4" />
                      Annuler la facture
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Confirmer l&apos;annulation de {detail.reference || detail.id} ? Cette
                        action est définitive.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={actionBusy}
                          onClick={() => void handleCancel()}
                        >
                          Confirmer l&apos;annulation
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={actionBusy}
                          onClick={() => setCancelConfirmOpen(false)}
                        >
                          Retour
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 truncate font-medium tabular-nums">{value}</p>
    </div>
  );
}
