/** Types de la messagerie interne du centre. */

export type ChatAttachment =
  | { kind: "image"; url: string; caption: string; meta: string }
  | { kind: "audio"; durationSec: number; transcript: string }
  | { kind: "file"; name: string; size: string; pages: number };

export type ChatSeedMessage = {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: string;
  attachment?: ChatAttachment;
};

export type ChatChannel = {
  id: string;
  name: string;
  subtitle: string;
  initiales: string;
  enLigne?: boolean;
  nonLus: number;
  dernierMessage: string;
};

export type MessageInterne = {
  id: string;
  auteur: "moi" | "medecin";
  texte: string;
  heure: string;
};

export type ConversationInterne = {
  id: string;
  medecin: string;
  specialite: string;
  initiales: string;
  enLigne: boolean;
  nonLus: number;
  dernierMessage: string;
  messages: MessageInterne[];
};
