import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CalendarPlus,
  FileText,
  FolderOpen,
  ImageIcon,
  ReceiptText,
  ScanLine,
  ShieldAlert,
  Wallet,
} from "lucide-react";

import { PatientDocumentsPanel } from "@/components/patients/documents-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  EmptyState,
  PageHeader,
  Pill,
  ServiceNotice,
  type Tone,
} from "@/components/ui-kit";
import { useRole } from "@/hooks/use-role";
import { fetchPatientAnomalies } from "@/lib/api/audit";
import {
  fetchInvoices,
  INVOICE_STATUS_LABEL,
  invoiceStatusTone,
  type Invoice,
} from "@/lib/api/billing";
import { fetchPatientDocuments } from "@/lib/api/documents";
import {
  fetchPatientBilling,
  fetchPatientData,
  fetchPatientFinancialStatus,
  fetchPatientHistory,
  fetchPatientImaging,
  fetchPatientTimeline,
  type FinancialStatus,
  type HistoryItem,
  type PatientBilling,
  type PatientImaging,
  type PatientRow,
  type PatientTimelineEvent,
} from "@/lib/api/patients";
import {
  fetchReports,
  REPORT_STATUS_LABEL,
  type ReportStatus,
  type ReportSummary,
} from "@/lib/api/reports";
import { formatCentreDateTime } from "@/lib/date";
import type { Anomalie } from "@/types/audit";
import { formatMAD } from "@/types/domain";

const PATIENT_TABS = [
  "apercu",
  "historique",
  "comptes-rendus",
  "imagerie",
  "facturation",
  "documents",
  "timeline",
] as const;

type PatientTab = (typeof PATIENT_TABS)[number];

function isPatientTab(value: string): value is PatientTab {
  return (PATIENT_TABS as readonly string[]).includes(value);
}

