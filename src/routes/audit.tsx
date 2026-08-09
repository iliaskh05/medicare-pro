import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Ban,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  Gauge,
  ShieldAlert,
  ShieldCheck,
  Search,
  SlidersHorizontal,
  Stethoscope,
  TrendingUp,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { PageHeader, Pill, IconTile } from "@/components/ui-kit";
import { formatMAD } from "@/data/mock";
import {
  anomalies as anomaliesSeed,
  auditKpis,
  tendanceAnomalies,
  typesExamen,
  type Anomalie,
  type StatutAnomalie,
} from "@/data/mock-audit";

export const Route = createFileRoute("/audit")({
  head: () => ({
    meta: [
      { title: "Audit & Conformité — Détection d'anomalies | RadioCRM" },
      {
        name: "description",
        content:
          "Détection d'anomalies de facturation par clustering : scores de risque, motifs suspects, validation humaine et export vers l'expertise comptable (EFIBEC).",
      },
      {
        property: "og:title",
        content: "Audit & Conformité — Détection d'anomalies | RadioCRM",
      },
      {
        property: "og:description",
        content:
          "Tableau de bord de conformité pour centre d'imagerie : scores IA, filtres par risque et export CSV/PDF.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuditPage,
});

const PAGE_SIZE = 6;

const riskTone = (s: number) =>
  s >= 80 ? "destructive" : s >= 60 ? "warning" : s >= 40 ? "primary" : "success";
const riskLabel = (s: number) =>
  s >= 80 ? "Critique" : s >= 60 ? "Élevé" : s >= 40 ? "Modéré" : "Faible";

const riskBarClass: Record<string, string> = {
  destructive: "bg-destructive",
  warning: "bg-warning",
  primary: "bg-primary",
  success: "bg-success",
};

const periodDays: Record<string, number> = { "7": 7, "30": 30, "90": 90, all: 9999 };

function ScoreMeter({ score }: { score: number }) {
  const tone = riskTone(score);
  return (
    <div className="flex items-center gap-3">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${riskBarClass[tone]}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <Pill tone={tone as never}>
        {score}% · {riskLabel(score)}
      </Pill>
    </div>
  );
}

function AuditPage() {
  const [rowsState, setRowsState] = useState<Anomalie[]>(anomaliesSeed);
  const [seuil, setSeuil] = useState(60);
  const [query, setQuery] = useState("");
  const [niveau, setNiveau] = useState("tous");
  const [examen, setExamen] = useState("tous");
  const [periode, setPeriode] = useState("30");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<Anomalie | null>(null);

  const now = new Date("2026-08-09T00:00:00Z").getTime();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const maxAge = (periodDays[periode] ?? 30) * 86_400_000;
    return rowsState.filter((a) => {
      if (a.score < seuil) return false;
      if (now - new Date(a.date).getTime() > maxAge) return false;
      if (examen !== "tous" && a.typeExamen !== examen) return false;
      if (niveau === "critique" && a.score < 80) return false;
      if (niveau === "eleve" && (a.score < 60 || a.score >= 80)) return false;
      if (niveau === "modere" && a.score >= 60) return false;
      if (
        q &&
        !a.patient.toLowerCase().includes(q) &&
        !a.id.toLowerCase().includes(q) &&
        !a.acte.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [rowsState, seuil, niveau, examen, periode, query, now]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const enAttente = rowsState.filter((a) => a.statut === "pending" && a.score >= seuil).length;
  const confirmees = rowsState.filter((a) => a.statut === "confirmed");
  const montantEnJeu = filtered.reduce((s, a) => s + (a.montant - a.bareme), 0);

  const setStatut = (id: string, statut: StatutAnomalie) => {
    setRowsState((prev) => prev.map((a) => (a.id === id ? { ...a, statut } : a)));
    if (statut === "confirmed") {
      toast.success(`${id} confirmée comme fraude — envoyée au réentraînement supervisé`);
    } else {
      toast(`${id} marquée conforme (faux positif enregistré)`);
    }
  };

  const exportCsv = () => {
    const source = confirmees.length > 0 ? confirmees : filtered;
    const header = [
      "id_dossier",
      "patient",
      "cin",
      "acte",
      "type_examen",
      "date",
      "montant_mad",
      "bareme_mad",
      "ecart_mad",
      "score_risque",
      "motifs",
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
        a.motifs.join(" | "),
        a.cluster,
        a.prescripteur,
        a.mutuelle,
        a.statut,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(";"),
    );
    const csv = `${header.join(";")}\n${lines.join("\n")}`;
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `efibec_fraudes_validees_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Export CSV EFIBEC généré — ${source.length} dossier(s)`);
  };

  const exportPdf = () => {
    toast.success(
      `Dossier PDF préparé pour le cabinet comptable — ${(confirmees.length || filtered.length)} anomalie(s)`,
    );
    setTimeout(() => window.print(), 250);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit & Conformité — Détection d'anomalies"
        subtitle="Clustering non supervisé + validation humaine · Centre d'Imagerie Médicale Al Manar, Casablanca"
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Download className="mr-2 size-4" />
                Exporter les fraudes validées
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Transmission expertise comptable</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={exportCsv}>
                <FileText className="mr-2 size-4" /> CSV — import EFIBEC
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportPdf}>
                <FileText className="mr-2 size-4" /> PDF — rapport signé
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-none">
          <CardContent className="flex items-start gap-4 p-5">
            <IconTile tone="primary">
              <ShieldCheck className="size-5" />
            </IconTile>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Dossiers analysés (30 j)
              </p>
              <p className="mt-1 text-2xl font-bold tracking-tight">
                {auditKpis.dossiersAnalyses.toLocaleString("fr-MA")}
              </p>
              <p className="mt-1 text-xs text-success">
                +{auditKpis.dossiersAnalysesDelta}% vs période précédente
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none ring-1 ring-inset ring-destructive/20">
          <CardContent className="flex items-start gap-4 p-5">
            <IconTile tone="destructive">
              <ShieldAlert className="size-5" />
            </IconTile>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Alertes en attente
              </p>
              <p className="mt-1 flex items-center gap-2 text-2xl font-bold tracking-tight text-destructive">
                {enAttente}
                <span className="relative flex size-2.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive/60" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-destructive" />
                </span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatMAD(Math.max(0, montantEnJeu))} d'écart au barème
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardContent className="flex items-start gap-4 p-5">
            <IconTile tone="success">
              <Gauge className="size-5" />
            </IconTile>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Taux de conformité
              </p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-success">
                {auditKpis.tauxConformite}%
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                +{auditKpis.tauxConformiteDelta} pt sur 30 jours
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-none lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="size-4 text-primary" /> Anomalies détectées par semaine
            </CardTitle>
            <p className="text-xs text-muted-foreground">8 dernières semaines</p>
          </CardHeader>
          <CardContent className="h-[180px] pr-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={tendanceAnomalies} margin={{ top: 5, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="semaine"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                />
                <ReTooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="anomalies"
                  name="Anomalies"
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="confirmees"
                  name="Confirmées"
                  stroke="var(--destructive)"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <SlidersHorizontal className="size-4 text-primary" /> Sensibilité de l'IA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-baseline justify-between">
              <p className="text-sm text-muted-foreground">Seuil d'alerte</p>
              <p className="text-2xl font-bold tracking-tight">{seuil}%</p>
            </div>
            <Slider
              value={[seuil]}
              min={30}
              max={95}
              step={5}
              onValueChange={(v) => {
                setSeuil(v[0] ?? 60);
                setPage(1);
              }}
              aria-label="Seuil de sensibilité de l'IA"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Large (30%)</span>
              <span>Strict (95%)</span>
            </div>
            <Separator />
            <p className="text-xs text-muted-foreground">
              {filtered.length} dossier(s) au-dessus du seuil · {confirmees.length} fraude(s)
              confirmée(s) prête(s) à l'export.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-none">
        <CardHeader className="flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <CardTitle className="text-base">Dossiers signalés</CardTitle>
          <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:flex-row">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Dossier, patient ou acte…"
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
                <SelectItem value="critique">Critique (≥ 80)</SelectItem>
                <SelectItem value="eleve">Élevé (60–79)</SelectItem>
                <SelectItem value="modere">Modéré (&lt; 60)</SelectItem>
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
                  <TableHead className="pl-6">Dossier & patient</TableHead>
                  <TableHead>Acte & date</TableHead>
                  <TableHead className="text-right">Montant facturé</TableHead>
                  <TableHead>Score de risque</TableHead>
                  <TableHead>Motif suspect</TableHead>
                  <TableHead className="pr-6 text-right">Décision</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((a) => (
                  <TableRow key={a.id} className={a.statut !== "pending" ? "opacity-60" : ""}>
                    <TableCell className="pl-6">
                      <p className="font-mono text-xs font-semibold">{a.id}</p>
                      <p className="text-sm font-medium">{a.patient}</p>
                      <p className="text-xs text-muted-foreground">CIN {a.cin}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{a.acte}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.typeExamen} ·{" "}
                        {new Date(a.date).toLocaleDateString("fr-MA", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </TableCell>
                    <TableCell className="text-right">
                      <p className="text-sm font-semibold">{formatMAD(a.montant)}</p>
                      <p className="text-xs text-muted-foreground">
                        barème {formatMAD(a.bareme)}
                      </p>
                    </TableCell>
                    <TableCell>
                      <ScoreMeter score={a.score} />
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <div className="flex flex-wrap gap-1.5">
                        {a.motifs.map((m) => (
                          <Pill key={m} tone={a.score >= 80 ? "destructive" : "warning"}>
                            {m}
                          </Pill>
                        ))}
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">{a.cluster}</p>
                    </TableCell>
                    <TableCell className="pr-6">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={a.statut === "confirmed"}
                          onClick={() => setStatut(a.id, "confirmed")}
                        >
                          <ShieldAlert className="mr-1.5 size-4 text-destructive" />
                          Valider l'anomalie
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={a.statut === "dismissed"}
                          onClick={() => setStatut(a.id, "dismissed")}
                        >
                          <Ban className="mr-1.5 size-4" />
                          Normal
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Ouvrir le dossier complet ${a.id}`}
                          onClick={() => setDetail(a)}
                        >
                          <ExternalLink className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                      Aucune anomalie au-dessus de {seuil}% pour ces filtres.
                    </TableCell>
                  </TableRow>
                ) : null}
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

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Stethoscope className="size-4 text-primary" />
              Dossier {detail?.id}
            </DialogTitle>
            <DialogDescription>
              Vue consolidée de l'acte, du prescripteur et des signaux du modèle.
            </DialogDescription>
          </DialogHeader>
          {detail ? (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Patient" value={`${detail.patient} · CIN ${detail.cin}`} />
                <Field label="Mutuelle" value={detail.mutuelle} />
                <Field label="Acte" value={detail.acte} />
                <Field label="Prescripteur" value={detail.prescripteur} />
                <Field label="Montant facturé" value={formatMAD(detail.montant)} />
                <Field label="Barème conventionné" value={formatMAD(detail.bareme)} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Score de risque</span>
                <ScoreMeter score={detail.score} />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {detail.motifs.map((m) => (
                  <Pill key={m} tone="warning">
                    {m}
                  </Pill>
                ))}
              </div>
              <p className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
                Groupe détecté : <strong>{detail.cluster}</strong>. Écart au barème de{" "}
                {formatMAD(detail.montant - detail.bareme)}. Toute décision est journalisée et
                alimente le réentraînement du modèle supervisé.
              </p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-medium">{value}</p>
    </div>
  );
}
