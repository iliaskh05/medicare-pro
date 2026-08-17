/**
 * Traduction des erreurs HTTP en messages utilisateur.
 * Aucune stack trace ni message technique n'est affiché à l'écran.
 */
import { ApiError } from "./config";

export type ErrorKind =
  | "network"
  | "timeout"
  | "unauthorized"
  | "forbidden"
  | "not-found"
  | "conflict"
  | "validation"
  | "bad-request"
  | "server"
  | "unknown";

export type FriendlyError = {
  kind: ErrorKind;
  status: number;
  /** Titre court affichable dans un état d'erreur ou un toast. */
  title: string;
  /** Explication orientée utilisateur métier. */
  message: string;
  /** Une nouvelle tentative a-t-elle du sens ? */
  retryable: boolean;
};

const BY_STATUS: Record<number, Omit<FriendlyError, "status">> = {
  400: {
    kind: "bad-request",
    title: "Requête invalide",
    message: "Les informations envoyées n'ont pas été acceptées par le serveur.",
    retryable: false,
  },
  401: {
    kind: "unauthorized",
    title: "Session expirée",
    message: "Votre session a expiré. Reconnectez-vous pour continuer.",
    retryable: false,
  },
  403: {
    kind: "forbidden",
    title: "Accès refusé",
    message: "Votre profil ne dispose pas des droits nécessaires pour cette action.",
    retryable: false,
  },
  404: {
    kind: "not-found",
    title: "Introuvable",
    message: "La ressource demandée n'existe pas ou a été supprimée.",
    retryable: false,
  },
  409: {
    kind: "conflict",
    title: "Conflit de données",
    message: "Cet enregistrement a été modifié entre-temps ou existe déjà.",
    retryable: false,
  },
  422: {
    kind: "validation",
    title: "Données incomplètes",
    message: "Certains champs sont invalides. Vérifiez le formulaire puis réessayez.",
    retryable: false,
  },
};

export function describeApiError(error: unknown): FriendlyError {
  if (error instanceof ApiError) {
    if (error.status === 0) {
      const timedOut = /abort|timeout/i.test(error.message);
      return timedOut
        ? {
            kind: "timeout",
            status: 0,
            title: "Délai dépassé",
            message: "Le serveur du centre met trop de temps à répondre.",
            retryable: true,
          }
        : {
            kind: "network",
            status: 0,
            title: "Serveur injoignable",
            message: "Impossible de joindre le serveur du centre. Vérifiez le réseau local.",
            retryable: true,
          };
    }

    const known = BY_STATUS[error.status];
    if (known) return { ...known, status: error.status };

    if (error.status >= 500) {
      return {
        kind: "server",
        status: error.status,
        title: "Erreur du serveur",
        message: "Le service a rencontré une erreur interne. Réessayez dans un instant.",
        retryable: true,
      };
    }
  }

  return {
    kind: "unknown",
    status: 0,
    title: "Action impossible",
    message: "Une erreur inattendue est survenue.",
    retryable: true,
  };
}

/** Message court pour un toast. */
export function toastMessage(error: unknown): string {
  const friendly = describeApiError(error);
  return `${friendly.title} — ${friendly.message}`;
}
