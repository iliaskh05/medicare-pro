import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Mail, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logoRadioCrm from "@/assets/logo-radiocrm.png";
import loginBgAsset from "@/assets/login-bg.jpg.asset.json";

/** Appel public (pas de JWT) — même base que le login, hors client Worklist. */
const AUTH_API_BASE = "http://localhost:8080";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [{ title: "Mot de passe oublié — RadioCRM" }],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      // fetch natif sans Authorization — ne passe pas par api/javaApi (401 auto).
      const res = await fetch(`${AUTH_API_BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "omit",
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(data.message || "Demande impossible pour le moment");
      }
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Demande impossible");
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

        <h1 className="login-text text-lg font-semibold">Mot de passe oublié</h1>
        <p className="login-muted mt-1 text-sm">
          Saisissez votre e-mail professionnel. Si un compte existe, un lien de
          réinitialisation vous sera envoyé.
        </p>

        {done ? (
          <p className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            Si cet e-mail existe, un lien vous a été envoyé.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fp-email" className="login-text text-sm">
                Adresse e-mail
              </Label>
              <div className="relative">
                <Mail className="login-input-icon pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                <Input
                  id="fp-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="login-input h-11 pl-9"
                  placeholder="prenom.nom@centre-imagerie.ma"
                />
              </div>
            </div>
            {error ? <p className="login-error text-xs">{error}</p> : null}
            <Button
              type="submit"
              className="btn-premium h-11 w-full rounded-xl !text-white"
              disabled={loading || !email.trim()}
            >
              {loading ? "Envoi en cours…" : "Envoyer le lien"}
            </Button>
          </form>
        )}
      </div>

      <p className="login-muted relative z-10 mt-8 flex items-center gap-1.5 text-xs">
        <ShieldCheck className="size-3.5" /> Accès sécurisé au personnel du centre
      </p>
    </div>
  );
}
