import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
  redirect,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { ShieldCheck } from "lucide-react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { Toaster } from "@/components/ui/sonner";
import { MessagerieDock } from "@/components/messagerie-dock";
import { PlatformAssistant } from "@/components/assistant/platform-assistant";
import { RoleProvider } from "@/hooks/use-role";
import { ThemeProvider } from "@/hooks/use-theme";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { hasAuthToken, isPublicAuthPath } from "@/lib/auth-session";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page introuvable</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Cette page n'existe pas ou a été déplacée.
        </p>
        <div className="mt-6">
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Retour au tableau de bord
          </Link>
        </div>
      </div>
    </div>
  );
}

const STALE_CHUNK_RE =
  /dynamically imported module|Importing a module script failed|ChunkLoadError/i;

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    if (typeof window !== "undefined" && STALE_CHUNK_RE.test(error?.message ?? "")) {
      const key = "radiocrm:stale-chunk-reload";
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        window.location.reload();
        return;
      }
    }
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Cette page ne s'est pas chargée
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Une erreur est survenue. Réessayez ou revenez à l'accueil.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Réessayer
          </button>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Accueil
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  beforeLoad: ({ location }) => {
    /**
     * Garde synchrone (client uniquement) :
     * - Token présent + route login → /worklist
     * - Token présent + route protégée → JAMAIS de redirect vers login
     * - Pas de token + route protégée → /
     */
    if (typeof window === "undefined") return;

    const path = location.pathname;
    const token = window.localStorage.getItem("radiocrm:token");
    const hasToken = Boolean(token && token.trim());

    if (isPublicAuthPath(path)) {
      if (hasToken && (path === "/" || path === "/login")) {
        throw redirect({ to: "/worklist" });
      }
      return;
    }

    // Route protégée (ex: /worklist, /dashboard) : token obligatoire, sinon login.
    // Si token présent → on laisse passer sans condition.
    if (hasToken) return;

    throw redirect({ to: "/" });
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      {
        name: "google-site-verification",
        content: "-Aw4JQVobB_qGDCCLQN75AKThKyMpS7zxMe46p9A4Fg",
      },

      { title: "RadioCRM — CRM du centre de radiologie" },
      {
        name: "description",
        content:
          "CRM médical pour centre de radiologie au Maroc : patients, facturation MAD, prescripteurs et audit IA.",
      },
      { property: "og:title", content: "RadioCRM — CRM du centre de radiologie" },
      {
        property: "og:description",
        content:
          "CRM médical pour centre de radiologie au Maroc : patients, facturation MAD, prescripteurs et audit IA.",
      },
      { property: "og:site_name", content: "RadioCRM" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap",
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppShell />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

/**
 * Shell applicatif : si un token existe dans localStorage, on affiche l'app
 * immédiatement (même pendant l'hydratation React).
 */
function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { ready } = useAuth();
  const isAuthScreen = isPublicAuthPath(pathname);

  // Preuve storage directe — clé unique radiocrm:token.
  const storageHasToken =
    typeof window !== "undefined" &&
    Boolean(window.localStorage.getItem("radiocrm:token")?.trim());

  if (isAuthScreen) {
    return <Outlet />;
  }

  // Token présent → toujours afficher l'app (jamais de rebond login).
  if (storageHasToken || hasAuthToken()) {
    return (
      <ThemeProvider>
        <RoleProvider>
          <SidebarProvider>
            <div className="flex min-h-screen w-full bg-background">
              <AppSidebar />
              <div className="flex min-w-0 flex-1 flex-col">
                <AppHeader />
                <main className="flex-1 px-3 py-5 sm:px-6 sm:py-7">
                  <Outlet />
                </main>
                <footer className="border-t border-border px-3 py-4 sm:px-6">
                  <p className="flex items-start gap-2 text-xs text-muted-foreground">
                    <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />
                    Hébergement sécurisé HDS - Conforme aux directives de la CNDP (Loi 09-08) sur la
                    protection des données.
                  </p>
                </footer>
              </div>
            </div>
          </SidebarProvider>
          <MessagerieDock />
          <PlatformAssistant />
        </RoleProvider>
      </ThemeProvider>
    );
  }

  // Pas encore hydraté → attendre sans clear ni redirect.
  if (!ready) return null;

  // Hydraté sans token → beforeLoad redirige ; filet UI.
  return null;
}
