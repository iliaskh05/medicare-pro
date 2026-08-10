/**
 * Jeu de données fictif de la console WhatsApp Business.
 * Aucun numéro, patient ou montant réel — usage démonstration uniquement.
 */

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

export const conversationsWhatsApp: WaConversation[] = [
  {
    id: "WA-01",
    patient: "Karim Bennani",
    initiales: "KB",
    telephone: "+212 661 45 88 12",
    dossier: "PAT-1042",
    mutuelle: "CNSS",
    examen: "IRM rachis lombaire",
    prochainRdv: "Jeudi 13/08 · 10h30 · Salle IRM 1",
    statut: "bot",
    nonLus: 2,
    derniereHeure: "09:41",
    apercu: "Parfait, je confirme jeudi 10h30 alors 🙏",
    messages: [
      {
        id: "WA-01-m1",
        auteur: "patient",
        texte: "Bonjour, mon médecin m'a prescrit une IRM lombaire. Comment prendre rendez-vous ?",
        heure: "09:12",
        intent: "Prise de rendez-vous",
      },
      {
        id: "WA-01-m2",
        auteur: "bot",
        texte:
          "Bonjour M. Bennani 👋 Bienvenue au Centre d'Imagerie Médicale. Je peux vous proposer un créneau pour une IRM du rachis lombaire. Avez-vous votre ordonnance avec vous ?",
        heure: "09:13",
        etat: "lu",
      },
      {
        id: "WA-01-m3",
        auteur: "patient",
        texte: "Oui, ordonnance du Dr. Naima Skalli, datée du 4 août.",
        heure: "09:16",
      },
      {
        id: "WA-01-m4",
        auteur: "bot",
        texte:
          "Merci. Créneaux disponibles pour l'IRM lombaire :\n• Jeudi 13/08 à 10h30\n• Vendredi 14/08 à 08h15\n• Samedi 15/08 à 11h00",
        heure: "09:18",
        etat: "lu",
      },
      { id: "WA-01-m5", auteur: "patient", texte: "Jeudi 10h30 c'est parfait.", heure: "09:33" },
      {
        id: "WA-01-m6",
        auteur: "bot",
        texte:
          "Rendez-vous confirmé ✅\nIRM rachis lombaire — Jeudi 13/08 à 10h30\nSalle IRM 1, 2e étage. Merci d'arriver 15 minutes avant avec votre CIN, votre ordonnance et votre carte de mutuelle.",
        heure: "09:35",
        etat: "lu",
        piece: { nom: "Confirmation_RDV_IRM.pdf", taille: "128 Ko", type: "pdf" },
      },
      {
        id: "WA-01-m7",
        auteur: "patient",
        texte: "Parfait, je confirme jeudi 10h30 alors 🙏",
        heure: "09:41",
      },
    ],
  },
  {
    id: "WA-02",
    patient: "Fatima Zahra Idrissi",
    initiales: "FI",
    telephone: "+212 662 09 77 41",
    dossier: "PAT-0987",
    mutuelle: "CNOPS",
    examen: "Scanner abdominal",
    prochainRdv: "Mardi 11/08 · 09h00 · Scanner",
    statut: "attente",
    nonLus: 1,
    derniereHeure: "08:58",
    apercu: "Est-ce que je dois être à jeun pour le scanner ?",
    messages: [
      {
        id: "WA-02-m1",
        auteur: "patient",
        texte: "Bonjour, j'ai un scanner abdominal demain matin.",
        heure: "08:54",
      },
      {
        id: "WA-02-m2",
        auteur: "bot",
        texte: "Bonjour Mme Idrissi. Votre scanner abdominal est bien prévu mardi 11/08 à 09h00.",
        heure: "08:55",
        etat: "lu",
      },
      {
        id: "WA-02-m3",
        auteur: "patient",
        texte: "Est-ce que je dois être à jeun pour le scanner ?",
        heure: "08:58",
        intent: "Préparation d'examen",
      },
    ],
  },
  {
    id: "WA-03",
    patient: "Youssef El Amrani",
    initiales: "YE",
    telephone: "+212 670 32 14 05",
    dossier: "PAT-1120",
    mutuelle: "AMO",
    examen: "Échographie abdominale",
    prochainRdv: "Aucun rendez-vous planifié",
    statut: "secretariat",
    nonLus: 0,
    derniereHeure: "Hier",
    apercu: "Votre demande est transmise au secrétariat 📞",
    messages: [
      {
        id: "WA-03-m1",
        auteur: "patient",
        texte: "Je souhaite annuler mon échographie et connaître les modalités de remboursement.",
        heure: "17:20",
        intent: "Mutuelle & remboursement",
      },
      {
        id: "WA-03-m2",
        auteur: "bot",
        texte:
          "Je comprends. Les demandes de remboursement sont traitées par le secrétariat. Votre demande est transmise au secrétariat 📞",
        heure: "17:21",
        etat: "lu",
      },
      {
        id: "WA-03-m3",
        auteur: "systeme",
        texte: "Conversation transférée au secrétariat — Souad Bahri a pris le relais.",
        heure: "17:22",
      },
      {
        id: "WA-03-m4",
        auteur: "agent",
        texte:
          "Bonjour M. El Amrani, Souad du secrétariat. J'annule votre échographie et je vous rappelle pour la prise en charge AMO.",
        heure: "17:26",
        etat: "lu",
      },
    ],
  },
  {
    id: "WA-04",
    patient: "Salma Benjelloun",
    initiales: "SB",
    telephone: "+212 655 88 20 63",
    dossier: "PAT-1077",
    mutuelle: "Assurance privée",
    examen: "Mammographie de dépistage",
    prochainRdv: "Examen réalisé le 07/08",
    statut: "cloture",
    nonLus: 0,
    derniereHeure: "Hier",
    apercu: "Votre compte rendu est disponible au centre 📄",
    messages: [
      {
        id: "WA-04-m1",
        auteur: "patient",
        texte: "Bonjour, mon compte rendu de mammographie est-il prêt ?",
        heure: "15:02",
        intent: "Compte rendu disponible",
      },
      {
        id: "WA-04-m2",
        auteur: "bot",
        texte:
          "Bonjour Mme Benjelloun. Votre compte rendu est disponible au centre 📄 Il vous sera remis par le secrétariat ou expliqué par votre médecin. Aucun résultat médical n'est communiqué par messagerie.",
        heure: "15:03",
        etat: "lu",
      },
      {
        id: "WA-04-m3",
        auteur: "systeme",
        texte: "Conversation clôturée par le secrétariat.",
        heure: "15:20",
      },
    ],
  },
  {
    id: "WA-05",
    patient: "Abdelhak Tazi",
    initiales: "AT",
    telephone: "+212 668 11 47 29",
    dossier: "PAT-1198",
    mutuelle: "Sans mutuelle",
    examen: "Radiographie du genou",
    prochainRdv: "Aucun rendez-vous planifié",
    statut: "bot",
    nonLus: 3,
    derniereHeure: "Lundi",
    apercu: "Combien coûte une radio du genou svp ?",
    messages: [
      {
        id: "WA-05-m1",
        auteur: "patient",
        texte: "Salam, combien coûte une radio du genou svp ?",
        heure: "10:44",
        intent: "Mutuelle & tarifs",
      },
    ],
  },
];
