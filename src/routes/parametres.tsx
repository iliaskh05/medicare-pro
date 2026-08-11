import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { BadgeCheck, Bell, History, KeyRound, Moon, ShieldCheck, Sun, UserCog } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState, PageHeader, Pill } from "@/components/ui-kit";
import { useRole } from "@/hooks/use-role";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/parametres")({
  head: () => ({
    meta: [
      { title: "Profil & Paramètres — RadioCRM" },
      {
        name: "description",
        content:
          "Gérez votre compte, vos préférences d'affichage et la sécurité de votre session sur le CRM du Centre d'Imagerie Médicale.",
      },
      { property: "og:title", content: "Profil & Paramètres — RadioCRM" },
      {
        property: "og:description",
        content: "Compte, préférences d'interface et sécurité du poste de travail.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ParametresPage,
});

type PasswordErrors = { actuel?: string; nouveau?: string; confirmation?: string };

function MonCompte() {
  const { profile, user } = useRole();
  const [form, setForm] = useState({ actuel: "", nouveau: "", confirmation: "" });
  const [errors, setErrors] = useState<PasswordErrors>({});

  const submit = () => {
    const next: PasswordErrors = {};
    if (!form.actuel.trim()) next.actuel = "Champ obligatoire";
    if (form.nouveau.trim().length < 8) next.nouveau = "8 caractères minimum";
    if (form.confirmation !== form.nouveau || !form.confirmation)
      next.confirmation = "Les mots de passe ne correspondent pas";
    setErrors(next);
    if (Object.keys(next).length > 0) {
      toast.error("Formulaire incomplet", { description: "Corrigez les champs signalés." });
      return;
    }
    setForm({ actuel: "", nouveau: "", confirmation: "" });
    toast.success("Requête envoyée", {
      description: "La modification sera appliquée après validation par le service informatique.",
    });
  };

  const fieldClass = (error?: string) =>
    cn("mt-1.5", error && "border-destructive focus-visible:ring-destructive/40");

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Identité</CardTitle>
          <CardDescription>Informations issues de l&apos;annuaire du centre.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Avatar className="size-12">
              <AvatarFallback className="bg-primary font-semibold text-primary-foreground">
                {profile.initiales}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-semibold">{profile.nom}</p>
              <p className="truncate text-xs text-muted-foreground">{profile.fonction}</p>
            </div>
          </div>
          <Separator />
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Rôle</span>
              <Pill tone="primary">
                <BadgeCheck className="size-3.5" />
                {user.roleLabel}
              </Pill>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Structure</span>
              <span className="font-medium">Centre d&apos;Imagerie Médicale</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Module fraude IA</span>
              <span className="font-medium">
                {profile.canSeeFraudModule ? "Autorisé" : "Restreint"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mot de passe</CardTitle>
          <CardDescription>
            Minimum 8 caractères. La modification est journalisée dans l&apos;historique de
            sécurité.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="pwd-actuel">Mot de passe actuel *</Label>
              <Input
                id="pwd-actuel"
                type="password"
                autoComplete="current-password"
                aria-invalid={Boolean(errors.actuel)}
                className={fieldClass(errors.actuel)}
                value={form.actuel}
                onChange={(e) => setForm((f) => ({ ...f, actuel: e.target.value }))}
              />
              {errors.actuel ? (
                <p className="mt-1 text-xs font-medium text-destructive">{errors.actuel}</p>
              ) : null}
            </div>
            <div>
              <Label htmlFor="pwd-new">Nouveau mot de passe *</Label>
              <Input
                id="pwd-new"
                type="password"
                autoComplete="new-password"
                aria-invalid={Boolean(errors.nouveau)}
                className={fieldClass(errors.nouveau)}
                value={form.nouveau}
                onChange={(e) => setForm((f) => ({ ...f, nouveau: e.target.value }))}
              />
              {errors.nouveau ? (
                <p className="mt-1 text-xs font-medium text-destructive">{errors.nouveau}</p>
              ) : null}
            </div>
            <div>
              <Label htmlFor="pwd-confirm">Confirmation *</Label>
              <Input
                id="pwd-confirm"
                type="password"
                autoComplete="new-password"
                aria-invalid={Boolean(errors.confirmation)}
                className={fieldClass(errors.confirmation)}
                value={form.confirmation}
                onChange={(e) => setForm((f) => ({ ...f, confirmation: e.target.value }))}
              />
              {errors.confirmation ? (
                <p className="mt-1 text-xs font-medium text-destructive">{errors.confirmation}</p>
              ) : null}
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={submit}>
              <KeyRound className="mr-2 size-4" /> Mettre à jour le mot de passe
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const notificationOptions = [
  {
    id: "alertes-fraude",
    label: "Alertes de conformité",
    description: "Notification lorsqu'une anomalie de facturation est détectée.",
  },
  {
    id: "comptes-rendus",
    label: "Comptes rendus validés",
    description: "Notification à chaque compte rendu signé par un radiologue.",
  },
  {
    id: "messagerie",
    label: "Messagerie interne",
    description: "Aperçu sonore et visuel des nouveaux messages d'équipe.",
  },
] as const;

function Preferences() {
  const { theme, setTheme } = useTheme();
  const [notifications, setNotifications] = useState<Record<string, boolean>>({
    "alertes-fraude": true,
    "comptes-rendus": true,
    messagerie: false,
  });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Apparence</CardTitle>
          <CardDescription>Le thème est mémorisé sur ce poste de travail.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/30 px-4 py-3">
            <div className="flex items-center gap-3">
              {theme === "dark" ? (
                <Moon className="size-5 text-primary" />
              ) : (
                <Sun className="size-5 text-primary" />
              )}
              <div>
                <p className="text-sm font-semibold">Mode sombre</p>
                <p className="text-xs text-muted-foreground">
                  Confort de lecture en salle d&apos;interprétation.
                </p>
              </div>
            </div>
            <Switch
              aria-label="Activer le mode sombre"
              checked={theme === "dark"}
              onCheckedChange={(checked) => {
                setTheme(checked ? "dark" : "light");
                toast.success(checked ? "Mode sombre activé" : "Mode clair activé");
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notifications</CardTitle>
          <CardDescription>Choisissez les événements qui remontent à l&apos;écran.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {notificationOptions.map((option) => (
            <div
              key={option.id}
              className="flex items-start justify-between gap-4 rounded-xl border border-border px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold">{option.label}</p>
                <p className="text-xs text-muted-foreground">{option.description}</p>
              </div>
              <Switch
                aria-label={option.label}
                checked={notifications[option.id] ?? false}
                onCheckedChange={(checked) => {
                  setNotifications((n) => ({ ...n, [option.id]: checked }));
                  toast.success("Préférence enregistrée", { description: option.label });
                }}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Securite() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historique des connexions</CardTitle>
          <CardDescription>
            Journal fourni par le service d&apos;authentification du centre.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={History}
            title="Aucune donnée disponible"
            description="Les connexions apparaîtront ici dès que le service d'authentification sera relié."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Session en cours</CardTitle>
          <CardDescription>Poste local du centre.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2">
            <ShieldCheck className="size-4 text-success" />
            <span className="font-medium">Connexion chiffrée au réseau interne</span>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() =>
              toast.info("Requête envoyée", {
                description: "Déconnexion des autres postes demandée au service informatique.",
              })
            }
          >
            Déconnecter les autres sessions
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function ParametresPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Profil & Paramètres"
        subtitle="Compte, préférences d'affichage et sécurité du poste de travail."
      />

      <Tabs defaultValue="compte" className="space-y-4">
        <TabsList>
          <TabsTrigger value="compte" className="gap-2">
            <UserCog className="size-4" /> Mon compte
          </TabsTrigger>
          <TabsTrigger value="preferences" className="gap-2">
            <Bell className="size-4" /> Préférences
          </TabsTrigger>
          <TabsTrigger value="securite" className="gap-2">
            <ShieldCheck className="size-4" /> Sécurité
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compte">
          <MonCompte />
        </TabsContent>
        <TabsContent value="preferences">
          <Preferences />
        </TabsContent>
        <TabsContent value="securite">
          <Securite />
        </TabsContent>
      </Tabs>
    </div>
  );
}
