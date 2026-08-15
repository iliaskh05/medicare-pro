import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Building2, Lock, Mail, ShieldCheck, Sparkles, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import logoRadioCrm from "@/assets/logo-radiocrm.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RadioCRM — Portail d'accès" },
      {
        name: "description",
        content:
          "Accédez à RadioCRM, la plateforme sécurisée du Centre d'Imagerie Médicale : gestion des patients, examens, facturation et conformité.",
      },
      {
        property: "og:title",
        content: "RadioCRM — Portail d'accès",
      },
      {
        property: "og:description",
        content: "Plateforme sécurisée de gestion du centre d'imagerie médicale.",
      },
    ],
  }),
  component: LoginPage,
});

const roles = [
  { value: "directeur", label: "Directeur" },
  { value: "radiologue", label: "Radiologue" },
  { value: "manipulateur", label: "Manipulateur" },
  { value: "secretariat", label: "Secrétariat" },
];

function LoginPage() {
  const navigate = useNavigate();

  /* ---------- Connexion ---------- */
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginRemember, setLoginRemember] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  /* ---------- Création de compte ---------- */
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerRole, setRegisterRole] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");
  const [registerLoading, setRegisterLoading] = useState(false);

  const passwordsMatch = useMemo(
    () => registerPassword === registerConfirmPassword,
    [registerPassword, registerConfirmPassword],
  );

  const canSubmitLogin = Boolean(loginEmail.trim() && loginPassword);
  const canSubmitRegister = Boolean(
    registerName.trim() &&
      registerEmail.trim() &&
      registerRole &&
      registerPassword &&
      registerConfirmPassword &&
      passwordsMatch,
  );

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmitLogin) return;

    setLoginLoading(true);
    try {
      // TODO: remplacer par l'appel Spring Boot /api/auth/login
      // const session = await fetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: loginEmail, password: loginPassword }) });
      // if (session.ok) navigate({ to: '/worklist' });
      await new Promise((resolve) => setTimeout(resolve, 600));
      navigate({ to: "/worklist" });
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleRegisterSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmitRegister) return;

    setRegisterLoading(true);
    try {
      // TODO: remplacer par l'appel Spring Boot /api/auth/register
      // const res = await fetch('/api/auth/register', { method: 'POST', body: JSON.stringify({ fullName: registerName, email: registerEmail, role: registerRole, password: registerPassword }) });
      await new Promise((resolve) => setTimeout(resolve, 600));
      // Basculer vers l'onglet de connexion après création
      document.querySelector<HTMLButtonElement>('[value="login"]')?.click();
    } finally {
      setRegisterLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-primary/10 via-background to-muted/50 px-4 py-12 sm:px-6">
      {/* Ornement subtil */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-20 size-80 rounded-full bg-primary/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -left-20 size-80 rounded-full bg-chart-2/15 blur-3xl"
      />

      {/* En-tête marque */}
      <div className="relative z-10 mb-8 flex flex-col items-center gap-3">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-card shadow-sm ring-1 ring-inset ring-border">
          <img
            src={logoRadioCrm}
            alt="Logo RadioCRM"
            width={512}
            height={512}
            className="size-9"
          />
        </div>
        <div className="text-center">
          <p className="page-title text-2xl tracking-tight">RadioCRM</p>
          <p className="mt-0.5 text-xs font-medium text-muted-foreground">
            Centre d'Imagerie Médicale
          </p>
        </div>
      </div>

      {/* Portail d'accès */}
      <Card className="relative z-10 w-full max-w-md shadow-elevated">
        <Tabs defaultValue="login" className="w-full">
          <CardHeader className="pb-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Connexion</TabsTrigger>
              <TabsTrigger value="register">Création de compte</TabsTrigger>
            </TabsList>
          </CardHeader>

          <CardContent className="pt-0">
            <TabsContent value="login" className="mt-0 space-y-5">
              <div className="space-y-1">
                <CardTitle className="text-lg">Bienvenue sur RadioCRM</CardTitle>
                <CardDescription>Connectez-vous pour accéder à votre espace.</CardDescription>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Adresse e-mail professionnelle</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      placeholder="prenom.nom@centre-imagerie.ma"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="h-11 bg-background pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password">Mot de passe</Label>
                    <button
                      type="button"
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Mot de passe oublié ?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type="password"
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="h-11 bg-background pl-9"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="login-remember"
                    checked={loginRemember}
                    onCheckedChange={(checked) => setLoginRemember(checked === true)}
                  />
                  <Label htmlFor="login-remember" className="text-sm font-normal text-muted-foreground">
                    Garder ma session active
                  </Label>
                </div>

                <Button type="submit" size="lg" className="h-11 w-full" disabled={!canSubmitLogin || loginLoading}>
                  {loginLoading ? "Connexion en cours..." : "Se connecter"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register" className="mt-0 space-y-5">
              <div className="space-y-1">
                <CardTitle className="text-lg">Demander un accès</CardTitle>
                <CardDescription>
                  Votre demande sera validée par la direction du centre.
                </CardDescription>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-name">Nom complet</Label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="register-name"
                      type="text"
                      autoComplete="name"
                      placeholder="Prénom Nom"
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                      className="h-11 bg-background pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-email">Adresse e-mail professionnelle</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="register-email"
                      type="email"
                      autoComplete="email"
                      placeholder="prenom.nom@centre-imagerie.ma"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      className="h-11 bg-background pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-role">Rôle au sein du centre</Label>
                  <Select value={registerRole} onValueChange={setRegisterRole}>
                    <SelectTrigger id="register-role" className="h-11 bg-background">
                      <div className="flex items-center gap-2">
                        <Building2 className="size-4 text-muted-foreground" />
                        <SelectValue placeholder="Sélectionner un rôle" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-password">Mot de passe</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="register-password"
                      type="password"
                      autoComplete="new-password"
                      placeholder="••••••••"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      className="h-11 bg-background pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-confirm-password">Confirmation du mot de passe</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="register-confirm-password"
                      type="password"
                      autoComplete="new-password"
                      placeholder="••••••••"
                      value={registerConfirmPassword}
                      onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                      className="h-11 bg-background pl-9"
                    />
                  </div>
                  {registerConfirmPassword && !passwordsMatch && (
                    <p className="text-xs text-destructive">Les mots de passe ne correspondent pas.</p>
                  )}
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="h-11 w-full"
                  disabled={!canSubmitRegister || registerLoading}
                >
                  {registerLoading ? "Création en cours..." : "Créer mon compte"}
                </Button>
              </form>
            </TabsContent>
          </CardContent>

          <CardDescription className="flex items-center justify-center gap-1.5 px-6 pb-6 text-center text-xs">
            <Sparkles className="size-3.5 text-primary" />
            Accès chiffré de bout en bout et réservé au personnel du centre
          </CardDescription>
        </Tabs>
      </Card>

      {/* Footer légal */}
      <p className="relative z-10 mt-8 flex items-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="size-3.5" />
        Hébergement conforme · Journalisation des accès · Données patients chiffrées
      </p>
    </div>
  );
}
