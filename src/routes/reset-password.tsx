import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Lock, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logoRadioCrm from "@/assets/logo-radiocrm.png";
import loginBgAsset from "@/assets/login-bg.jpg.asset.json";

/** Appel public (pas de JWT) — même base que le login, hors client Worklist. */
const AUTH_API_BASE = "http://localhost:8080";

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  head: () => ({
    meta: [{ title: "Nouveau mot de passe — RadioCRM" }],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => Boolean(token && password.length >= 8 && password === confirm),
    [token, password, confirm],
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      // fetch natif sans Authorization — ne passe pas par api/javaApi (401 auto).
      const res = await fetch(`${AUTH_API_BASE}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "omit",
        body: JSON.stringify({ token, nouveauMotDePasse: password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(data.message || "Réinitialisation impossible");
      }
      alert("Mot de passe mis à jour. Vous pouvez vous connecter.");
      void navigate({ to: "/" });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Réinitialisation impossible");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12">
      <div
        aria-hidden
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${loginBgAsset.url})` }}
      />
      <div aria-hidden className="login-overlay absolute inset-0 z-0" />

      <div className="relative z-10 mb-8 flex flex-col items-center gap-3">
        <img src={logoRadioCrm} alt="RadioCRM" className="size-12" width={512} height={512} />
        <p className="login-title text-2xl font-extrabold">RadioCRM</p>
      </div>

      <div className="glass-card relative z-10 w-full max-w-md rounded-2xl p-6 sm:p-8">
        <Link
          to="/"
          className="login-link mb-4 inline-flex items-center gap-1.5 text-xs font-medium"
        >
          <ArrowLeft className="size-3.5" /> Retour à la connexion
        </Link>

        <h1 className="login-text text-lg font-semibold">Nouveau mot de passe</h1>
        <p className="login-muted mt-1 text-sm">
          Choisissez un mot de passe d&apos;au moins 8 caractères.
        </p>

        {!token ? (
          <p className="login-error mt-6 text-sm">
            Lien invalide ou incomplet. Demandez un nouveau lien depuis la page « Mot de passe
            oublié ».
          </p>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rp-pass" className="login-text text-sm">
                Nouveau mot de passe
              </Label>
              <div className="relative">
                <Lock className="login-input-icon pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                <Input
                  id="rp-pass"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="login-input h-11 pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rp-confirm" className="login-text text-sm">
                Confirmation
              </Label>
              <div className="relative">
                <Lock className="login-input-icon pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                <Input
                  id="rp-confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="login-input h-11 pl-9"
                />
              </div>
              {confirm && password !== confirm ? (
                <p className="login-error text-xs">Les mots de passe ne correspondent pas.</p>
              ) : null}
            </div>
            {error ? <p className="login-error text-xs">{error}</p> : null}
            <Button
              type="submit"
              className="btn-premium h-11 w-full rounded-xl !text-white"
              disabled={!canSubmit || loading}
            >
              {loading ? "Enregistrement…" : "Enregistrer le mot de passe"}
            </Button>
          </form>
        )}
      </div>

      <p className="login-muted relative z-10 mt-8 flex items-center gap-1.5 text-xs">
        <ShieldCheck className="size-3.5" /> Lien valable 1 heure
      </p>
    </div>
  );
}
