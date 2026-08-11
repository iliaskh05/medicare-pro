import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Ban,
  Brain,
  CalendarClock,
  CheckCircle,
  Download,
  FileText,
  Layers,
  Mail,
  Phone,
  Pill as PillIcon,
  Printer,
  ReceiptText,
  RefreshCw,
  ScanLine,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Wallet,
  User,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { ActionButton } from "@/components/action-button";
import { DocumentMenu } from "@/components/document-menu";
import { useRole } from "@/hooks/use-role";
import { CaisseFraudAlert } from "@/components/fraude/caisse-alert";
import { ClusterScatter } from "@/components/cluster-scatter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  EmptyState,
  IconTile,
  PageHeader,
  Pill,
  AiNotice,
  ServiceNotice,
} from "@/components/ui-kit";

import { cn } from "@/lib/utils";
import { fetchPatientAnomalies, updateAnomalieStatut } from "@/lib/api/audit";
import { anomalyRiskLevel } from "@/utils/anomalyDetection";
import type { Anomalie } from "@/types/audit";
import {
  fetchPatientData,
  fetchPatientHistory,
  fetchPatientImaging,
  fetchPatientPrescriptions,
  fetchPatientBilling,
  fetchPatientFinancialStatus,
  type PatientRow,
  type HistoryItem,
  type PatientImaging,
  type PatientPrescription,
  type PatientBilling,
  type FinancialStatus,
} from "@/lib/api/patients";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/patient/$patientId")({
  head: () => ({
    meta: [
      { title: "Dossier patient — RadioCRM" },
      {
        name: "description",
        content:
          "Dossier patient complet : historique de consultations, imagerie IRM/Scanner, ordonnances et facturation, avec analyse de conformité et détection de fraude par IA.",
      },
      { property: "og:title", content: "Dossier patient — RadioCRM" },
      {
        property: "og:description",
        content:
          "Score de risque, alertes de clustering et validation humaine des anomalies de facturation détectées par l'IA.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PatientRecordPage,
});

type Severite = "critique" | "eleve" | "faible";

const severiteMeta: Record<
  Severite,
  {
    label: string;
    tone: "destructive" | "warning" | "primary";
    ring: string;
    bg: string;
    text: string;
  }
> = {
  critique: {
    label: "Critique",
    tone: "destructive",
    ring: "ring-destructive/30",
    bg: "bg-destructive/8",
    text: "text-destructive",
  },
  eleve: {
    label: "Élevé",
    tone: "warning",
    ring: "ring-warning/40",
    bg: "bg-warning/10",
    text: "text-warning-foreground",
  },
  faible: {
    label: "Modéré",
    tone: "primary",
    ring: "ring-primary/25",
    bg: "bg-primary/8",
    text: "text-primary",
  },
};

const mad = (n: number) => `${n.toLocaleString("fr-MA")} MAD`;

function RiskDonut({ value, blocked }: { value: number; blocked: boolean }) {
  const pct = Math.min(100, Math.max(0, Math.round(value * 100)));
  const size = 148;
  const stroke = 13;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = blocked
    ? "var(--muted-foreground)"
    : pct >= 80
      ? "var(--destructive)"
      : pct >= 60
        ? "var(--warning)"
        : "var(--success)";
  const label = blocked
    ? "Dossier bloqué"
    : pct >= 80
      ? "Risque élevé"
      : pct >= 60
        ? "Risque modéré"
        : "Risque faible";

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-label={`Score de risque ${pct} %`}
          className="-rotate-90"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--muted)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${(c * pct) / 100} ${c}`}
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-extrabold tabular-nums tracking-tight" style={{ color }}>
            {pct}
            <span className="text-lg font-bold"> %</span>
          </span>
          <span className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Score de risque
          </span>
        </div>
      </div>
      <p className="mt-2 text-sm font-bold" style={{ color }}>
        {label}
      </p>
    </div>
  );
}

function PatientRecordPage() {
  const { patientId } = Route.useParams();
  const { role, profile } = useRole();
  const [patient, setPatient] = useState<PatientRow | null>(null);
  const [historique, setHistorique] = useState<HistoryItem[]>([]);
  const [imagerie, setImagerie] = useState<PatientImaging[]>([]);
  const [ordonnances, setOrdonnances] = useState<PatientPrescription[]>([]);
  const [factures, setFactures] = useState<PatientBilling[]>([]);
  const [financier, setFinancier] = useState<FinancialStatus | null>(null);
  const [alertes, setAlertes] = useState<Anomalie[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [soldeOverride, setSoldeOverride] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    async function loadData() {
      try {
        const [p, h, i, o, f, fin, al] = await Promise.all([
          fetchPatientData(patientId, controller.signal),
          fetchPatientHistory(patientId, controller.signal),
          fetchPatientImaging(patientId, controller.signal),
          fetchPatientPrescriptions(patientId, controller.signal),
          fetchPatientBilling(patientId, controller.signal),
          fetchPatientFinancialStatus(patientId, controller.signal),
          role === "directeur"
            ? fetchPatientAnomalies(patientId, controller.signal)
            : Promise.resolve([]),
        ]);
        setPatient(p);
        setHistorique(h);
        setImagerie(i);
        setOrdonnances(o);
        setFactures(f);
        setFinancier(fin);
        setAlertes(al.filter((a) => a.statut === "pending"));
      } catch (err: unknown) {
        if (controller.signal.aborted) return;
        setError("Service injoignable");
        console.error(err);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    loadData();
    return () => controller.abort();
  }, [patientId, role]);

  const solde = soldeOverride ?? financier?.reste ?? 0;
  const scoreMax = alertes.reduce((max, a) => Math.max(max, a.score), 0);
  const score = blocked ? 0 : scoreMax / 100;

  const dismiss = useCallback((a: Anomalie) => {
    setAlertes((prev) => prev.filter((x) => x.id !== a.id));
    void updateAnomalieStatut(a.id, "dismissed").catch(() => undefined);
    toast.info("Anomalie classée en faux positif", {
      description: `${a.id} · ${a.acte}`,
    });
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <div className="grid gap-6 xl:grid-cols-10">
          <Skeleton className="h-[600px] xl:col-span-7" />
          <Skeleton className="h-[600px] xl:col-span-3" />
        </div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Dossier patient"
          subtitle={`Référence ${patientId} · Centre d'Imagerie Médicale`}
          actions={
            <Button variant="outline" asChild>
              <Link to="/patients">
                <ArrowLeft className="mr-2 size-4" /> Retour aux patients
              </Link>
            </Button>
          }
        />
        <ServiceNotice
          message="Dossier en attente de connexion au service de données du centre."
          onRetry={() => window.location.reload()}
        />
        <div className="app-card">
          <EmptyState
            icon={AlertTriangle}
            title="Aucune donnée disponible"
            description="Les informations médicales, l'imagerie et la facturation s'afficheront dès que le service répondra."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dossier patient"
        subtitle={`${patient.nomComplet} · ${patient.id} · Centre d'Imagerie Médicale`}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/patients">
                <ArrowLeft className="mr-2 size-4" /> Retour aux patients
              </Link>
            </Button>
            {financier && (
              <DocumentMenu
                context={{
                  patient: patient.nomComplet,
                  reference: patient.id,
                  examen: financier.examen,
                  total: financier.total,
                  acompte: financier.acompte,
                }}
              />
            )}
            <ActionButton
              variant="outline"
              toastKind="success"
              toastMessage="Dossier exporté en PDF"
              toastDescription={`${patient.nomComplet} · ${patient.id} — PDF généré`}
            >
              <Download className="mr-2 size-4" /> Exporter le dossier (PDF)
            </ActionButton>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-10">
        <div className="space-y-6 xl:col-span-7">
          <Card>
            <CardContent className="p-5">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/20">
                    <User className="size-7" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-xl font-bold tracking-tight sm:text-2xl">
                        {patient.nomComplet}
                      </h2>
                      <Pill tone="primary">{patient.mutuelle}</Pill>
                      {blocked ? (
                        <Pill tone="destructive">
                          <Ban className="size-3" /> Dossier bloqué
                        </Pill>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {patient.age} ans · {patient.sexe ?? "Non précisé"} · ID {patient.id} · CIN{" "}
                      {patient.cin}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <ActionButton
                    size="sm"
                    variant="outline"
                    toastKind="info"
                    toastMessage="Appel sortant lancé"
                    toastDescription={`${patient.nomComplet} · ${patient.telephone}`}
                  >
                    <Phone className="mr-1.5 size-4" /> Appeler
                  </ActionButton>
                  {patient.email && (
                    <ActionButton
                      size="sm"
                      variant="outline"
                      toastKind="success"
                      toastMessage="Compte rendu envoyé"
                      toastDescription={`Email transmis à ${patient.email}`}
                    >
                      <Mail className="mr-1.5 size-4" /> Envoyer le CR
                    </ActionButton>
                  )}
                </div>
              </div>

              <Separator className="my-5" />

              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    label: "N° affiliation",
                    value: patient.numAffiliation ?? "N/A",
                    icon: BadgeCheck,
                  },
                  {
                    label: "Médecin traitant",
                    value: patient.medecinTraitant ?? "Non renseigné",
                    icon: Stethoscope,
                  },
                  { label: "Téléphone", value: patient.telephone, icon: Phone },
                  {
                    label: "Prochain rendez-vous",
                    value: patient.prochainRdv ?? "Aucun",
                    icon: CalendarClock,
                  },
                ].map((f) => (
                  <div key={f.label} className="flex min-w-0 items-start gap-3">
                    <f.icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {f.label}
                      </dt>
                      <dd className="truncate text-sm font-semibold">{f.value}</dd>
                    </div>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          {profile.canSeeFinance && financier ? (
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Wallet className="size-4 text-muted-foreground" />
                  Détail financier de l&apos;examen en cours
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {[
                    { label: "Examen", value: financier.examen, tone: "" },
                    { label: "Montant total", value: mad(financier.total), tone: "" },
                    {
                      label: "Acompte versé",
                      value: mad(financier.acompte),
                      tone: "text-success",
                    },
                    {
                      label: "Statut impression",
                      value: financier.statutImpression,
                      tone: "",
                    },
                    {
                      label: "Reste à payer",
                      value: solde === 0 ? "Soldé" : mad(solde),
                      tone: solde === 0 ? "text-success" : "text-destructive",
                    },
                  ].map((f) => (
                    <div
                      key={f.label}
                      className="rounded-xl border border-border bg-background px-3 py-2.5"
                    >
                      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        {f.label}
                      </dt>
                      <dd className={cn("mt-1 text-sm font-bold tabular-nums", f.tone)}>
                        {f.value}
                      </dd>
                    </div>
                  ))}
                </dl>
                <div className="flex items-start gap-2 rounded-xl bg-destructive/8 p-3 ring-1 ring-inset ring-destructive/25">
                  <Printer className="mt-0.5 size-4 shrink-0 text-destructive" />
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {solde === 0
                      ? "Solde régularisé : les clichés remis sont couverts par un encaissement complet."
                      : `Clichés imprimés et remis au patient alors que ${mad(solde)} restent dus — rupture du protocole d'encaissement.`}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Tabs defaultValue="historique">
            <TabsList>
              <TabsTrigger value="historique">
                <Activity className="mr-2 size-4" /> Historique
              </TabsTrigger>
              <TabsTrigger value="imagerie">
                <ScanLine className="mr-2 size-4" /> Imagerie
              </TabsTrigger>
              <TabsTrigger value="ordonnances">
                <PillIcon className="mr-2 size-4" /> Ordonnances
              </TabsTrigger>
              {profile.canSeeFinance ? (
                <TabsTrigger value="facturation">
                  <ReceiptText className="mr-2 size-4" /> Facturation
                </TabsTrigger>
              ) : null}
            </TabsList>

            <TabsContent value="historique">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Parcours de soins</CardTitle>
                </CardHeader>
                <CardContent className="space-y-0 pt-0">
                  {historique.length > 0 ? (
                    <ol className="relative border-l border-border pl-6">
                      {historique.map((h, i) => (
                        <li
                          key={i}
                          className={cn(
                            "relative",
                            i === 0 ? "pb-6" : "py-6",
                            i === historique.length - 1 && "pb-0",
                          )}
                        >
                          <span className="absolute -left-[31px] top-1.5 grid size-4 place-items-center rounded-full bg-card ring-2 ring-inset ring-primary/40">
                            <span className="size-1.5 rounded-full bg-primary" />
                          </span>
                          <div className="flex flex-wrap items-center gap-2">
                            <Pill tone={h.tone}>{h.type}</Pill>
                            <span className="text-xs font-medium text-muted-foreground">
                              {h.date}
                            </span>
                          </div>
                          <p className="mt-1.5 text-sm font-semibold">{h.intitule}</p>
                          <p className="text-xs text-muted-foreground">{h.praticien}</p>
                          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                            {h.note}
                          </p>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <EmptyState
                      compact
                      icon={Activity}
                      title="Aucun historique"
                      description="Aucun événement médical n'a été enregistré pour ce patient."
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="imagerie">
              {imagerie.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {imagerie.map((e) => (
                    <Card key={e.id}>
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <IconTile tone={e.tone}>
                              <ScanLine className="size-5" />
                            </IconTile>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold">{e.examen}</p>
                              <p className="text-xs text-muted-foreground">
                                {e.id} · {e.modalite} · {e.date}
                              </p>
                            </div>
                          </div>
                          <Pill tone={e.tone}>{e.statut}</Pill>
                        </div>
                        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                          {e.conclusion}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">{e.radiologue}</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" asChild>
                            <Link to="/viewer">
                              <ScanLine className="mr-1.5 size-4" /> Visionneuse
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={ScanLine}
                  title="Aucun examen"
                  description="Aucun examen d'imagerie n'a été réalisé."
                />
              )}
            </TabsContent>

            <TabsContent value="ordonnances">
              {ordonnances.length > 0 ? (
                <div className="space-y-4">
                  {ordonnances.map((o) => (
                    <Card key={o.id}>
                      <CardContent className="p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold">Ordonnance {o.id}</p>
                            <p className="text-xs text-muted-foreground">
                              {o.date} · {o.prescripteur}
                            </p>
                          </div>
                        </div>
                        <ul className="mt-3 space-y-2">
                          {o.lignes.map((l) => (
                            <li key={l} className="flex items-start gap-2 text-sm">
                              <CheckCircle className="mt-0.5 size-4 shrink-0 text-success" />
                              <span className="text-muted-foreground">{l}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={PillIcon}
                  title="Aucune ordonnance"
                  description="Aucune ordonnance n'est enregistrée au dossier."
                />
              )}
            </TabsContent>

            <TabsContent value="facturation">
              <Card>
                <CardContent className="px-0 py-0">
                  {factures.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="pl-6">Facture</TableHead>
                            <TableHead>Acte</TableHead>
                            <TableHead className="hidden md:table-cell">Date</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="pr-6 text-right">Statut</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {factures.map((f) => (
                            <TableRow key={f.id}>
                              <TableCell className="pl-6 font-mono text-xs">{f.id}</TableCell>
                              <TableCell className="text-sm font-medium">{f.acte}</TableCell>
                              <TableCell className="hidden text-sm md:table-cell">
                                {f.date}
                              </TableCell>
                              <TableCell className="text-right text-sm tabular-nums">
                                {mad(f.total)}
                              </TableCell>
                              <TableCell className="pr-6 text-right">
                                <Pill tone={f.tone}>{f.statut}</Pill>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <EmptyState
                      icon={ReceiptText}
                      title="Aucune facture"
                      description="Aucune historique de facturation."
                    />
                  )}
                  {factures.length > 0 && (
                    <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-6 py-4 sm:flex-row">
                      <p className="text-sm text-muted-foreground">
                        Total facturé :{" "}
                        <span className="font-semibold text-foreground tabular-nums">
                          {mad(factures.reduce((s, f) => s + f.total, 0))}
                        </span>
                      </p>
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/audit">
                          <ShieldAlert className="mr-1.5 size-4" /> Audit & Conformité
                        </Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <aside className="space-y-4 xl:col-span-3">
          {role === "directeur" && (
            <>
              <Card
                className={cn(
                  "overflow-hidden ring-1 ring-inset",
                  blocked ? "ring-border" : "ring-destructive/25",
                )}
              >
                <div
                  className={cn(
                    "flex items-center gap-2 border-b px-5 py-3",
                    blocked
                      ? "border-border bg-muted/50"
                      : "border-destructive/20 bg-destructive/8",
                  )}
                >
                  <ShieldAlert
                    className={cn(
                      "size-4 shrink-0",
                      blocked ? "text-muted-foreground" : "text-destructive",
                    )}
                  />
                  <p className="text-sm font-bold tracking-tight">Analyse de Conformité IA</p>
                </div>
                <CardContent className="space-y-5 p-5">
                  <AiNotice contexte="Résultats produits par le moteur d'analyse automatique du centre." />
                  <RiskDonut value={score} blocked={blocked} />

                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[
                      { label: "Alertes", value: String(alertes.length) },
                      {
                        label: "Clusters",
                        value: String(new Set(alertes.map((a) => a.cluster)).size),
                      },
                      {
                        label: "Écart",
                        value: mad(
                          alertes.reduce((sum, a) => sum + Math.max(0, a.montant - a.bareme), 0),
                        ),
                      },
                    ].map((k) => (
                      <div key={k.label} className="rounded-xl bg-muted/60 px-2 py-2.5">
                        <p className="text-base font-bold tabular-nums leading-none">{k.value}</p>
                        <p className="mt-1 text-[11px] font-medium text-muted-foreground">
                          {k.label}
                        </p>
                      </div>
                    ))}
                  </div>

                  {!blocked && alertes.length > 0 ? <CaisseFraudAlert compact /> : null}

                  {!blocked && financier && solde > 0 && alertes.length > 0 ? (
                    <div className="rounded-xl bg-destructive/8 p-3.5 ring-1 ring-inset ring-destructive/30">
                      <div className="flex items-start gap-2">
                        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
                        <div className="min-w-0">
                          <p className="text-sm font-bold leading-snug text-destructive">
                            Score de risque : {Math.round(score * 100)} %
                          </p>
                          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                            Anomalie de caisse détectée pour l&apos;{financier.examen}. Les clichés
                            sont prêts mais {mad(solde)} restent dus.
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 space-y-2">
                        <ActionButton
                          className="w-full"
                          variant="destructive"
                          size="sm"
                          toastKind="error"
                          toastMessage="Remise bloquée"
                          toastDescription="Retrait des clichés suspendu jusqu'à encaissement."
                          onDone={() => setBlocked(true)}
                        >
                          <Ban className="mr-1.5 size-4" /> Bloquer la remise
                        </ActionButton>
                        <ActionButton
                          className="w-full"
                          variant="outline"
                          size="sm"
                          toastKind="success"
                          toastMessage="Solde régularisé"
                          onDone={() => {
                            setSoldeOverride(0);
                            setAlertes([]);
                          }}
                        >
                          <Wallet className="mr-1.5 size-4" /> Régulariser le solde
                        </ActionButton>
                      </div>
                    </div>
                  ) : null}

                  <div className="flex items-start gap-2 rounded-xl bg-primary/8 p-3 ring-1 ring-inset ring-primary/20">
                    <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Modèle hybride (K-Means + régression logistique) évalué en continu.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Brain className="size-4 text-muted-foreground" />
                    Clustering des signaux faibles
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-5">
                  <ClusterScatter />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Layers className="size-4 text-muted-foreground" />
                    Alertes actives
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {alertes.length === 0 ? (
                    <EmptyState
                      compact
                      icon={ShieldCheck}
                      title="Aucune anomalie active"
                      description="Le dossier est conforme au barème."
                    />
                  ) : (
                    alertes.map((a) => {
                      const risk = anomalyRiskLevel(a.score) as Severite;
                      const m = severiteMeta[risk];
                      return (
                        <div
                          key={a.id}
                          className={cn(
                            "rounded-xl p-3.5 ring-1 ring-inset shadow-sm transition-shadow hover:shadow-md",
                            m.bg,
                            m.ring,
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p
                                className={cn("text-xs font-bold uppercase tracking-wider", m.text)}
                              >
                                {m.label} · {a.score} %
                              </p>
                              <p className="mt-1 text-sm font-bold leading-tight">{a.acte}</p>
                            </div>
                            <Pill tone={m.tone}>{a.cluster}</Pill>
                          </div>
                          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                            {a.motifs}
                          </p>
                          <div className="mt-3 flex gap-2">
                            <ActionButton
                              size="sm"
                              variant="outline"
                              className="h-8 flex-1 bg-background text-xs"
                              toastMessage="Anomalie classée"
                              onDone={() => dismiss(a)}
                            >
                              Faux positif
                            </ActionButton>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 flex-1 bg-background text-xs"
                              asChild
                            >
                              <Link to="/audit">Détails</Link>
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
