import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  Ban,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  FileDown,
  FileText,
  Gauge,
  History,
  Loader2,
  Lock,
  RefreshCw,
  Search,
  SearchX,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader, Pill, IconTile, EmptyState } from "@/components/ui-kit";
import { FraudDashboard } from "@/components/fraude/fraud-dashboard";
import { AuditDemoPanel } from "@/components/fraude/audit-demo-panel";
import { AuditTrailPanel } from "@/components/audit/audit-trail-panel";
import { telechargerDossierPdf } from "@/lib/pdf-export";
import { formatMAD } from "@/types/domain";
import {
  typesExamen,
  type Anomalie,
  type AuditKpis,
  type MotifSuspect,
  type StatutAnomalie,
} from "@/types/audit";
import {
  EMPTY_AUDIT_KPIS,
  fetchAnomalies,
  fetchAuditKpis,
  updateAnomalieStatut,
} from "@/lib/api/audit";
import { fetchFraudClustering } from "@/lib/api/fraud";
import { fetchAuditTrail, type AuditTrailItem } from "@/lib/api/audit-trail";
import { formatCentreDateTime } from "@/lib/date";
import type { FraudClusteringResponse } from "@/types/fraud";
import { useRole } from "@/hooks/use-role";
import {
  anomalyRiskLevel,
  RISK_THRESHOLDS,
} from "@/utils/anomalyDetection";

