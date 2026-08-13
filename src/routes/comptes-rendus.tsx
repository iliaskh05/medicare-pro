import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { FileText, Mic, RefreshCw, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
import { CompteRenduBadge } from "@/components/worklist/status-badges";
import { ExamenSheet } from "@/components/worklist/examen-sheet";
import { fetchWorklist, type WorklistItem } from "@/lib/api/worklist";

export const Route = createFileRoute("/comptes-rendus")({
  head: () => ({
    meta: [
      { title: "Comptes rendus — Dictée & signature | RadioCRM" },
      {
        name: "description",
        content:
          "Suivi des comptes rendus radiologiques : à dicter, en rédaction, signés et imprimés, avec éditeur intégré.",
      },
      { property: "og:title", content: "Comptes rendus — Dictée & signature | RadioCRM" },
      {
        property: "og:description",
        content: "Éditeur de comptes rendus et suivi de signature pour le centre d'imagerie.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ComptesRendusPage,
});

function ComptesRendusPage() {
  const [items, setItems] = useState<WorklistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [query, setQuery] = useState("");
  const [statut, setStatut] = useState("tous");
  const [selected, setSelected] = useState<WorklistItem | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);
    fetchWorklist(new Date().toISOString().slice(0, 10), controller.signal)
      .then(setItems)
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        setItems([]);
        setError(e instanceof Error ? e.message : "Service indisponible");
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [reloadKey]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (i) =>
        (!q || i.patient.toLowerCase().includes(q) || i.numSejour.toLowerCase().includes(q)) &&
        (statut === "tous" || i.statutCr === statut),
    );
  }, [items, query, statut]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Comptes rendus"
        subtitle={
          isLoading ? "Chargement…" : `${rows.length} compte(s) rendu(s) — dictée et signature`
        }
        actions={
          <Button variant="outline" onClick={() => setReloadKey((k) => k + 1)}>
            <RefreshCw className="mr-2 size-4" /> Actualiser
          </Button>
        }
      />

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Rechercher un compte rendu"
              placeholder="Rechercher par patient ou n° séjour…"
              className="pl-9"
            />
          </div>
          <Select value={statut} onValueChange={setStatut}>
            <SelectTrigger className="sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tous">Tous les statuts</SelectItem>
              <SelectItem value="a_faire">À dicter</SelectItem>
              <SelectItem value="en_redaction">En rédaction</SelectItem>
              <SelectItem value="signe">Signé</SelectItem>
              <SelectItem value="imprime">Imprimé</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {error ? (
        <ServiceNotice
          message="Comptes rendus en attente de connexion au serveur du centre."
          onRetry={() => setReloadKey((k) => k + 1)}
        />
      ) : null}

      <Card>
        <CardContent className="px-0 py-0" aria-busy={isLoading}>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Patient</TableHead>
                  <TableHead>N° séjour</TableHead>
                  <TableHead>Examen</TableHead>
                  <TableHead className="hidden md:table-cell">Radiologue</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="pr-6 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={`sk-${i}`}>
                        <TableCell colSpan={6} className="px-6">
                          <Skeleton className="h-7 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  : rows.map((i) => (
                      <TableRow key={i.id} className="text-sm">
                        <TableCell className="pl-6 font-medium">{i.patient}</TableCell>
                        <TableCell className="font-mono text-xs">{i.numSejour}</TableCell>
                        <TableCell className="max-w-56 truncate">{i.description}</TableCell>
                        <TableCell className="hidden md:table-cell">{i.medecin}</TableCell>
                        <TableCell>
                          <CompteRenduBadge statut={i.statutCr} />
                        </TableCell>
                        <TableCell className="pr-6 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelected(i);
                              setSheetOpen(true);
                            }}
                          >
                            <Mic className="mr-1.5 size-4" /> Ouvrir
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                {!isLoading && rows.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={6} className="p-0">
                      <EmptyState
                        icon={FileText}
                        title="Aucun compte rendu"
                        description="Aucune donnée disponible pour ces critères."
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
    </div>
  );
}
