import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Users,
  Wallet,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ArrowRight,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader, Pill, IconTile } from "@/components/ui-kit";
import { actesParSemaine, alertes, salleAttente, formatMAD } from "@/data/mock";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tableau de bord — RadioCRM Centre Al Amal" },
      {
        name: "description",
        content:
          "Activité du jour du centre de radiologie : patients, chiffre d'affaires en MAD, examens en attente et alertes de facturation.",
      },
      { property: "og:title", content: "Tableau de bord — RadioCRM Centre Al Amal" },
      {
        property: "og:description",
        content: "Suivi temps réel des actes, recettes et alertes du centre de radiologie.",
      },
    ],
  }),
  component: Dashboard,
});

const kpis = [
  {
    label: "Patients du jour",
    value: "38",
    hint: "+6 vs hier",
    positive: true,
    icon: Users,
    tone: "primary" as const,
  },
  {
    label: "Chiffre d'affaires mensuel",
    value: formatMAD(742500),
    hint: "+12,4 % vs juillet",
    positive: true,
    icon: Wallet,
    tone: "success" as const,
  },
  {
    label: "Examens en attente",
    value: "14",
    hint: "3 depuis plus de 45 min",
    positive: false,
    icon: Clock,
    tone: "warning" as const,
  },
  {
    label: "Alertes de facturation",
    value: "5",
    hint: "2 critiques à traiter",
    positive: false,
    icon: AlertTriangle,
    tone: "destructive" as const,
  },
];

const statutTone = {
  "En cours": "primary",
  Préparation: "warning",
  "En attente": "neutral",
} as const;

const niveauTone = { critique: "destructive", eleve: "warning", moyen: "neutral" } as const;
const niveauLabel = { critique: "Critique", eleve: "Élevé", moyen: "Moyen" } as const;

function Dashboard() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Tableau de bord"
        subtitle="Mercredi 5 août 2026 · Centre d'imagerie Al Amal, Casablanca"
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/patients">Salle d'attente</Link>
            </Button>
            <Button asChild>
              <Link to="/facturation">Nouvel acte</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="shadow-none">
            <CardContent className="flex items-start gap-4 p-5">
              <IconTile tone={kpi.tone}>
                <kpi.icon className="size-5" />
              </IconTile>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {kpi.label}
                </p>
                <p className="mt-1 truncate text-2xl font-bold tracking-tight">{kpi.value}</p>
                <p
                  className={`mt-1 flex items-center gap-1 text-xs font-medium ${
                    kpi.positive ? "text-success" : "text-warning-foreground"
                  }`}
                >
                  {kpi.positive ? (
                    <TrendingUp className="size-3.5" />
                  ) : (
                    <TrendingDown className="size-3.5" />
                  )}
                  {kpi.hint}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-none">
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Répartition des actes par semaine</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              IRM, Scanner, Échographie et Radiologie standard — 6 dernières semaines
            </p>
          </div>
        </CardHeader>
        <CardContent className="h-[340px] pl-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={actesParSemaine} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="semaine"
                tickLine={false}
                axisLine={false}
                stroke="var(--muted-foreground)"
                fontSize={12}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                stroke="var(--muted-foreground)"
                fontSize={12}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: "0.625rem",
                  fontSize: 12,
                }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Bar dataKey="IRM" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Scanner" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
              <Bar
                dataKey="Echographie"
                name="Échographie"
                fill="var(--chart-3)"
                radius={[4, 4, 0, 0]}
              />
              <Bar dataKey="Radio" name="Radio standard" fill="var(--chart-4)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="shadow-none lg:col-span-3">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Prochains patients en salle d'attente</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/patients">
                Tout voir <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Heure</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead className="hidden sm:table-cell">Examen</TableHead>
                  <TableHead className="pr-6 text-right">Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salleAttente.map((r) => (
                  <TableRow key={r.heure}>
                    <TableCell className="pl-6 font-mono text-xs">{r.heure}</TableCell>
                    <TableCell>
                      <p className="font-medium">{r.patient}</p>
                      <p className="text-xs text-muted-foreground">{r.medecin}</p>
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                      {r.examen}
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <Pill tone={statutTone[r.statut]}>{r.statut}</Pill>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="shadow-none lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Dernières alertes détectées</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/audit">
                Audit <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {alertes.map((a) => (
              <div
                key={a.id}
                className="rounded-xl border border-border bg-background p-3 transition-colors hover:border-primary/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{a.titre}</p>
                  <Pill tone={niveauTone[a.niveau]}>{niveauLabel[a.niveau]}</Pill>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{a.detail}</p>
                <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                  {a.id} · {a.temps}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
