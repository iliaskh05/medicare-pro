import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Building2, Lock, Mail, ShieldCheck, Sparkles, User } from "lucide-react";
import { AUTH_TOKEN_KEY, AUTH_USER_KEY, persistAuthToken } from "@/lib/auth-session";
import { useAuth } from "@/hooks/use-auth";
import { JAVA_API_BASE } from "@/lib/api/config";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CardDescription, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import logoRadioCrm from "@/assets/logo-radiocrm.png";
import loginScannerBg from "@/assets/ct-scanner.jpg";

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
  const { setToken } = useAuth();

  /* Déjà connecté → cockpit (évite le rebond login). */
  useEffect(() => {
    const existing = window.localStorage.getItem(AUTH_TOKEN_KEY);
    if (existing?.trim()) {
      void navigate({ to: "/dashboard" });
    }
  }, [navigate]);

  /* ---------- Connexion ---------- */
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginRemember, setLoginRemember] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  /* ---------- Création de compte ---------- */
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerRole, setRegisterRole] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);

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
    setLoginError(null);
    try {
      const response = await fetch(`${JAVA_API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: loginEmail.trim(),
          motDePasse: loginPassword,
        }),
      });

      if (!response.ok) {
        const errData = (await response.json().catch(() => ({}))) as { message?: string };
        const message =
          response.status === 401
            ? errData.message || "Email ou mot de passe incorrect"
            : errData.message || "Connexion impossible";
        throw new Error(message);
      }

      const data = (await response.json()) as {
        token?: string;
        utilisateur?: { id?: number; nom?: string; role?: string };
      };

      if (!data.token) {
        throw new Error("Token manquant dans la réponse serveur");
      }

      // 1) Persistance synchrone — clé exacte radiocrm:token
      window.localStorage.setItem(AUTH_TOKEN_KEY, data.token);
      window.sessionStorage.setItem(AUTH_TOKEN_KEY, data.token);
      persistAuthToken(data.token);
      setToken(data.token);

      if (data.utilisateur) {
        const utilisateur = {
          ...data.utilisateur,
          nomComplet: data.utilisateur.nom ?? "",
        };
        window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(utilisateur));
      }

      // 2) Navigation uniquement après stockage confirmé
      if (!window.localStorage.getItem(AUTH_TOKEN_KEY)) {
        throw new Error("Impossible d'enregistrer la session locale");
      }

      void navigate({ to: "/dashboard" });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Impossible de se connecter";
      setLoginError(message);
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleRegisterSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmitRegister) return;

    setRegisterLoading(true);
    setRegisterError(null);
    try {
      const response = await fetch(`${JAVA_API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nomComplet: registerName.trim(),
          email: registerEmail.trim(),
          motDePasse: registerPassword,
          role: registerRole.toUpperCase(),
        }),
      });

      if (!response.ok) {
        const errData = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(errData.message || "Erreur lors de la création du compte");
      }

      const data = (await response.json()) as {
        token?: string;
        utilisateur?: { id?: number; nom?: string; role?: string };
      };

      if (!data.token) {
        throw new Error("Token manquant dans la réponse serveur");
      }

      window.localStorage.setItem(AUTH_TOKEN_KEY, data.token);
      window.sessionStorage.setItem(AUTH_TOKEN_KEY, data.token);
      persistAuthToken(data.token);
      setToken(data.token);

      if (data.utilisateur) {
        window.localStorage.setItem(
          AUTH_USER_KEY,
          JSON.stringify({
            ...data.utilisateur,
            nomComplet: data.utilisateur.nom ?? "",
          }),
        );
      }

      void navigate({ to: "/dashboard" });
    } catch (error: unknown) {
      setRegisterError(error instanceof Error ? error.message : "Impossible de créer le compte");
    } finally {
      setRegisterLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12 sm:px-6">
      {/* Image d'arrière-plan immersive */}
      <div
        aria-hidden
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${loginScannerBg})` }}
      />

      <div aria-hidden className="login-overlay absolute inset-0 z-0" />

      {/* En-tête marque */}
      <div className="relative z-10 mb-8 flex flex-col items-center gap-4">
        <div className="glass-card flex size-16 items-center justify-center rounded-2xl bg-white/10">
          <img
            src={logoRadioCrm}
            alt="Logo RadioCRM"
            width={512}
            height={512}
            className="size-10"
          />
        </div>
        <div className="text-center">
          <p className="login-title text-3xl font-extrabold tracking-tight sm:text-4xl">
            RadioCRM
          </p>
          <p className="login-subtitle mt-1 text-sm font-light tracking-wide sm:text-base">
            Centre d'Imagerie Médicale Bentachfine - Témara
          </p>
        </div>
      </div>

      {/* Carte centrale Glassmorphism */}
      <div className="glass-card relative z-10 w-full max-w-md rounded-2xl p-6 sm:p-8">
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="login-pill-tabs">
            <TabsTrigger value="login" className="login-pill-trigger py-2 text-sm font-medium">
              Connexion
            </TabsTrigger>
            <TabsTrigger value="register" className="login-pill-trigger py-2 text-sm font-medium">
              Création de compte
            </TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="mt-5 space-y-5">
            <div className="space-y-1">
              <CardTitle className="login-text text-lg">Bienvenue sur RadioCRM</CardTitle>
              <CardDescription className="login-muted text-sm">
                Connectez-vous pour accéder à votre espace sécurisé.
              </CardDescription>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email" className="login-text text-sm font-medium">
                  Adresse e-mail professionnelle
                </Label>
                <div className="relative">
                  <Mail className="login-input-icon pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                    <Input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    placeholder="prenom.nom@centre-imagerie.ma"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="login-input h-11 w-full pl-9 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="login-password" className="login-text text-sm font-medium">
                    Mot de passe
                  </Label>
                  <Link to="/forgot-password" className="login-link text-xs font-medium">
                    Mot de passe oublié ?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="login-input-icon pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                  <Input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="login-input h-11 w-full pl-9 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="login-remember"
                  checked={loginRemember}
                  onCheckedChange={(checked) => setLoginRemember(checked === true)}
                  className="border-white/60 data-[state=checked]:border-white data-[state=checked]:bg-white data-[state=checked]:text-primary"
                />
                <Label htmlFor="login-remember" className="login-muted text-sm font-normal">
                  Garder ma session active
                </Label>
              </div>

              <Button
                type="submit"
                size="lg"
                className="btn-premium h-11 w-full rounded-xl !text-white"
                disabled={!canSubmitLogin || loginLoading}
              >
                {loginLoading ? "Connexion en cours..." : "Se connecter"}
              </Button>
              {loginError ? <p className="login-error text-center text-xs">{loginError}</p> : null}
            </form>
          </TabsContent>

          <TabsContent value="register" className="mt-5 space-y-5">
            <div className="space-y-1">
              <CardTitle className="login-text text-lg">Demander un accès</CardTitle>
              <CardDescription className="login-muted text-sm">
                Votre demande sera validée par la direction du centre.
              </CardDescription>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="register-name" className="login-text text-sm font-medium">
                  Nom complet
                </Label>
                <div className="relative">
                  <User className="login-input-icon pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                  <Input
                    id="register-name"
                    type="text"
                    autoComplete="name"
                    placeholder="Prénom Nom"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    className="login-input h-11 w-full pl-9 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-email" className="login-text text-sm font-medium">
                  Adresse e-mail professionnelle
                </Label>
                <div className="relative">
                  <Mail className="login-input-icon pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                  <Input
                    id="register-email"
                    type="email"
                    autoComplete="email"
                    placeholder="prenom.nom@centre-imagerie.ma"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    className="login-input h-11 w-full pl-9 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-role" className="login-text text-sm font-medium">
                  Rôle au sein du centre
                </Label>
                <Select value={registerRole} onValueChange={setRegisterRole}>
                  <SelectTrigger
                    id="register-role"
                    className="login-input h-11 w-full text-sm focus:ring-0 focus:ring-offset-0"
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="login-input-icon size-4" />
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
                <Label htmlFor="register-password" className="login-text text-sm font-medium">
                  Mot de passe
                </Label>
                <div className="relative">
                  <Lock className="login-input-icon pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                  <Input
                    id="register-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    className="login-input h-11 w-full pl-9 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-confirm-password" className="login-text text-sm font-medium">
                  Confirmation du mot de passe
                </Label>
                <div className="relative">
                  <Lock className="login-input-icon pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                  <Input
                    id="register-confirm-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={registerConfirmPassword}
                    onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                    className="login-input h-11 w-full pl-9 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
                {registerConfirmPassword && !passwordsMatch && (
                  <p className="login-error text-xs">Les mots de passe ne correspondent pas.</p>
                )}
              </div>

              <Button
                type="submit"
                size="lg"
                className="btn-premium h-11 w-full rounded-xl !text-white"
                disabled={!canSubmitRegister || registerLoading}
              >
                {registerLoading ? "Création en cours..." : "Créer mon compte"}
              </Button>
              {registerError ? <p className="login-error text-center text-xs">{registerError}</p> : null}
            </form>
          </TabsContent>

          <CardDescription className="login-muted mt-6 flex items-center justify-center gap-1.5 px-2 text-center text-xs">
            <Sparkles className="login-link size-3.5" />
            Accès chiffré de bout en bout et réservé au personnel du centre
          </CardDescription>
        </Tabs>
      </div>

      {/* Footer légal */}
      <p className="login-muted relative z-10 mt-8 flex items-center gap-1.5 text-xs">
        <ShieldCheck className="size-3.5" />
        Hébergement conforme · Journalisation des accès · Données patients chiffrées
      </p>
    </div>
  );
}
