import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, MapPin, RefreshCw, Search, Send, UserRoundPlus } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { EmptyState, PageHeader, Pill } from "@/components/ui-kit";
import { fetchMedecins, saveReferent, sendReportToReferent } from "@/lib/api/referents";
import { toast } from "sonner";
import type { Referent } from "@/types/referent";

export const Route = createFileRoute("/medecins-referents")({
  head: () => ({
    meta: [
      { title: "Médecins correspondants — Répertoire RadioCRM" },
      {
        name: "description",
        content:
          "Répertoire des médecins correspondants du Centre d'Imagerie Médicale : spécialité, téléphone, email, ville (Rabat, Témara), quartier et adresse.",
      },
      { property: "og:title", content: "Médecins correspondants — Répertoire RadioCRM" },
      {
        property: "og:description",
        content:
          "Recherche par nom et filtres par ville et spécialité sur la base des médecins correspondants.",
      },
    ],
  }),
  component: MedecinsReferentsPage,
});

function MedecinsReferentsPage() {
  /* Gestion d'état asynchrone réelle : isLoading / data / error. */
  const [medecins, setMedecins] = useState<Referent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [query, setQuery] = useState("");
  const [ville, setVille] = useState("toutes");
  const [specialite, setSpecialite] = useState("toutes");
  const [createOpen, setCreateOpen] = useState(false);
  const [newNom, setNewNom] = useState("");
  const [newSpecialite, setNewSpecialite] = useState("");
  const [newTelephone, setNewTelephone] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    fetchMedecins(controller.signal)
      .then((rows) => {
        if (!controller.signal.aborted) setMedecins(rows);
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        setError(e instanceof Error ? e.message : "Répertoire indisponible");
        setMedecins([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [reloadKey]);

  const villes = useMemo(
    () =>
      Array.from(new Set(medecins.map((m) => m.ville))).sort((a, b) => a.localeCompare(b, "fr")),
    [medecins],
  );
  const specialites = useMemo(
    () =>
      Array.from(new Set(medecins.map((m) => m.specialite))).sort((a, b) =>
        a.localeCompare(b, "fr"),
      ),
    [medecins],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return medecins.filter(
      (m) =>
        (!q || m.nom.toLowerCase().includes(q)) &&
        (ville === "toutes" || m.ville === ville) &&
        (specialite === "toutes" || m.specialite === specialite),
    );
  }, [medecins, query, ville, specialite]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Médecins"
        title="Correspondants"
        subtitle={`${rows.length} médecin(s) affiché(s) sur ${medecins.length}`}
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <UserRoundPlus className="mr-2 size-4" /> Ajouter un médecin
          </Button>
        }
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau correspondant</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nom</Label>
              <Input value={newNom} onChange={(e) => setNewNom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Spécialité</Label>
              <Input
                value={newSpecialite}
                onChange={(e) => setNewSpecialite(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Téléphone</Label>
              <Input
                value={newTelephone}
                onChange={(e) => setNewTelephone(e.target.value)}
              />
            </div>
            <Button
              disabled={creating || !newNom.trim()}
              onClick={() => {
                setCreating(true);
                void saveReferent({
                  nom: newNom.trim(),
                  specialite: newSpecialite.trim(),
                  telephone: newTelephone.trim(),
                  email: "",
                  adresse: "",
                  ville: "",
                  quartier: "",
                })
                  .then(() => {
                    toast.success("Correspondant enregistré");
                    setCreateOpen(false);
                    setNewNom("");
                    setNewSpecialite("");
                    setNewTelephone("");
                    setReloadKey((k) => k + 1);
                  })
                  .catch((e: unknown) =>
                    toast.error(e instanceof Error ? e.message : "Enregistrement impossible"),
                  )
                  .finally(() => setCreating(false));
              }}
            >
              Enregistrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_13rem_13rem]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Rechercher un médecin par nom"
              placeholder="Rechercher un médecin par nom…"
              className="pl-9"
            />
          </div>
          <Select value={ville} onValueChange={setVille}>
            <SelectTrigger aria-label="Filtrer par ville">
              <SelectValue placeholder="Ville" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="toutes">Toutes les villes</SelectItem>
              {villes.map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={specialite} onValueChange={setSpecialite}>
            <SelectTrigger aria-label="Filtrer par spécialité">
              <SelectValue placeholder="Spécialité" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="toutes">Toutes les spécialités</SelectItem>
              {specialites.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card data-tour="referents">
        <CardContent className="px-0 py-0">
          {error ? (
            <div className="px-6 py-8">
              <EmptyState
                icon={MapPin}
                title="Impossible de charger le répertoire"
                description={error}
                action={
                  <Button variant="outline" size="sm" onClick={() => setReloadKey((k) => k + 1)}>
                    <RefreshCw className="mr-2 size-4" /> Réessayer
                  </Button>
                }
              />
            </div>
          ) : isLoading ? (
            <p className="flex items-center gap-2 px-6 py-8 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Chargement du répertoire des médecins…
            </p>
          ) : rows.length === 0 ? (
            <div className="px-6 py-8">
              <EmptyState
                icon={Search}
                title="Aucun médecin trouvé"
                description="Ajustez la recherche par nom, la ville ou la spécialité."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom du médecin</TableHead>
                    <TableHead>Spécialité</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Ville</TableHead>
                    <TableHead>Quartier</TableHead>
                    <TableHead>Adresse</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="whitespace-nowrap text-sm font-semibold">
                        {m.nom}
                      </TableCell>
                      <TableCell>
                        <Pill tone="primary">{m.specialite}</Pill>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm tabular-nums">
                        {m.telephone}
                      </TableCell>
                      <TableCell className="text-sm">
                        {m.email ? (
                          <a href={`mailto:${m.email}`} className="hover:text-primary">
                            {m.email}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{m.ville}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {m.quartier}
                      </TableCell>
                      <TableCell className="min-w-56 text-sm text-muted-foreground">
                        {m.adresse}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="size-8 p-0"
                          aria-label={`Envoyer les comptes rendus à ${m.nom}`}
                          onClick={() => {
                            void sendReportToReferent(m.id)
                              .then(() => toast.success(`Comptes rendus transmis à ${m.nom}`))
                              .catch(() => toast.error("Envoi impossible"));
                          }}
                        >
                          <Send className="size-4" />
                          <span className="sr-only">Envoyer les comptes rendus</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Button
        variant="ghost"
        size="sm"
        disabled={isLoading}
        onClick={() => setReloadKey((k) => k + 1)}
      >
        <RefreshCw className="mr-2 size-4" /> Recharger depuis l&apos;API du centre
      </Button>
    </div>
  );
}