export const Route = createFileRoute("/audit")({
  head: () => ({
    meta: [
      { title: "Audit & Conformité — Analyse de fraude | RadioCRM" },
      {
        name: "description",
        content:
          "Espace d'analyse de fraude pour la direction : vue modèle, cas signalés, détail dossier et journal d'audit.",
      },
      {
        property: "og:title",
        content: "Audit & Conformité — Analyse de fraude | RadioCRM",
      },
      {
        property: "og:description",
        content:
          "Tableau de bord de détection de fraude : scores de risque, cas signalés et export comptable.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuditPage,
});

const PAGE_SIZE = 8;

const periodDays: Record<string, number> = { "7": 7, "30": 30, "90": 90, all: 9999 };

/** Niveaux métier affichés (Faible → Critique). */
type BusinessRiskLevel = "faible" | "moyen" | "eleve" | "critique";

type RiskVisual = {
  label: string;
  tone: "success" | "warning" | "destructive" | "neutral";
  barClass: string;
  chipClass: string;
};

const RISK_VISUAL: Record<BusinessRiskLevel, RiskVisual> = {
  faible: {
    label: "Faible",
    tone: "success",
    barClass: "bg-success",
    chipClass: "border-success/30 bg-success/10 text-success",
  },
  moyen: {
    label: "Moyen",
    tone: "neutral",
    barClass: "bg-muted-foreground/60",
    chipClass: "border-border bg-muted text-foreground",
  },
  eleve: {
    label: "Élevé",
    tone: "warning",
    barClass: "bg-warning",
    chipClass: "border-warning/30 bg-warning/10 text-warning",
  },
  critique: {
    label: "Critique",
    tone: "destructive",
    barClass: "bg-destructive",
    chipClass: "border-destructive/30 bg-destructive/10 text-destructive",
  },
};

function businessRiskLevel(score: number): BusinessRiskLevel {
  if (score > RISK_THRESHOLDS.critique) return "critique";
  if (score > RISK_THRESHOLDS.eleve) return "eleve";
  if (score > 40) return "moyen";
  return "faible";
}

/** Traduction des signaux techniques en langage métier. */
const MOTIF_BUSINESS: Record<MotifSuspect | string, string> = {
  "Montant atypique": "Montant facturé nettement supérieur au barème conventionnel",
  "Fréquence rapprochée": "Plusieurs actes similaires enregistrés à intervalles très courts",
  "Fréquence anormale": "Volume d'examens inhabituel pour ce patient sur une courte période",
  "Horaire atypique": "Saisie réalisée hors plage d'ouverture habituelle du centre",
  "Doublon de saisie": "Possible double facturation du même acte",
  "Acte non prescrit": "Acte sans prescription clairement associée au dossier",
  "Incohérence dossier": "Informations patient / acte / mutuelle incohérentes",
  "Mutuelle expirée": "Couverture mutuelle expirée ou non valide à la date de l'acte",
  "Signal faible": "Écart mineur détecté — à surveiller",
  "Comportement nominal": "Comportement conforme aux patterns habituels",
};

function humanizeMotifs(motifs: string[]): string {
  if (!motifs.length) return "—";
  return motifs.map((m) => MOTIF_BUSINESS[m] ?? m).join(" · ");
}

function statutLabel(statut: StatutAnomalie): string {
  if (statut === "confirmed") return "Fraude confirmée";
  if (statut === "dismissed") return "Classé conforme";
  return "En revue";
}

function statutTone(statut: StatutAnomalie): "destructive" | "success" | "warning" {
  if (statut === "confirmed") return "destructive";
  if (statut === "dismissed") return "success";
  return "warning";
}

/** Statut de paiement : non fourni par l'API anomalies → N/A explicite. */
function paymentStatusLabel(_a: Anomalie): string {
  return "Non renseigné";
}

function formatDateFr(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-MA", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTimeFr(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("fr-MA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function displayOrDash(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function ScoreMeter({ score }: { score: number }) {
  const level = businessRiskLevel(score);
  const visual = RISK_VISUAL[level];
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all duration-500 ${visual.barClass}`}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
      <span className="font-mono text-xs font-semibold tabular-nums">{score}%</span>
    </div>
  );
}

function RiskLevelBadge({ score }: { score: number }) {
  const level = businessRiskLevel(score);
  const visual = RISK_VISUAL[level];
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${visual.chipClass}`}
    >
      {visual.label}
    </span>
  );
}

function modelExplanation(a: Anomalie): string {
  const ecart = a.montant - a.bareme;
  const level = RISK_VISUAL[businessRiskLevel(a.score)].label.toLowerCase();
  const motifs = humanizeMotifs(a.motifs);
  const clusterPart = a.cluster
    ? ` Le modèle l'a rapproché du groupe « ${a.cluster} ».`
    : "";
  const ecartPart =
    ecart !== 0
      ? ` Écart au barème : ${formatMAD(ecart)} (facturé ${formatMAD(a.montant)} vs barème ${formatMAD(a.bareme)}).`
      : ` Montant aligné sur le barème (${formatMAD(a.montant)}).`;
  return `Score de risque ${a.score}% (niveau ${level}). Motifs : ${motifs}.${clusterPart}${ecartPart} Toute décision humaine est journalisée et peut alimenter le réentraînement supervisé.`;
}

function dossierAnomalie(a: Anomalie) {
  return {
    titre: "Dossier d'audit de facturation",
    reference: a.id,
    lignes: [
      { label: "Patient", valeur: `${a.patient} (réf. ${a.cin})` },
      { label: "Acte réalisé", valeur: `${a.acte} — ${a.typeExamen}` },
      { label: "Date de l'acte", valeur: formatDateFr(a.date) },
      { label: "Montant facturé", valeur: formatMAD(a.montant) },
      { label: "Barème conventionnel", valeur: formatMAD(a.bareme) },
      { label: "Écart au barème", valeur: formatMAD(a.montant - a.bareme) },
      { label: "Score de risque", valeur: `${a.score}%` },
      { label: "Niveau de risque", valeur: RISK_VISUAL[businessRiskLevel(a.score)].label },
      { label: "Cluster détecté", valeur: a.cluster || "—" },
      { label: "Prescripteur", valeur: a.prescripteur },
      { label: "Mutuelle", valeur: a.mutuelle },
      { label: "Statut de traitement", valeur: statutLabel(a.statut) },
    ],
    blocs: [
      { titre: "Motifs (langage métier)", contenu: humanizeMotifs(a.motifs) },
      { titre: "Explication du modèle", contenu: modelExplanation(a) },
      {
        titre: "Recommandation",
        contenu:
          "Dossier à confronter aux pièces justificatives (ordonnance, accord préalable mutuelle) avant transmission au cabinet comptable.",
      },
    ],
    mention: "Dossier d'audit — Centre d'Imagerie Médicale · confidentiel, transmission comptable.",
  };
}

/**
 * Rendu conditionnel strict : hors profil Directeur, le module de détection de
 * fraude / analyse IA n'est pas monté dans le DOM (aucun masquage CSS).
 */
function AuditPage() {
  const { profile } = useRole();
  if (!profile.canSeeFraudModule) return <AccesRestreint />;
  return <FraudAuditModule />;
}

function AccesRestreint() {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <div className="mx-auto w-fit">
        <IconTile tone="destructive">
          <Lock className="size-5" />
        </IconTile>
      </div>
      <h1 className="mt-4 text-xl font-bold tracking-tight">Module réservé à la direction</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        La détection de fraude et l'analyse IA des règlements sont accessibles uniquement au
        Directeur (Mr Adnane). Contactez la direction pour toute demande d'accès.
      </p>
    </div>
  );
}

function FraudAuditModule() {
  const { profile } = useRole();

  const [anomalies, setAnomalies] = useState<Anomalie[]>([]);
  const [kpis, setKpis] = useState<AuditKpis>(EMPTY_AUDIT_KPIS);
  const [fraudModel, setFraudModel] = useState<FraudClusteringResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fraudLoading, setFraudLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fraudError, setFraudError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [seuil, setSeuil] = useState<number>(RISK_THRESHOLDS.eleve);
  const [query, setQuery] = useState("");
  const [niveau, setNiveau] = useState("tous");
  const [examen, setExamen] = useState("tous");
  const [periode, setPeriode] = useState("30");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<Anomalie | null>(null);
  const [relatedEvents, setRelatedEvents] = useState<AuditTrailItem[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);

  const chargerAudit = useCallback((signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);
    return Promise.all([fetchAnomalies(signal), fetchAuditKpis(signal)])
      .then(([anomaliesRows, kpisRows]) => {
        if (signal?.aborted) return;
        setAnomalies(anomaliesRows);
        setKpis(kpisRows);
      })
      .catch((e: unknown) => {
        if (signal?.aborted) return;
        setAnomalies([]);
        setKpis(EMPTY_AUDIT_KPIS);
        setError(e instanceof Error ? e.message : "Service d'audit indisponible");
      })
      .finally(() => {
        if (!signal?.aborted) setIsLoading(false);
      });
  }, []);

  const chargerFraudModel = useCallback(
    (signal?: AbortSignal) => {
      setFraudLoading(true);
      setFraudError(null);
      return fetchFraudClustering({ sensitivity: seuil })
        .then((res) => {
          if (signal?.aborted) return;
          setFraudModel(res);
        })
        .catch((e: unknown) => {
          if (signal?.aborted) return;
          setFraudModel(null);
          setFraudError(e instanceof Error ? e.message : "Service de clustering indisponible");
        })
        .finally(() => {
          if (!signal?.aborted) setFraudLoading(false);
        });
    },
    [seuil],
  );

  useEffect(() => {
    const controller = new AbortController();
    void chargerAudit(controller.signal);
    return () => controller.abort();
  }, [chargerAudit, reloadKey]);

  useEffect(() => {
    const controller = new AbortController();
    void chargerFraudModel(controller.signal);
    return () => controller.abort();
  }, [chargerFraudModel, reloadKey]);

  useEffect(() => {
    if (!detail) {
      setRelatedEvents([]);
      return;
    }
    const controller = new AbortController();
    setRelatedLoading(true);
    void fetchAuditTrail({
      entityId: detail.id,
      page: 0,
      size: 20,
      signal: controller.signal,
    })
      .then((pageRes) => {
        if (!controller.signal.aborted) setRelatedEvents(pageRes.content ?? []);
      })
      .catch(() => {
        if (!controller.signal.aborted) setRelatedEvents([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setRelatedLoading(false);
      });
    return () => controller.abort();
  }, [detail]);

  const now = Date.now();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const maxAge = (periodDays[periode] ?? 30) * 86_400_000;
    return anomalies.filter((a) => {
      if (a.score < seuil) return false;
      if (now - new Date(a.date).getTime() > maxAge) return false;
      if (examen !== "tous" && a.typeExamen !== examen) return false;
      if (niveau !== "tous") {
        if (niveau === "faible" || niveau === "eleve" || niveau === "critique") {
          if (anomalyRiskLevel(a.score) !== niveau) return false;
        } else if (niveau === "moyen") {
          if (businessRiskLevel(a.score) !== "moyen") return false;
        }
      }
      if (
        q &&
        !a.patient.toLowerCase().includes(q) &&
        !a.id.toLowerCase().includes(q) &&
        !a.cin.toLowerCase().includes(q) &&
        !a.acte.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [anomalies, seuil, niveau, examen, periode, query, now]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const confirmees = anomalies.filter((a) => a.statut === "confirmed");

  const riskDistribution = useMemo(() => {
    const counts: Record<BusinessRiskLevel, number> = {
      faible: 0,
      moyen: 0,
      eleve: 0,
      critique: 0,
    };
    for (const a of anomalies) {
      counts[businessRiskLevel(a.score)] += 1;
    }
    return counts;
  }, [anomalies]);

  const hasActiveFilters =
    query.trim() !== "" || niveau !== "tous" || examen !== "tous" || periode !== "30";

  const resetFilters = () => {
    setQuery("");
    setNiveau("tous");
    setExamen("tous");
    setPeriode("30");
    setPage(1);
  };

  const setStatut = (id: string, statut: StatutAnomalie) => {
    if (statut !== "confirmed" && statut !== "dismissed") return;
    updateAnomalieStatut(id, statut)
      .then(() => {
        setAnomalies((prev) => prev.map((a) => (a.id === id ? { ...a, statut } : a)));
        setDetail((prev) => (prev?.id === id ? { ...prev, statut } : prev));
        if (statut === "confirmed") {
          toast.success(`${id} confirmée comme fraude — envoyée au réentraînement supervisé`);
        } else {
          toast(`${id} marquée conforme (faux positif enregistré)`);
        }
      })
      .catch((e: unknown) => {
        toast.error("Mise à jour impossible", {
          description: e instanceof Error ? e.message : "Erreur réseau",
        });
      });
  };

  const exportCsv = () => {
    const source = confirmees.length > 0 ? confirmees : filtered;
    if (source.length === 0) {
      toast.error("Aucune donnée à exporter");
      return;
    }
    const header = [
      "id_dossier",
      "patient",
      "reference_patient",
      "acte",
      "type_examen",
      "date",
      "montant_mad",
      "bareme_mad",
      "ecart_mad",
      "score_risque",
      "niveau_risque",
      "motif",
      "cluster",
      "prescripteur",
      "mutuelle",
      "statut",
    ];
    const lines = source.map((a) =>
      [
        a.id,
        a.patient,
        a.cin,
        a.acte,
        a.typeExamen,
        a.date,
        a.montant,
        a.bareme,
        a.montant - a.bareme,
        a.score,
        RISK_VISUAL[businessRiskLevel(a.score)].label,
        humanizeMotifs(a.motifs),
        a.cluster,
        a.prescripteur,
        a.mutuelle,
        statutLabel(a.statut),
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(";"),
    );
    const csv = `${header.join(";")}\n${lines.join("\n")}`;
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `export_comptable_fraudes_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Export CSV comptable généré — ${source.length} dossier(s)`);
  };

  const exportPdf = () => {
    const source = confirmees.length > 0 ? confirmees : filtered;
    if (source.length === 0) {
      toast.error("Aucune donnée à exporter");
      return;
    }
    toast.success(`Dossier PDF préparé pour le cabinet comptable — ${source.length} anomalie(s)`);
    window.print();
  };

  const modelStatusLabel = fraudLoading
    ? "Analyse en cours…"
    : fraudError
      ? "Service indisponible"
      : fraudModel
        ? "Opérationnel"
        : "—";

  const recordsAnalyzed =
    fraudModel?.analyzed_count ?? (isLoading ? null : kpis.dossiersAnalyses || null);
  const anomaliesDetected =
    fraudModel?.alert_count ?? (isLoading ? null : anomalies.length);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Direction"
        title="Analyse de fraude"
        subtitle="Espace de travail : vue modèle, cas signalés et validation humaine"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isLoading || fraudLoading}
              onClick={() => setReloadKey((k) => k + 1)}
            >
              {isLoading || fraudLoading ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 size-4" />
              )}
              Actualiser
            </Button>
            {profile.canExportCompta ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="shadow-sm">
                    <Download className="mr-2 size-4" />
                    Exporter
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel>Transmission expertise comptable</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={exportCsv}>
                    <FileText className="mr-2 size-4" /> CSV — import comptable
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportPdf}>
                    <FileText className="mr-2 size-4" /> PDF — rapport signé
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Pill tone="neutral">Export comptable réservé à la direction</Pill>
            )}
          </div>
        }
      />

      {error ? (
        <Card className="border-destructive/40">
          <CardContent className="flex flex-wrap items-center gap-3 p-5 text-sm">
            <AlertTriangle className="size-5 shrink-0 text-destructive" />
            <span className="min-w-0 flex-1">Le service d'audit est injoignable ({error}).</span>
            <Button variant="outline" size="sm" onClick={() => setReloadKey((k) => k + 1)}>
              <RefreshCw className="mr-2 size-4" /> Réessayer
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Tabs defaultValue="fraude" className="gap-5">
        <TabsList>
          <TabsTrigger value="fraude" className="gap-1.5">
            <ShieldAlert className="size-4" />
            Cas de fraude
          </TabsTrigger>
          <TabsTrigger value="journal" className="gap-1.5">
            <History className="size-4" />
            Journal d'audit
          </TabsTrigger>
          <TabsTrigger value="demo" className="gap-1.5">
            <Sparkles className="size-4" />
            Scénarios démo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fraude" className="space-y-6">
          {/* A. Vue d'ensemble du modèle */}
          <section aria-labelledby="fraud-model-overview" className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="fraud-model-overview" className="text-lg font-bold tracking-tight">
                  Vue d'ensemble du modèle
                </h2>
                <p className="text-sm text-muted-foreground">
                  Indicateurs issus des APIs audit et clustering — aucune valeur inventée.
                </p>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-2">
                <SlidersHorizontal className="size-4 text-muted-foreground" />
                <div className="min-w-[160px]">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs text-muted-foreground">Seuil d'alerte</span>
                    <span className="text-sm font-bold tabular-nums">{seuil}%</span>
                  </div>
                  <Slider
                    value={[seuil]}
                    min={30}
                    max={95}
                    step={5}
                    onValueChange={(v) => {
                      setSeuil(v[0] ?? RISK_THRESHOLDS.eleve);
                      setPage(1);
                    }}
                    aria-label="Seuil de sensibilité de l'IA"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
              <OverviewStat
                icon={<Activity className="size-5" />}
                label="Statut du modèle"
                value={modelStatusLabel}
                hint={fraudModel?.model_version ? `v. ${fraudModel.model_version}` : "Version N/A"}
                loading={fraudLoading}
                tone={fraudError ? "destructive" : "primary"}
              />
              <OverviewStat
                icon={<CalendarDays className="size-5" />}
                label="Dernière analyse"
                value={formatDateTimeFr(fraudModel?.generated_at)}
                hint="Horodatage clustering"
                loading={fraudLoading}
              />
              <OverviewStat
                icon={<ShieldCheck className="size-5" />}
                label="Dossiers analysés"
                value={
                  recordsAnalyzed === null
                    ? "—"
                    : recordsAnalyzed.toLocaleString("fr-MA")
                }
                hint={
                  kpis.dossiersAnalysesDelta !== 0
                    ? `${kpis.dossiersAnalysesDelta >= 0 ? "+" : ""}${kpis.dossiersAnalysesDelta}% vs période préc.`
                    : "Source API"
                }
                loading={isLoading && fraudLoading}
              />
              <OverviewStat
                icon={<ShieldAlert className="size-5" />}
                label="Anomalies détectées"
                value={
                  anomaliesDetected === null
                    ? "—"
                    : anomaliesDetected.toLocaleString("fr-MA")
                }
                hint={`${filtered.length} au-dessus du seuil`}
                loading={isLoading && fraudLoading}
                tone="destructive"
              />
              <OverviewStat
                icon={<Gauge className="size-5" />}
                label="Confiance modèle"
                value="N/A"
                hint="Champ non fourni par l'API"
                loading={false}
              />
              <Card>
                <CardContent className="space-y-3 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Distribution du risque
                  </p>
                  {isLoading ? (
                    <Skeleton className="h-16 w-full" />
                  ) : anomalies.length === 0 ? (
                    <p className="text-sm text-muted-foreground">—</p>
                  ) : (
                    <div className="space-y-1.5">
                      {(Object.keys(RISK_VISUAL) as BusinessRiskLevel[]).map((key) => {
                        const total = anomalies.length || 1;
                        const count = riskDistribution[key];
                        const pct = Math.round((count / total) * 100);
                        return (
                          <div key={key} className="flex items-center gap-2 text-xs">
                            <span className="w-14 shrink-0 font-medium">
                              {RISK_VISUAL[key].label}
                            </span>
                            <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                              <div
                                className={`h-full rounded-full ${RISK_VISUAL[key].barClass}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="w-10 shrink-0 text-right tabular-nums text-muted-foreground">
                              {count}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {fraudError ? (
              <p className="text-xs text-muted-foreground">
                Clustering indisponible ({fraudError}) — les KPIs d'audit restent affichés lorsqu'ils
                sont disponibles.
              </p>
            ) : null}
          </section>

          <FraudDashboard sensitivity={seuil} />

          {/* B. Table des cas de fraude */}
          <Card>
            <CardHeader className="flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="text-base">Cas de fraude</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Cliquez une ligne pour ouvrir le détail structuré du dossier.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:flex-row">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setPage(1);
                    }}
                    aria-label="Rechercher un dossier, un patient ou un acte"
                    placeholder="Patient, réf. ou acte…"
                    className="pl-9 lg:w-52"
                  />
                </div>
                <Select
                  value={niveau}
                  onValueChange={(v) => {
                    setNiveau(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="lg:w-40">
                    <SelectValue placeholder="Niveau de risque" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Tous les risques</SelectItem>
                    <SelectItem value="critique">Critique</SelectItem>
                    <SelectItem value="eleve">Élevé</SelectItem>
                    <SelectItem value="moyen">Moyen</SelectItem>
                    <SelectItem value="faible">Faible</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={examen}
                  onValueChange={(v) => {
                    setExamen(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="lg:w-40">
                    <SelectValue placeholder="Type d'examen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Tous les examens</SelectItem>
                    {typesExamen.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={periode}
                  onValueChange={(v) => {
                    setPeriode(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="lg:w-36">
                    <CalendarDays className="mr-1 size-4 text-muted-foreground" />
                    <SelectValue placeholder="Période" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 derniers jours</SelectItem>
                    <SelectItem value="30">30 derniers jours</SelectItem>
                    <SelectItem value="90">90 derniers jours</SelectItem>
                    <SelectItem value="all">Tout l'historique</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>

            <CardContent className="px-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">Patient</TableHead>
                      <TableHead>Réf. patient</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Examen</TableHead>
                      <TableHead className="text-right">Montant</TableHead>
                      <TableHead>Paiement</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Niveau</TableHead>
                      <TableHead>Motif</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="pr-6 text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={11} className="p-4">
                            <Skeleton className="h-10 w-full" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <>
                        {rows.map((a) => (
                          <TableRow
                            key={a.id}
                            className={`cursor-pointer ${a.statut !== "pending" ? "opacity-70" : ""}`}
                            onClick={() => setDetail(a)}
                          >
                            <TableCell className="pl-6">
                              <p className="text-sm font-medium">{displayOrDash(a.patient)}</p>
                              <p className="font-mono text-[11px] text-muted-foreground">{a.id}</p>
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {displayOrDash(a.cin)}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-sm">
                              {formatDateFr(a.date)}
                            </TableCell>
                            <TableCell>
                              <p className="text-sm">{displayOrDash(a.acte)}</p>
                              <p className="text-xs text-muted-foreground">{a.typeExamen}</p>
                            </TableCell>
                            <TableCell className="text-right">
                              <p className="text-sm font-semibold tabular-nums">
                                {formatMAD(a.montant)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                barème {formatMAD(a.bareme)}
                              </p>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs text-muted-foreground">
                                {paymentStatusLabel(a)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <ScoreMeter score={a.score} />
                            </TableCell>
                            <TableCell>
                              <RiskLevelBadge score={a.score} />
                            </TableCell>
                            <TableCell className="max-w-[220px]">
                              <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                                {humanizeMotifs(a.motifs)}
                              </p>
                            </TableCell>
                            <TableCell>
                              <Pill tone={statutTone(a.statut)}>{statutLabel(a.statut)}</Pill>
                            </TableCell>
                            <TableCell className="pr-6" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                {profile.canValiderAnomalie ? (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      disabled={a.statut === "confirmed"}
                                      onClick={() => setStatut(a.id, "confirmed")}
                                    >
                                      <ShieldAlert className="mr-1 size-3.5 text-destructive" />
                                      Confirmer
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      disabled={a.statut === "dismissed"}
                                      onClick={() => setStatut(a.id, "dismissed")}
                                    >
                                      <Ban className="mr-1 size-3.5" />
                                      Conforme
                                    </Button>
                                  </>
                                ) : null}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={`Télécharger le PDF ${a.id}`}
                                  onClick={() => void telechargerDossierPdf(dossierAnomalie(a))}
                                >
                                  <FileDown className="size-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {rows.length === 0 ? (
                          <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={11} className="p-0">
                              <EmptyState
                                icon={hasActiveFilters ? SearchX : ShieldCheck}
                                title={
                                  hasActiveFilters
                                    ? "Aucun dossier ne correspond aux filtres"
                                    : "Aucune donnée disponible"
                                }
                                description={
                                  hasActiveFilters
                                    ? `Aucun dossier au-dessus de ${seuil} % avec ces critères.`
                                    : `Le moteur ne signale aucun dossier au-delà de ${seuil} % de risque.`
                                }
                                action={
                                  hasActiveFilters ? (
                                    <Button variant="outline" size="sm" onClick={resetFilters}>
                                      Réinitialiser les filtres
                                    </Button>
                                  ) : null
                                }
                              />
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-6 pt-4 sm:flex-row">
                <p className="text-sm text-muted-foreground">
                  {filtered.length} dossier(s) · page {current} / {pageCount}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={current === 1}
                    onClick={() => setPage(current - 1)}
                  >
                    <ChevronLeft className="mr-1 size-4" /> Précédent
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={current === pageCount}
                    onClick={() => setPage(current + 1)}
                  >
                    Suivant <ChevronRight className="ml-1 size-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="journal">
          <AuditTrailPanel />
        </TabsContent>

        <TabsContent value="demo">
          <AuditDemoPanel
            canManage={profile.canValiderAnomalie}
            onLoaded={() => setReloadKey((k) => k + 1)}
          />
        </TabsContent>
      </Tabs>

      {/* C. Détail du cas */}
      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle className="pr-8">Dossier {detail?.id ?? ""}</SheetTitle>
            <SheetDescription>
              Analyse structurée du cas — sans dump technique brut.
            </SheetDescription>
          </SheetHeader>

          {detail ? (
            <div className="mt-6 space-y-6 text-sm">
              <DetailSection title="Patient">
                <DetailGrid>
                  <Field label="Nom" value={displayOrDash(detail.patient)} />
                  <Field label="Référence (CIN)" value={displayOrDash(detail.cin)} />
                  <Field label="Mutuelle" value={displayOrDash(detail.mutuelle)} />
                  <Field label="Prescripteur" value={displayOrDash(detail.prescripteur)} />
                </DetailGrid>
              </DetailSection>

              <DetailSection title="Examen">
                <DetailGrid>
                  <Field label="Acte" value={displayOrDash(detail.acte)} />
                  <Field label="Type" value={displayOrDash(detail.typeExamen)} />
                  <Field label="Date" value={formatDateFr(detail.date)} />
                  <Field label="Groupe modèle" value={displayOrDash(detail.cluster)} />
                </DetailGrid>
              </DetailSection>

              <DetailSection title="Financier">
                <DetailGrid>
                  <Field label="Montant facturé" value={formatMAD(detail.montant)} />
                  <Field label="Barème attendu" value={formatMAD(detail.bareme)} />
                  <Field
                    label="Écart / reste estimé"
                    value={formatMAD(detail.montant - detail.bareme)}
                  />
                  <Field label="Statut de paiement" value={paymentStatusLabel(detail)} />
                </DetailGrid>
                <p className="mt-2 text-xs text-muted-foreground">
                  Les montants « payé » / « reste à charge » ne sont pas fournis par l'API anomalies —
                  l'écart affiché compare facturé et barème.
                </p>
              </DetailSection>

              <DetailSection title="Anomalie détectée">
                <div className="flex flex-wrap gap-1.5">
                  {detail.motifs.map((m) => (
                    <Pill key={m} tone={RISK_VISUAL[businessRiskLevel(detail.score)].tone}>
                      {m}
                    </Pill>
                  ))}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {humanizeMotifs(detail.motifs)}
                </p>
              </DetailSection>

              <DetailSection title="Score de risque">
                <div className="flex flex-wrap items-center gap-3">
                  <ScoreMeter score={detail.score} />
                  <RiskLevelBadge score={detail.score} />
                  <Pill tone={statutTone(detail.statut)}>{statutLabel(detail.statut)}</Pill>
                </div>
              </DetailSection>

              <DetailSection title="Explication du modèle">
                <p className="rounded-lg bg-muted/60 p-3 text-sm leading-relaxed text-muted-foreground">
                  {modelExplanation(detail)}
                </p>
              </DetailSection>

              <DetailSection title="Événements liés / historique">
                {relatedLoading ? (
                  <Skeleton className="h-20 w-full" />
                ) : relatedEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Aucun événement d'audit lié à ce dossier pour le moment.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {relatedEvents.map((ev) => (
                      <li
                        key={ev.id}
                        className="rounded-lg border border-border px-3 py-2 text-xs"
                      >
                        <p className="font-medium">{ev.action}</p>
                        <p className="mt-0.5 text-muted-foreground">
                          {ev.createdAt ? formatCentreDateTime(ev.createdAt) : "—"}
                          {ev.userEmail || ev.userId
                            ? ` · ${ev.userEmail ?? ev.userId}`
                            : ""}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </DetailSection>

              <Separator />

              <div className="flex flex-wrap gap-2">
                {profile.canValiderAnomalie ? (
                  <>
                    <Button
                      variant="outline"
                      disabled={detail.statut === "confirmed"}
                      onClick={() => setStatut(detail.id, "confirmed")}
                    >
                      <ShieldAlert className="mr-2 size-4 text-destructive" />
                      Confirmer la fraude
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={detail.statut === "dismissed"}
                      onClick={() => setStatut(detail.id, "dismissed")}
                    >
                      <Ban className="mr-2 size-4" />
                      Classer conforme
                    </Button>
                  </>
                ) : null}
                <Button
                  variant="secondary"
                  onClick={() => void telechargerDossierPdf(dossierAnomalie(detail))}
                >
                  <FileDown className="mr-2 size-4" />
                  Télécharger PDF
                </Button>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function OverviewStat({
  icon,
  label,
  value,
  hint,
  loading,
  tone = "primary",
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
  loading?: boolean;
  tone?: "primary" | "destructive";
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <IconTile tone={tone}>{icon}</IconTile>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          {loading ? (
            <Skeleton className="mt-2 h-6 w-20" />
          ) : (
            <p className="mt-1 truncate text-lg font-bold tracking-tight">{value}</p>
          )}
          {hint ? <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

function DetailGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-medium">{value}</p>
    </div>
  );
}
