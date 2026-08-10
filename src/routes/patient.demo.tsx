import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
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
  ReceiptText,
  Printer,
  ScanLine,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Wallet,
  ThumbsUp,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { ActionButton } from "@/components/action-button";
import { DocumentMenu } from "@/components/document-menu";
import { useRole } from "@/hooks/use-role";
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
import { EmptyState, IconTile, PageHeader, Pill, SimulationNotice } from "@/components/ui-kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/patient/demo")({
  head: () => ({
    meta: [
      { title: "Dossier patient Karim Bennani — RadioCRM" },
      {
        name: "description",
        content:
          "Dossier patient complet : historique de consultations, imagerie IRM/Scanner, ordonnances et facturation, avec analyse de conformité et détection de fraude par IA.",
      },
      { property: "og:title", content: "Dossier patient — Analyse de conformité IA | RadioCRM" },
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

/* ------------------------------- Données démo ------------------------------ */

const patient = {
  id: "PAT-1042",
  nom: "Karim Bennani",
  age: 47,
  sexe: "Homme",
  cin: "BK442018",
  telephone: "06 61 84 23 09",
  email: "k.bennani@mail.ma",
  mutuelle: "CNSS",
  numAffiliation: "CNSS-8842-1190",
  medecinTraitant: "Dr. Salma Idrissi",
  ville: "Casablanca",
  prochainRdv: "Jeudi 14:30 · IRM de contrôle",
};

const historique = [
  {
    date: "08 août 2026",
    type: "Consultation",
    intitule: "Lombalgie chronique — évaluation post-IRM",
    praticien: "Dr. Salma Idrissi",
    note: "Douleur L4-L5 persistante, EVA 6/10. Poursuite kinésithérapie, contrôle à 6 semaines.",
    tone: "primary" as const,
  },
  {
    date: "02 août 2026",
    type: "Imagerie",
    intitule: "IRM lombaire sans injection",
    praticien: "Dr. Youssef Alaoui (radiologue)",
    note: "Protrusion discale L4-L5 avec conflit radiculaire modéré. Pas de sténose serrée.",
    tone: "warning" as const,
  },
  {
    date: "21 juillet 2026",
    type: "Imagerie",
    intitule: "Scanner cérébral sans injection",
    praticien: "Dr. Youssef Alaoui (radiologue)",
    note: "Absence de lésion hémorragique ou expansive. Examen sans particularité.",
    tone: "success" as const,
  },
  {
    date: "12 juillet 2026",
    type: "Consultation",
    intitule: "Céphalées récidivantes — bilan initial",
    praticien: "Dr. Salma Idrissi",
    note: "Examen neurologique normal. Demande d'imagerie cérébrale à visée d'élimination.",
    tone: "primary" as const,
  },
];

const imagerie = [
  {
    id: "IMG-2088",
    examen: "IRM lombaire (L1-S1)",
    modalite: "IRM 1.5T",
    date: "02/08/2026",
    radiologue: "Dr. Youssef Alaoui",
    statut: "Compte rendu validé",
    tone: "success" as const,
    conclusion: "Protrusion L4-L5, conflit radiculaire modéré.",
  },
  {
    id: "IMG-2041",
    examen: "Scanner cérébral",
    modalite: "CT 64 barrettes",
    date: "21/07/2026",
    radiologue: "Dr. Youssef Alaoui",
    statut: "Compte rendu validé",
    tone: "success" as const,
    conclusion: "Aucune anomalie décelable.",
  },
  {
    id: "IMG-2154",
    examen: "IRM cérébrale avec injection",
    modalite: "IRM 1.5T",
    date: "09/08/2026",
    radiologue: "En attente de relecture",
    statut: "À relire",
    tone: "warning" as const,
    conclusion: "Séquences acquises, interprétation en cours.",
  },
];

const ordonnances = [
  {
    id: "ORD-7712",
    date: "08/08/2026",
    prescripteur: "Dr. Salma Idrissi",
    lignes: ["Paracétamol 1 g — 3×/jour, 7 jours", "Kinésithérapie — 10 séances"],
  },
  {
    id: "ORD-7690",
    date: "12/07/2026",
    prescripteur: "Dr. Salma Idrissi",
    lignes: ["Ibuprofène 400 mg — si douleur, max 3/jour", "Scanner cérébral (demande d'examen)"],
  },
];

const facturation = [
  {
    id: "FAC-3391",
    acte: "IRM lombaire sans injection",
    date: "02/08/2026",
    total: 2200,
    mutuelle: 1210,
    statut: "Réglée",
    tone: "success" as const,
  },
  {
    id: "FAC-3352",
    acte: "Scanner cérébral",
    date: "21/07/2026",
    total: 1400,
    mutuelle: 770,
    statut: "Réglée",
    tone: "success" as const,
  },
  {
    id: "FAC-3412",
    acte: "IRM cérébrale avec injection",
    date: "09/08/2026",
    total: 2600,
    mutuelle: 1430,
    statut: "Anomalie IA",
    tone: "destructive" as const,
  },
  {
    id: "FAC-3413",
    acte: "IRM cérébrale avec injection (doublon)",
    date: "09/08/2026",
    total: 2600,
    mutuelle: 1430,
    statut: "Anomalie IA",
    tone: "destructive" as const,
  },
];

const dossierFinancier = {
  examen: "IRM Cérébrale",
  total: 1500,
  acompte: 500,
  statutImpression: "Validé / Imprimé",
  get reste() {
    return this.total - this.acompte;
  },
};

type Severite = "critique" | "eleve" | "modere";

type Alerte = {
  id: string;
  severite: Severite;
  titre: string;
  detail: string;
  cluster: string;
  confiance: number;
  impact: string;
};

const alertesInitiales: Alerte[] = [
  {
    id: "ALR-901",
    severite: "critique",
    titre: "Incohérence de facturation",
    detail:
      "Acte « IRM Cérébrale » facturé deux fois pour la même session du 09/08/2026 (FAC-3412 et FAC-3413).",
    cluster: "Cluster #4 · Doublons d'actes",
    confiance: 0.94,
    impact: "2 600 MAD",
  },
  {
    id: "ALR-902",
    severite: "eleve",
    titre: "Anomalie de prescription",
    detail:
      "Le médecin prescripteur ne correspond pas à la spécialité de l'acte réalisé (généraliste → acte neuro-radiologique avec injection).",
    cluster: "Cluster #2 · Discordance prescripteur/acte",
    confiance: 0.81,
    impact: "Conformité CNSS",
  },
  {
    id: "ALR-903",
    severite: "modere",
    titre: "Signal faible — fréquence d'examens",
    detail:
      "3 examens d'imagerie lourde en 30 jours pour ce patient, soit 2,4× la médiane du groupe de pairs.",
    cluster: "Cluster #7 · Sur-utilisation modérée",
    confiance: 0.63,
    impact: "À surveiller",
  },
];

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
  modere: {
    label: "Modéré",
    tone: "primary",
    ring: "ring-primary/25",
    bg: "bg-primary/8",
    text: "text-primary",
  },
};

const mad = (n: number) => `${n.toLocaleString("fr-MA")} MAD`;

/* --------------------------- Score de risque (donut) --------------------------- */

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
          <SimulationNotice contexte="Dossier, analyses et scores de fraude entièrement fictifs (démonstration)." />
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

/* --------------------------------- La page -------------------------------- */

function PatientRecordPage() {
  const [alertes, setAlertes] = useState<Alerte[]>(alertesInitiales);
  const [blocked, setBlocked] = useState(false);
  const [solde, setSolde] = useState(dossierFinancier.reste);
  const { profile } = useRole();

  const score = blocked ? 0.12 : alertes.length === 0 ? 0.18 : 0.92;

  const dismiss = (a: Alerte) => {
    setAlertes((prev) => prev.filter((x) => x.id !== a.id));
    toast.info("Alerte classée en faux positif", {
      description: `${a.id} · ${a.titre} — le modèle a été mis à jour pour l'apprentissage.`,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dossier patient"
        subtitle={`${patient.nom} · ${patient.id} · Centre d'Imagerie Médicale`}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/patients">
                <ArrowLeft className="mr-2 size-4" /> Retour aux patients
              </Link>
            </Button>
            <DocumentMenu
              context={{
                patient: patient.nom,
                reference: patient.id,
                examen: dossierFinancier.examen,
                total: dossierFinancier.total,
                acompte: dossierFinancier.acompte,
              }}
            />
            <ActionButton
              variant="outline"
              toastKind="success"
              toastMessage="Dossier exporté en PDF"
              toastDescription={`${patient.nom} · ${patient.id} — 12 pages générées`}
            >
              <Download className="mr-2 size-4" /> Exporter le dossier (PDF)
            </ActionButton>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-10">
        {/* ---------------------- Colonne gauche : dossier ---------------------- */}
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
                        {patient.nom}
                      </h2>
                      <Pill tone="primary">{patient.mutuelle}</Pill>
                      {blocked ? (
                        <Pill tone="destructive">
                          <Ban className="size-3" /> Dossier bloqué
                        </Pill>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {patient.age} ans · {patient.sexe} · ID {patient.id} · CIN {patient.cin}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <ActionButton
                    size="sm"
                    variant="outline"
                    toastKind="info"
                    toastMessage="Appel sortant simulé"
                    toastDescription={`${patient.nom} · ${patient.telephone}`}
                  >
                    <Phone className="mr-1.5 size-4" /> Appeler
                  </ActionButton>
                  <ActionButton
                    size="sm"
                    variant="outline"
                    toastKind="success"
                    toastMessage="Compte rendu envoyé"
                    toastDescription={`Email transmis à ${patient.email}`}
                  >
                    <Mail className="mr-1.5 size-4" /> Envoyer le CR
                  </ActionButton>
                </div>
              </div>

              <Separator className="my-5" />

              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "N° affiliation", value: patient.numAffiliation, icon: BadgeCheck },
                  { label: "Médecin traitant", value: patient.medecinTraitant, icon: Stethoscope },
                  { label: "Téléphone", value: patient.telephone, icon: Phone },
                  {
                    label: "Prochain rendez-vous",
                    value: patient.prochainRdv,
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

          {profile.canSeeFinance ? (
            <Card data-tour="finance" className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Wallet className="size-4 text-muted-foreground" />
                  Détail financier de l&apos;examen en cours
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {[
                    { label: "Examen", value: dossierFinancier.examen, tone: "" },
                    { label: "Montant total", value: mad(dossierFinancier.total), tone: "" },
                    {
                      label: "Acompte versé",
                      value: mad(dossierFinancier.acompte),
                      tone: "text-success",
                    },
                    {
                      label: "Statut impression",
                      value: dossierFinancier.statutImpression,
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
                <Activity /> Historique
              </TabsTrigger>
              <TabsTrigger value="imagerie">
                <ScanLine /> Imagerie (IRM/Scanner)
              </TabsTrigger>
              <TabsTrigger value="ordonnances">
                <PillIcon /> Ordonnances
              </TabsTrigger>
              {profile.canSeeFinance ? (
                <TabsTrigger value="facturation">
                  <ReceiptText /> Facturation
                </TabsTrigger>
              ) : null}
            </TabsList>

            {/* Historique */}
            <TabsContent value="historique">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Parcours de soins — 30 derniers jours</CardTitle>
                </CardHeader>
                <CardContent className="space-y-0 pt-0">
                  <ol className="relative border-l border-border pl-6">
                    {historique.map((h, i) => (
                      <li
                        key={h.date + h.intitule}
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
                </CardContent>
              </Card>
            </TabsContent>

            {/* Imagerie */}
            <TabsContent value="imagerie">
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
                            <ScanLine className="mr-1.5 size-4" /> Ouvrir la visionneuse
                          </Link>
                        </Button>
                        <ActionButton
                          size="sm"
                          variant="ghost"
                          toastKind="success"
                          toastMessage="Compte rendu téléchargé"
                          toastDescription={`${e.id} · ${e.examen}`}
                        >
                          <FileText className="mr-1.5 size-4" /> Compte rendu
                        </ActionButton>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Ordonnances */}
            <TabsContent value="ordonnances">
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
                        <ActionButton
                          size="sm"
                          variant="outline"
                          toastKind="success"
                          toastMessage="Ordonnance téléchargée (PDF)"
                          toastDescription={`${o.id} · ${patient.nom}`}
                        >
                          <Download className="mr-1.5 size-4" /> Télécharger
                        </ActionButton>
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
            </TabsContent>

            {/* Facturation */}
            <TabsContent value="facturation">
              <Card>
                <CardContent className="px-0 py-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="pl-6">Facture</TableHead>
                          <TableHead>Acte</TableHead>
                          <TableHead className="hidden md:table-cell">Date</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="hidden text-right lg:table-cell">
                            Part mutuelle
                          </TableHead>
                          <TableHead className="pr-6 text-right">Statut</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {facturation.map((f) => (
                          <TableRow key={f.id}>
                            <TableCell className="pl-6 font-mono text-xs">{f.id}</TableCell>
                            <TableCell className="text-sm font-medium">{f.acte}</TableCell>
                            <TableCell className="hidden text-sm md:table-cell">{f.date}</TableCell>
                            <TableCell className="text-right text-sm tabular-nums">
                              {mad(f.total)}
                            </TableCell>
                            <TableCell className="hidden text-right text-sm tabular-nums lg:table-cell">
                              {mad(f.mutuelle)}
                            </TableCell>
                            <TableCell className="pr-6 text-right">
                              <Pill tone={f.tone}>{f.statut}</Pill>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-6 py-4 sm:flex-row">
                    <p className="text-sm text-muted-foreground">
                      Total facturé :{" "}
                      <span className="font-semibold text-foreground tabular-nums">
                        {mad(facturation.reduce((s, f) => s + f.total, 0))}
                      </span>{" "}
                      · 2 anomalies détectées par l&apos;IA
                    </p>
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/audit">
                        <ShieldAlert className="mr-1.5 size-4" /> Ouvrir dans Audit &amp; Conformité
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* --------------------- Colonne droite : dashboard IA --------------------- */}
        <aside className="space-y-4 xl:col-span-3">
          <Card
            data-tour="ia-panel"
            className={cn(
              "overflow-hidden ring-1 ring-inset",
              blocked ? "ring-border" : "ring-destructive/25",
            )}
          >
            <div
              className={cn(
                "flex items-center gap-2 border-b px-5 py-3",
                blocked ? "border-border bg-muted/50" : "border-destructive/20 bg-destructive/8",
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
              <RiskDonut value={score} blocked={blocked} />

              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: "Alertes", value: String(alertes.length) },
                  { label: "Clusters", value: "3" },
                  { label: "Enjeu", value: "2,6 k" },
                ].map((k) => (
                  <div key={k.label} className="rounded-xl bg-muted/60 px-2 py-2.5">
                    <p className="text-base font-bold tabular-nums leading-none">{k.value}</p>
                    <p className="mt-1 text-[11px] font-medium text-muted-foreground">{k.label}</p>
                  </div>
                ))}
              </div>

              {!blocked && profile.canSeeFinance ? (
                <div className="rounded-xl bg-destructive/8 p-3.5 ring-1 ring-inset ring-destructive/30">
                  <div className="flex items-start gap-2">
                    <ShieldAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
                    <div className="min-w-0">
                      <p className="text-sm font-bold leading-snug text-destructive">
                        Score de risque : 92 % — Rupture de protocole financier
                      </p>
                      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                        L&apos;IA détecte une anomalie de caisse : les clichés de l&apos;
                        {dossierFinancier.examen} sont marqués « {dossierFinancier.statutImpression}{" "}
                        » et remis au patient, alors que le solde de {mad(solde)} n&apos;a pas été
                        encaissé (acompte de {mad(dossierFinancier.acompte)} seul enregistré).
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    <ActionButton
                      className="w-full"
                      variant="destructive"
                      size="sm"
                      toastKind="error"
                      toastMessage="Remise des résultats bloquée"
                      toastDescription={`${patient.id} · retrait des clichés suspendu jusqu'à encaissement.`}
                      onDone={() => setBlocked(true)}
                    >
                      <Ban className="mr-1.5 size-4" /> Bloquer la remise des résultats
                    </ActionButton>
                    <ActionButton
                      className="w-full"
                      variant="outline"
                      size="sm"
                      toastKind="success"
                      toastMessage="Solde régularisé"
                      toastDescription={`${mad(dossierFinancier.reste)} encaissés · reçu généré automatiquement.`}
                      onDone={() => {
                        setSolde(0);
                        setAlertes((prev) => prev.filter((a) => a.id !== "ALR-901"));
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
                  Modèle hybride (K-Means + régression logistique) — dernière évaluation il y a
                  <span className="font-semibold text-foreground"> 2 minutes</span> sur 1 284
                  dossiers comparables.
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
                Alertes de Clustering
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {alertes.length === 0 ? (
                <EmptyState
                  compact
                  icon={ShieldCheck}
                  title="Aucune anomalie active"
                  description="Toutes les alertes ont été traitées. Le dossier est conforme au barème."
                />
              ) : (
                alertes.map((a) => {
                  const m = severiteMeta[a.severite];
                  return (
                    <div
                      key={a.id}
                      className={cn(
                        "rounded-xl p-3.5 ring-1 ring-inset shadow-sm transition-shadow hover:shadow-md",
                        m.bg,
                        m.ring,
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <AlertTriangle className={cn("size-4 shrink-0", m.text)} />
                          <p className="text-sm font-bold leading-snug">{a.titre}</p>
                        </div>
                        <Pill tone={m.tone} className="shrink-0">
                          {m.label}
                        </Pill>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                        {a.detail}
                      </p>
                      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1 font-medium">
                          <Brain className="size-3" /> {a.cluster}
                        </span>
                        <span className="font-semibold tabular-nums">
                          Confiance {Math.round(a.confiance * 100)} %
                        </span>
                        <span>Impact : {a.impact}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <ActionButton
                          size="sm"
                          variant="outline"
                          toastKind="warning"
                          toastMessage="Anomalie transmise au contrôle facturation"
                          toastDescription={`${a.id} · ${a.titre}`}
                        >
                          <ShieldAlert className="mr-1.5 size-4" /> Investiguer
                        </ActionButton>
                        <ActionButton
                          size="sm"
                          variant="ghost"
                          delay={900}
                          toastKind="info"
                          toastMessage="Traitement du faux positif"
                          onDone={() => dismiss(a)}
                        >
                          <ThumbsUp className="mr-1.5 size-4" /> Ignorer
                        </ActionButton>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-2.5 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Décision (human-in-the-loop)
              </p>
              {blocked ? (
                <ActionButton
                  className="w-full"
                  variant="outline"
                  toastKind="success"
                  toastMessage="Dossier débloqué"
                  toastDescription={`${patient.id} · circuit de facturation réactivé`}
                  onDone={() => setBlocked(false)}
                >
                  <ShieldCheck className="mr-2 size-4" /> Débloquer le dossier
                </ActionButton>
              ) : (
                <ActionButton
                  className="w-full"
                  variant="destructive"
                  toastKind="error"
                  toastMessage="Dossier bloqué"
                  toastDescription={`${patient.id} · facturation suspendue, audit notifié`}
                  onDone={() => setBlocked(true)}
                >
                  <Ban className="mr-2 size-4" /> Bloquer le dossier
                </ActionButton>
              )}
              <ActionButton
                className="w-full"
                variant="outline"
                toastKind="info"
                toastMessage="Alertes classées en faux positifs"
                toastDescription="Le modèle a été réentraîné sur ce retour."
                onDone={() => setAlertes([])}
              >
                <CheckCircle className="mr-2 size-4" /> Ignorer (faux positif)
              </ActionButton>
              <ActionButton
                className="w-full"
                variant="ghost"
                toastKind="success"
                toastMessage="Rapport de conformité exporté"
                toastDescription={`${patient.id} · rapport IA au format PDF`}
              >
                <Download className="mr-2 size-4" /> Rapport de conformité
              </ActionButton>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
