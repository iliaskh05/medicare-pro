/** Types de la console WhatsApp Business (données fournies par le backend). */

export type WaAuteur = "patient" | "bot" | "agent" | "systeme";

export type WaEtat = "envoye" | "delivre" | "lu";

export type WaStatut = "bot" | "attente" | "secretariat" | "cloture";

export type WaPiece = { nom: string; taille: string; type: "pdf" | "image" };

export type WaQuickReply = { label: string; payload: string };

export type WaMessage = {
  id: string;
  auteur: WaAuteur;
  texte: string;
  heure: string;
  etat?: WaEtat;
  intent?: string;
  piece?: WaPiece;
  quickReplies?: WaQuickReply[];
};

export type WaConversation = {
  id: string;
  patient: string;
  initiales: string;
  telephone: string;
  dossier: string;
  mutuelle: string;
  examen: string;
  prochainRdv: string;
  statut: WaStatut;
  nonLus: number;
  derniereHeure: string;
  apercu: string;
  messages: WaMessage[];
};

export const waStatutLabel: Record<WaStatut, string> = {
  bot: "Bot actif",
  attente: "En attente d'un agent",
  secretariat: "Pris en charge par le secrétariat",
  cloture: "Conversation clôturée",
};

export const waStatutTone: Record<WaStatut, "success" | "warning" | "primary" | "neutral"> = {
  bot: "success",
  attente: "warning",
  secretariat: "primary",
  cloture: "neutral",
};

export const waFiltres: Array<{ key: "toutes" | WaStatut; label: string }> = [
  { key: "toutes", label: "Toutes" },
  { key: "bot", label: "Bot actif" },
  { key: "attente", label: "En attente" },
  { key: "secretariat", label: "Secrétariat" },
  { key: "cloture", label: "Clôturées" },
];