export const Route = createFileRoute("/patient/$patientId")({
  validateSearch: (search: Record<string, unknown>): { tab?: PatientTab } => {
    const raw = search["tab"];
    if (raw == null || raw === "") return {};
    const value = String(raw);
    return { tab: isPatientTab(value) ? value : "apercu" };
  },
  head: () => ({
    meta: [
      { title: "Dossier patient — RadioCRM" },
      {
        name: "description",
        content:
          "Dossier patient : historique, comptes-rendus, imagerie, facturation, documents et timeline.",
      },
      { property: "og:title", content: "Dossier patient — RadioCRM" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PatientRecordPage,
});

function reportStatusTone(status: ReportStatus): Tone {
  switch (status) {
    case "validated":
      return "success";
    case "in_review":
      return "warning";
    case "amended":
      return "info";
    default:
      return "neutral";
  }
}

function historyTone(tone: HistoryItem["tone"]): Tone {
  return tone === "primary" ||
    tone === "warning" ||
    tone === "success" ||
    tone === "destructive" ||
    tone === "neutral"
    ? tone
    : "neutral";
}

function imagingTone(tone: PatientImaging["tone"]): Tone {
  return tone === "primary" ||
    tone === "warning" ||
    tone === "success" ||
    tone === "destructive" ||
    tone === "neutral"
    ? tone
    : "neutral";
}

function billingTone(tone: PatientBilling["tone"]): Tone {
  return tone === "primary" ||
    tone === "warning" ||
    tone === "success" ||
    tone === "destructive" ||
    tone === "neutral"
    ? tone
    : "neutral";
}

function anomalyScoreTone(score: number): Tone {
  if (score >= 80) return "destructive";
  if (score >= 60) return "warning";
  return "primary";
}

function PatientRecordPage() {
  const { patientId } = Route.useParams();
  const { tab: tabParam } = Route.useSearch();
  const tab: PatientTab = tabParam ?? "apercu";
  const navigate = useNavigate({ from: Route.fullPath });
  const { role, profile } = useRole();
  const canSeeFinance = profile.canSeeFinance;

  const [patient, setPatient] = useState<PatientRow | null>(null);
  const [historique, setHistorique] = useState<HistoryItem[]>([]);
  const [imagerie, setImagerie] = useState<PatientImaging[]>([]);
  const [billingFallback, setBillingFallback] = useState<PatientBilling[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [financier, setFinancier] = useState<FinancialStatus | null>(null);
  const [timeline, setTimeline] = useState<PatientTimelineEvent[]>([]);
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [documentsCount, setDocumentsCount] = useState<number | null>(null);
  const [anomalies, setAnomalies] = useState<Anomalie[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    async function loadData() {
      try {
        const [
          p,
          h,
          i,
          billing,
          allInvoices,
          fin,
          tl,
          reps,
          docs,
          al,
        ] = await Promise.all([
          fetchPatientData(patientId, controller.signal),
          fetchPatientHistory(patientId, controller.signal),
          fetchPatientImaging(patientId, controller.signal),
          canSeeFinance
            ? fetchPatientBilling(patientId, controller.signal).catch(() => [])
            : Promise.resolve([] as PatientBilling[]),
          canSeeFinance
            ? fetchInvoices(controller.signal).catch(() => [] as Invoice[])
            : Promise.resolve([] as Invoice[]),
          canSeeFinance
            ? fetchPatientFinancialStatus(patientId, controller.signal).catch(() => null)
            : Promise.resolve(null),
          fetchPatientTimeline(patientId, controller.signal).catch(() => []),
          fetchReports(patientId, controller.signal).catch(() => []),
          fetchPatientDocuments(patientId, controller.signal).catch(() => null),
          role === "directeur"
            ? fetchPatientAnomalies(patientId, controller.signal).catch(() => [])
            : Promise.resolve([] as Anomalie[]),
        ]);

        if (controller.signal.aborted) return;

        setPatient(p);
        setHistorique(h);
        setImagerie(i);
        setBillingFallback(billing);
        setInvoices(allInvoices.filter((inv) => String(inv.patientId) === String(patientId)));
        setFinancier(fin);
        setTimeline(tl);
        setReports(reps);
        setDocumentsCount(docs == null ? null : docs.length);
        setAnomalies(al.filter((a) => a.statut === "pending"));
      } catch (err: unknown) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Service injoignable");
        setPatient(null);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    void loadData();
    return () => controller.abort();
  }, [patientId, role, canSeeFinance, reloadKey]);

  const setTab = (next: string) => {
    const value = isPatientTab(next) ? next : "apercu";
    void navigate({ search: (prev) => ({ ...prev, tab: value }) });
  };

  const patientInvoices = invoices;
  const facturationRows = useMemo(() => {
    if (patientInvoices.length > 0) {
      return patientInvoices.map((inv) => ({
        key: inv.id,
        date: inv.date,
        label: inv.acte || inv.examen || inv.reference,
        total: inv.total,
        mutuelle: inv.partMutuelle,
        reste: inv.resteACharge,
        statutLabel: INVOICE_STATUS_LABEL[inv.statut],
        tone: invoiceStatusTone(inv.statut) as Tone,
      }));
    }
    return billingFallback.map((b) => ({
      key: b.id,
      date: b.date,
      label: b.acte,
      total: b.total,
      mutuelle: b.mutuelle,
      reste: b.reste ?? Math.max(0, b.total - b.mutuelle - (b.acompte ?? 0)),
      statutLabel: b.statut,
      tone: billingTone(b.tone),
    }));
  }, [patientInvoices, billingFallback]);

  const dernierExamen = useMemo(() => {
    const hist = historique[0];
    if (hist) {
      return {
        title: hist.intitule || hist.type,
        detail: [hist.date, hist.praticien].filter(Boolean).join(" · "),
      };
    }
    const img = imagerie[0];
    if (img) {
      return {
        title: img.examen,
        detail: [img.date, img.modalite, img.radiologue].filter(Boolean).join(" · "),
      };
    }
    return null;
  }, [historique, imagerie]);

  const timelineSnippet = timeline.slice(0, 5);
  const solde = financier?.reste ?? 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Dossier patient"
          subtitle={`Référence ${patientId}`}
          actions={
            <Button variant="outline" asChild>
              <Link to="/patients" search={{ nouveau: false }}>
                <ArrowLeft className="mr-2 size-4" /> Retour aux patients
              </Link>
            </Button>
          }
        />
        <ServiceNotice
          message={error ?? "Dossier introuvable ou service indisponible."}
          onRetry={() => setReloadKey((k) => k + 1)}
        />
        <EmptyState
          icon={AlertTriangle}
          title="Aucune donnée disponible"
          description="Les informations médicales, l'imagerie et la facturation s'afficheront dès que le service répondra."
        />
      </div>
    );
  }

  return (
    <div className="page-shell space-y-6">
      <PageHeader
        eyebrow="Dossier patient"
        title={patient.nomComplet}
        subtitle={[
          patient.numeroDossier ?? `ID ${patient.id}`,
          patient.age != null ? `${patient.age} ans` : null,
          patient.sexe,
          patient.cin ? `CIN ${patient.cin}` : null,
        ]
          .filter(Boolean)
          .join(" · ")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {patient.mutuelle ? <Pill tone="primary">{patient.mutuelle}</Pill> : null}
            {patient.numAffiliation ? (
              <Pill tone="neutral">Affil. {patient.numAffiliation}</Pill>
            ) : null}
            <Button variant="outline" size="sm" asChild>
              <Link to="/patients" search={{ nouveau: false }}>
                <ArrowLeft className="mr-1.5 size-4" /> Patients
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/accueil" search={{ mode: "rdv", patientId: patient.id }}>
                <CalendarPlus className="mr-1.5 size-4" /> Nouveau RDV
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/worklist">
                <ScanLine className="mr-1.5 size-4" /> Nouvel examen
              </Link>
            </Button>
            {canSeeFinance ? (
              <Button variant="outline" size="sm" asChild>
                <Link to="/facturation">
                  <ReceiptText className="mr-1.5 size-4" /> Nouvelle facture
                </Link>
              </Button>
            ) : null}
            <Button size="sm" variant="secondary" onClick={() => setTab("documents")}>
              <FolderOpen className="mr-1.5 size-4" /> Documents
            </Button>
          </div>
        }
      />

      <div className={role === "directeur" ? "grid gap-6 xl:grid-cols-10" : undefined}>
        <div className={role === "directeur" ? "space-y-6 xl:col-span-7" : "space-y-6"}>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="h-auto w-full flex-wrap justify-start">
              <TabsTrigger value="apercu">Vue générale</TabsTrigger>
              <TabsTrigger value="historique">
                <Activity className="mr-2 size-4" /> Examens
              </TabsTrigger>
              <TabsTrigger value="comptes-rendus">
                <FileText className="mr-2 size-4" /> Comptes-rendus
              </TabsTrigger>
              <TabsTrigger value="imagerie">
                <ImageIcon className="mr-2 size-4" /> Imagerie
              </TabsTrigger>
              {canSeeFinance ? (
                <TabsTrigger value="facturation">
                  <ReceiptText className="mr-2 size-4" /> Facturation
                </TabsTrigger>
              ) : null}
              <TabsTrigger value="documents">
                <FolderOpen className="mr-2 size-4" /> Documents
              </TabsTrigger>
              <TabsTrigger value="timeline">
                <CalendarClock className="mr-2 size-4" /> Timeline
              </TabsTrigger>
            </TabsList>

            <TabsContent value="apercu" className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Dernier examen
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {dernierExamen ? (
                      <>
                        <p className="font-semibold leading-snug">{dernierExamen.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{dernierExamen.detail}</p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">Aucun examen</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Prochain RDV
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-semibold">
                      {patient.prochainRdv
                        ? formatCentreDateTime(patient.prochainRdv)
                        : "Aucun rendez-vous"}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Wallet className="size-4" /> Situation financière
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!canSeeFinance ? (
                      <p className="text-sm text-muted-foreground">Accès restreint</p>
                    ) : financier ? (
                      <>
                        <p
                          className={
                            solde === 0
                              ? "font-semibold text-success"
                              : "font-semibold text-destructive"
                          }
                        >
                          {solde === 0 ? "Soldé" : formatMAD(solde)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {[financier.examen, financier.statutImpression].filter(Boolean).join(" · ") ||
                            `${patientInvoices.length} facture(s)`}
                        </p>
                      </>
                    ) : patientInvoices.length > 0 ? (
                      <>
                        <p className="font-semibold">
                          {formatMAD(
                            patientInvoices.reduce((sum, inv) => sum + inv.resteACharge, 0),
                          )}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Reste à charge · {patientInvoices.length} facture(s)
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">Aucune donnée</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Documents
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-semibold">
                      {documentsCount == null ? "—" : documentsCount}
                    </p>
                    <Button
                      variant="link"
                      className="h-auto px-0 text-xs"
                      onClick={() => setTab("documents")}
                    >
                      Voir les documents
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Timeline récente</CardTitle>
                </CardHeader>
                <CardContent>
                  {timelineSnippet.length === 0 ? (
                    <EmptyState
                      icon={CalendarClock}
                      title="Aucun événement"
                      description="La timeline du dossier apparaîtra ici dès que des événements seront enregistrés."
                      compact
                    />
                  ) : (
                    <ul className="space-y-3">
                      {timelineSnippet.map((ev) => (
                        <li
                          key={ev.id}
                          className="flex items-start justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold leading-snug">{ev.title}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {[ev.type, ev.actor, ev.detail].filter(Boolean).join(" · ")}
                            </p>
                          </div>
                          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                            {formatCentreDateTime(ev.at)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {timeline.length > 5 ? (
                    <Button
                      variant="link"
                      className="mt-2 h-auto px-0 text-xs"
                      onClick={() => setTab("timeline")}
                    >
                      Voir toute la timeline ({timeline.length})
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="historique">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Historique des examens</CardTitle>
                </CardHeader>
                <CardContent>
                  {historique.length === 0 ? (
                    <EmptyState
                      icon={Activity}
                      title="Aucun historique"
                      description="Les examens passés de ce patient s'afficheront ici."
                      compact
                    />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Intitulé</TableHead>
                          <TableHead>Praticien</TableHead>
                          <TableHead>Note</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {historique.map((row, idx) => (
                          <TableRow key={`${row.date}-${row.intitule}-${idx}`}>
                            <TableCell className="whitespace-nowrap tabular-nums">
                              {row.date}
                            </TableCell>
                            <TableCell>
                              <Pill tone={historyTone(row.tone)}>{row.type}</Pill>
                            </TableCell>
                            <TableCell className="font-medium">{row.intitule}</TableCell>
                            <TableCell>{row.praticien || "—"}</TableCell>
                            <TableCell className="max-w-xs truncate text-muted-foreground">
                              {row.note || "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="comptes-rendus">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <CardTitle className="text-base">Comptes-rendus</CardTitle>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/comptes-rendus">Ouvrir le module</Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  {reports.length === 0 ? (
                    <EmptyState
                      icon={FileText}
                      title="Aucun compte-rendu"
                      description="Les comptes-rendus liés à ce patient apparaîtront ici."
                      compact
                    />
                  ) : (
                    <ul className="space-y-3">
                      {reports.map((r) => (
                        <li
                          key={r.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-3 py-3"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold">{r.examLabel || "Examen"}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {[formatCentreDateTime(r.createdAt), r.radiologist]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Pill tone={reportStatusTone(r.status)}>
                              {REPORT_STATUS_LABEL[r.status] ?? r.status}
                            </Pill>
                            <Button variant="outline" size="sm" asChild>
                              <Link to="/comptes-rendus">Voir</Link>
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="imagerie">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Imagerie</CardTitle>
                </CardHeader>
                <CardContent>
                  {imagerie.length === 0 ? (
                    <EmptyState
                      icon={ScanLine}
                      title="Aucune étude"
                      description="Les examens d'imagerie de ce patient s'afficheront ici."
                      compact
                    />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Examen</TableHead>
                          <TableHead>Modalité</TableHead>
                          <TableHead>Radiologue</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead>Conclusion</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {imagerie.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell className="whitespace-nowrap tabular-nums">
                              {row.date}
                            </TableCell>
                            <TableCell className="font-medium">{row.examen}</TableCell>
                            <TableCell>{row.modalite || "—"}</TableCell>
                            <TableCell>{row.radiologue || "—"}</TableCell>
                            <TableCell>
                              <Pill tone={imagingTone(row.tone)}>{row.statut}</Pill>
                            </TableCell>
                            <TableCell className="max-w-sm truncate text-muted-foreground">
                              {row.conclusion || "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {canSeeFinance ? (
              <TabsContent value="facturation">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2">
                    <CardTitle className="text-base">Facturation</CardTitle>
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/facturation">Nouvelle facture</Link>
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {facturationRows.length === 0 ? (
                      <EmptyState
                        icon={ReceiptText}
                        title="Aucune facture"
                        description="Les factures de ce patient s'afficheront ici."
                        compact
                      />
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Acte</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Mutuelle</TableHead>
                            <TableHead>Reste</TableHead>
                            <TableHead>Statut</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {facturationRows.map((row) => (
                            <TableRow key={row.key}>
                              <TableCell className="whitespace-nowrap tabular-nums">
                                {row.date}
                              </TableCell>
                              <TableCell className="font-medium">{row.label}</TableCell>
                              <TableCell className="tabular-nums">{formatMAD(row.total)}</TableCell>
                              <TableCell className="tabular-nums">
                                {formatMAD(row.mutuelle)}
                              </TableCell>
                              <TableCell className="tabular-nums">{formatMAD(row.reste)}</TableCell>
                              <TableCell>
                                <Pill tone={row.tone}>{row.statutLabel}</Pill>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            ) : null}

            <TabsContent value="documents">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Documents</CardTitle>
                </CardHeader>
                <CardContent>
                  <PatientDocumentsPanel patientId={patient.id} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="timeline">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Timeline complète</CardTitle>
                </CardHeader>
                <CardContent>
                  {timeline.length === 0 ? (
                    <EmptyState
                      icon={CalendarClock}
                      title="Timeline vide"
                      description="Aucun événement enregistré pour ce dossier."
                      compact
                    />
                  ) : (
                    <ul className="space-y-3">
                      {timeline.map((ev) => (
                        <li
                          key={ev.id}
                          className="flex items-start justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold leading-snug">{ev.title}</p>
                              {ev.source ? <Pill tone="neutral">{ev.source}</Pill> : null}
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {[ev.type, ev.action, ev.actor, ev.detail]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          </div>
                          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                            {formatCentreDateTime(ev.at)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {role === "directeur" ? (
          <aside className="space-y-4 xl:col-span-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldAlert className="size-4 text-muted-foreground" />
                  Anomalies (direction)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {anomalies.length === 0 ? (
                  <EmptyState
                    icon={ShieldAlert}
                    title="Aucune anomalie"
                    description="Pas d'alerte de conformité en attente pour ce dossier."
                    compact
                  />
                ) : (
                  anomalies.map((a) => (
                    <div
                      key={a.id}
                      className="rounded-lg border border-border bg-background p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-bold leading-tight">{a.acte}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {a.motifs?.join(" · ") || a.typeExamen}
                          </p>
                        </div>
                        <Pill tone={anomalyScoreTone(a.score)}>{a.score}%</Pill>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span>{formatMAD(a.montant)}</span>
                        <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                          <Link to="/audit">Détails</Link>
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
