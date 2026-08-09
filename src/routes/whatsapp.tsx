import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Bot, CheckCircle2, MessageCircle, Search, Star, Timer, UserRound } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { PageHeader, Pill, IconTile } from "@/components/ui-kit";
import { interactionsWhatsApp, volumeWhatsApp, type EtapeChatbot } from "@/data/mock-extra";

export const Route = createFileRoute("/whatsapp")({
  head: () => ({
    meta: [
      { title: "Chatbot WhatsApp patients — RadioCRM" },
      {
        name: "description",
        content:
          "Suivi des interactions du chatbot WhatsApp : étapes du parcours patient, intentions détectées, temps de réponse et satisfaction.",
      },
      { property: "og:title", content: "Chatbot WhatsApp patients — RadioCRM" },
      {
        property: "og:description",
        content: "Tableau de suivi des conversations automatisées avec les patients du centre.",
      },
    ],
  }),
  component: WhatsAppPage,
});

const etapeTone: Record<EtapeChatbot, "primary" | "success" | "warning" | "destructive" | "neutral"> = {
  Accueil: "neutral",
  Qualification: "primary",
  "Rendez-vous": "primary",
  Rappel: "warning",
  Conclu: "success",
  Abandon: "destructive",
};

function WhatsAppPage() {
  const [query, setQuery] = useState("");
  const [etape, setEtape] = useState("toutes");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return interactionsWhatsApp.filter((i) => {
      const matchQ =
        !q ||
        i.patient.toLowerCase().includes(q) ||
        i.telephone.includes(q) ||
        i.intention.toLowerCase().includes(q);
      const matchE = etape === "toutes" || i.etape === etape;
      return matchQ && matchE;
    });
  }, [query, etape]);

  const total = interactionsWhatsApp.length;
  const conclus = interactionsWhatsApp.filter((i) => i.etape === "Conclu").length;
  const escalades = interactionsWhatsApp.filter((i) => i.priseEnCharge === "Secrétariat").length;
  const notes = interactionsWhatsApp.filter((i) => i.satisfaction !== null);
  const satisfaction =
    notes.reduce((s, i) => s + (i.satisfaction ?? 0), 0) / Math.max(1, notes.length);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chatbot WhatsApp patients"
        subtitle="Suivi des conversations automatisées — prise de rendez-vous, rappels et questions mutuelle"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="shadow-none">
          <CardContent className="flex items-start gap-4 p-5">
            <IconTile tone="primary">
              <MessageCircle className="size-5" />
            </IconTile>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Conversations actives
              </p>
              <p className="mt-1 text-2xl font-bold tracking-tight">{total}</p>
              <p className="mt-1 text-xs text-muted-foreground">sur les dernières 24 h</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardContent className="flex items-start gap-4 p-5">
            <IconTile tone="success">
              <CheckCircle2 className="size-5" />
            </IconTile>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Résolues par le bot
              </p>
              <p className="mt-1 text-2xl font-bold tracking-tight">
                {Math.round((conclus / total) * 100)} %
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{conclus} parcours aboutis</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardContent className="flex items-start gap-4 p-5">
            <IconTile tone="warning">
              <UserRound className="size-5" />
            </IconTile>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Transferts secrétariat
              </p>
              <p className="mt-1 text-2xl font-bold tracking-tight">{escalades}</p>
              <p className="mt-1 text-xs text-muted-foreground">à traiter manuellement</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardContent className="flex items-start gap-4 p-5">
            <IconTile tone="neutral">
              <Timer className="size-5" />
            </IconTile>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Satisfaction moyenne
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-2xl font-bold tracking-tight">
                {satisfaction.toFixed(1)}
                <Star className="size-4 fill-warning text-warning" />
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{notes.length} avis patients</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Volume de conversations sur 7 jours</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volumeWhatsApp} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="jour" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} width={32} />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: "0.75rem",
                    fontSize: "0.8rem",
                  }}
                />
                <Bar dataKey="conversations" name="Conversations" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="resolues" name="Résolues par le bot" fill="var(--chart-3)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Interactions récentes</CardTitle>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Patient, numéro, intention…"
                className="pl-9 sm:w-60"
              />
            </div>
            <Select value={etape} onValueChange={setEtape}>
              <SelectTrigger className="sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="toutes">Toutes les étapes</SelectItem>
                {(Object.keys(etapeTone) as EtapeChatbot[]).map((e) => (
                  <SelectItem key={e} value={e}>
                    {e}
                  </SelectItem>
                ))}
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
                  <TableHead className="hidden md:table-cell">Dernier message</TableHead>
                  <TableHead>Intention détectée</TableHead>
                  <TableHead>Étape</TableHead>
                  <TableHead className="hidden sm:table-cell text-center">Msg</TableHead>
                  <TableHead className="hidden lg:table-cell">Réponse moy.</TableHead>
                  <TableHead className="pr-6">Prise en charge</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="pl-6">
                      <p className="font-medium">{i.patient}</p>
                      <p className="text-xs text-muted-foreground">
                        {i.telephone} · {i.maj}
                      </p>
                    </TableCell>
                    <TableCell className="hidden max-w-[16rem] truncate text-sm text-muted-foreground md:table-cell">
                      {i.dernierMessage}
                    </TableCell>
                    <TableCell className="text-sm">{i.intention}</TableCell>
                    <TableCell>
                      <Pill tone={etapeTone[i.etape]}>{i.etape}</Pill>
                    </TableCell>
                    <TableCell className="hidden text-center text-sm tabular-nums sm:table-cell">
                      {i.messages}
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                      {i.reponseMoyenne}
                    </TableCell>
                    <TableCell className="pr-6">
                      <span className="inline-flex items-center gap-1.5 text-sm">
                        {i.priseEnCharge === "Bot" ? (
                          <Bot className="size-4 text-primary" />
                        ) : (
                          <UserRound className="size-4 text-warning" />
                        )}
                        {i.priseEnCharge}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      Aucune conversation pour ce filtre.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
