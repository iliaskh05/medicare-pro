import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  BadgeCheck,
  Bell,
  Building2,
  History,
  KeyRound,
  Loader2,
  Moon,
  ShieldCheck,
  Sun,
  UserCog,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState, PageHeader, Pill } from "@/components/ui-kit";
import { WriteGuard } from "@/components/permission-guard";
import { useRole } from "@/hooks/use-role";
import { useTheme } from "@/hooks/use-theme";
import { fetchMyPreferences, saveMyPreference } from "@/lib/api/preferences";
import { fetchSettings, saveSettings } from "@/lib/api/settings";
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
    toast.error("Changement de mot de passe indisponible", {
      description:
        "Utilisez « Mot de passe oublié » sur l'écran de connexion. Aucune API de changement en session n'est exposée.",
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
  const [density, setDensity] = useState("comfortable");
  const [refreshSec, setRefreshSec] = useState("30");
  const [loadingPrefs, setLoadingPrefs] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    void fetchMyPreferences(controller.signal)
      .then((all) => {
        const notif = all["notifications"] as Record<string, boolean> | undefined;
        if (notif) setNotifications((n) => ({ ...n, ...notif }));
        const ui = all["ui"] as { density?: string; refreshIntervalSec?: string } | undefined;
        if (ui?.density) setDensity(ui.density);
        if (ui?.refreshIntervalSec) setRefreshSec(String(ui.refreshIntervalSec));
      })
      .catch(() => {
        /* keep defaults */
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingPrefs(false);
      });
    return () => controller.abort();
  }, []);

  const persistNotifications = (next: Record<string, boolean>) => {
    setNotifications(next);
    void saveMyPreference("notifications", next)
      .then(() => toast.success("Préférence enregistrée"))
      .catch((e: unknown) =>
        toast.error(e instanceof Error ? e.message : "Enregistrement impossible"),
      );
  };

  const persistUi = (nextDensity: string, nextRefresh: string) => {
    void saveMyPreference("ui", {
      density: nextDensity,
      refreshIntervalSec: nextRefresh,
    })
      .then(() => toast.success("Préférence d'interface enregistrée"))
      .catch((e: unknown) =>
        toast.error(e instanceof Error ? e.message : "Enregistrement impossible"),
      );
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Apparence</CardTitle>
          <CardDescription>
            Thème local ; densité et rafraîchissement synchronisés au compte.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
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
          <div className="space-y-1.5">
            <Label>Densité des tableaux</Label>
            <Select
              value={density}
              disabled={loadingPrefs}
              onValueChange={(v) => {
                setDensity(v);
                persistUi(v, refreshSec);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="compact">Compacte</SelectItem>
                <SelectItem value="comfortable">Confortable</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pref-refresh">Rafraîchissement worklist (s)</Label>
            <Input
              id="pref-refresh"
              type="number"
              min={10}
              max={300}
              value={refreshSec}
              disabled={loadingPrefs}
              onChange={(e) => setRefreshSec(e.target.value)}
              onBlur={() => persistUi(density, refreshSec)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notifications</CardTitle>
          <CardDescription>Préférences persistées sur le serveur (compte utilisateur).</CardDescription>
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
                disabled={loadingPrefs}
                onCheckedChange={(checked) => {
                  persistNotifications({ ...notifications, [option.id]: checked });
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
              toast.info("Non disponible", {
                description:
                  "La révocation multi-sessions n'est pas encore implémentée côté serveur.",
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

function CentreSettings() {
  const [form, setForm] = useState({
    "centre.nom": "",
    "centre.ville": "",
    "centre.telephone": "",
    "centre.heure_ouverture": "",
    "centre.heure_fermeture": "",
    "schedule.slot_minutes_default": "30",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetchSettings(undefined, controller.signal)
      .then((s) => {
        setForm((prev) => {
          const next = { ...prev };
          for (const key of Object.keys(prev) as (keyof typeof prev)[]) {
            if (s[key] != null) next[key] = s[key]!;
          }
          return next;
        });
      })
      .catch(() => toast.error("Impossible de charger les paramètres du centre"))
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await saveSettings(form);
      toast.success("Paramètres du centre enregistrés");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loader2 className="size-5 animate-spin text-muted-foreground" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Centre</CardTitle>
        <CardDescription>
          Identité et horaires — réservé à la direction (contrôle backend SETTINGS_WRITE).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {(
            [
              ["centre.nom", "Nom du centre"],
              ["centre.ville", "Ville"],
              ["centre.telephone", "Téléphone"],
              ["centre.heure_ouverture", "Ouverture"],
              ["centre.heure_fermeture", "Fermeture"],
              ["schedule.slot_minutes_default", "Durée créneau (min)"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={key}>{label}</Label>
              <Input
                id={key}
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Enregistrer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ParametresPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Paramètres"
        subtitle="Compte, affichage et sécurité du poste de travail."
      />

      <Tabs defaultValue="compte" className="space-y-4">
        <TabsList>
          <TabsTrigger value="compte" className="gap-2">
            <UserCog className="size-4" /> Mon compte
          </TabsTrigger>
          <TabsTrigger value="preferences" className="gap-2">
            <Bell className="size-4" /> Préférences
          </TabsTrigger>
          <WriteGuard resource="settings">
            <TabsTrigger value="centre" className="gap-2">
              <Building2 className="size-4" /> Centre
            </TabsTrigger>
          </WriteGuard>
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
        <WriteGuard resource="settings">
          <TabsContent value="centre">
            <CentreSettings />
          </TabsContent>
        </WriteGuard>
        <TabsContent value="securite">
          <Securite />
        </TabsContent>
      </Tabs>
    </div>
  );
}
