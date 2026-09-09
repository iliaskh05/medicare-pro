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
  | "database"
  | "not-configured"
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
    message: "Votre session a expiré. Veuillez vous reconnecter.",
    retryable: false,
  },
  403: {
    kind: "forbidden",
    title: "Accès refusé",
    message: "Vous n'avez pas les droits nécessaires pour effectuer cette action.",
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
      if (error.code === "backend_not_configured") {
        return {
          kind: "not-configured",
          status: 0,
          title: "Configuration manquante",
          message:
            "L'adresse du serveur MediCare Pro n'est pas définie. Saisissez-la dans Configuration serveur.",
          retryable: false,
        };
      }
      if (error.code === "offline") {
        return {
          kind: "network",
          status: 0,
          title: "Réseau du centre",
          message: "Connexion au réseau du centre perdue.",
          retryable: true,
        };
      }
      const timedOut =
        error.code === "timeout" || /abort|timeout|délai/i.test(error.message);
      if (timedOut || error.code === "aborted") {
        return {
          kind: "timeout",
          status: 0,
          title: "Délai dépassé",
          message: "Le serveur du centre met trop de temps à répondre.",
          retryable: true,
        };
      }
      return {
        kind: "network",
        status: 0,
        title: "Serveur inaccessible",
        message:
          "Le serveur MediCare Pro est actuellement inaccessible. Vérifiez votre connexion au réseau du centre, l'adresse du serveur, et que le serveur MediCare est démarré.",
        retryable: true,
      };
    }

    if (error.code === "patient_duplicate_cin" || error.code === "slot_conflict" || error.code === "patient_slot_conflict") {
      return {
        kind: "conflict",
        status: error.status,
        title: "Conflit",
        message: error.message,
        retryable: false,
      };
    }

    const known = BY_STATUS[error.status];
    if (known) {
      const fromServer =
        error.message &&
        error.message.trim().length > 0 &&
        !/^Erreur \d+ /.test(error.message);
      return {
        ...known,
        status: error.status,
        message: fromServer ? error.message : known.message,
      };
    }

    if (error.status >= 500) {
      const db =
        /database|jdbc|sql/i.test(error.message) || error.code === "data_conflict";
      const fromServer =
        error.message &&
        error.message.trim().length > 0 &&
        !/^Erreur \d+ /.test(error.message);
      return {
        kind: db ? "database" : "server",
        status: error.status,
        title: db ? "Erreur base de données" : "Erreur du serveur",
        message: db
          ? "La base de données du centre a renvoyé une erreur. Réessayez ou contactez l'administrateur."
          : fromServer
            ? error.message
            : "Le service a rencontré une erreur interne. Réessayez dans un instant.",
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
