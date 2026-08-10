import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  MapPin,
  Phone,
  TrendingUp,
  TrendingDown,
  Search,
  Send,
  UserRoundPlus,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ActionButton } from "@/components/action-button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageHeader, Pill } from "@/components/ui-kit";
import { medecins } from "@/data/mock";

export const Route = createFileRoute("/medecins")({
  head: () => ({
    meta: [
      { title: "Réseau des médecins prescripteurs — RadioCRM" },
      {
        name: "description",
        content:
          "Suivez les médecins prescripteurs du centre de radiologie : spécialité, adresse et patients référés ce mois-ci.",
      },
      { property: "og:title", content: "Réseau des médecins prescripteurs — RadioCRM" },
      {
        property: "og:description",
        content: "Cartographie du réseau de prescripteurs et volume de patients référés.",
      },
    ],
  }),
  component: MedecinsPage,
});

const initials = (nom: string) =>
  nom
    .replace("Dr. ", "")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");

function MedecinsPage() {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const list = medecins.filter(
    (m) => !q || m.nom.toLowerCase().includes(q) || m.specialite.toLowerCase().includes(q),
  );
  const totalReferes = medecins.reduce((s, m) => s + m.referes, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Réseau des médecins prescripteurs"
        subtitle={`${medecins.length} praticiens partenaires · ${totalReferes} patients référés en août`}
        actions={
          <ActionButton
            toastKind="info"
            toastMessage="Module de configuration en cours d'ouverture."
            toastDescription="Ajout d'un prescripteur au réseau du centre."
          >
            <UserRoundPlus className="mr-2 size-4" /> Ajouter un prescripteur
          </ActionButton>
        }
      />

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Rechercher un médecin ou une spécialité"
              placeholder="Rechercher un médecin ou une spécialité…"
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((m) => (
          <Card key={m.id} className="transition-colors hover:border-primary/40">
            <CardHeader className="flex-row items-start gap-3">
              <Avatar className="size-11">
                <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                  {initials(m.nom)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <CardTitle className="truncate text-base">{m.nom}</CardTitle>
                <Pill tone="primary" className="mt-1.5">
                  {m.specialite}
                </Pill>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="mt-0.5 size-4 shrink-0" />
                {m.adresse}
              </p>
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="size-4 shrink-0" />
                {m.telephone}
              </p>
              <div className="flex items-end justify-between rounded-xl border border-border bg-background p-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Patients référés
                  </p>
                  <p className="text-2xl font-bold tracking-tight">{m.referes}</p>
                </div>
                <Pill tone={m.evolution >= 0 ? "success" : "destructive"}>
                  {m.evolution >= 0 ? (
                    <TrendingUp className="size-3.5" />
                  ) : (
                    <TrendingDown className="size-3.5" />
                  )}
                  {m.evolution >= 0 ? "+" : ""}
                  {m.evolution} %
                </Pill>
              </div>
              <ActionButton
                variant="outline"
                className="w-full"
                toastMessage="Compte rendu chiffré et envoyé avec succès."
                toastDescription={`Destinataire : ${m.nom}`}
              >
                <Send className="mr-2 size-4" /> Envoyer les comptes rendus
              </ActionButton>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
