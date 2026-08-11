import type { ChannelId, ChatMessageDto } from "@/lib/api/chat";

export type ChannelMeta = {
  id: ChannelId;
  name: string;
  description: string;
  membersCount: number;
};

/** Les 3 canaux de base du centre (identifiants alignés sur le backend Java). */
export const channels: ChannelMeta[] = [
  {
    id: "accueil-medecins",
    name: "Accueil - Médecins",
    description: "Coordination des rendez-vous, prescriptions et urgences patients",
    membersCount: 7,
  },
  {
    id: "techniciens-medecins",
    name: "Techniciens - Médecins",
    description: "Qualité des acquisitions, protocoles et reprises de séries",
    membersCount: 6,
  },
  {
    id: "general",
    name: "Général",
    description: "Annonces du centre et organisation interne",
    membersCount: 14,
  },
];

const iso = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 60_000).toISOString();

/** Historique local affiché tant que l'API Java n'est pas branchée. */
export const seedMessagesByChannel: Record<ChannelId, ChatMessageDto[]> = {
  "accueil-medecins": [
    {
      id: "am-1",
      channelId: "accueil-medecins",
      authorId: "accueil-souad",
      authorName: "Souad Bahri",
      authorRole: "Accueil",
      body: "Bonjour Docteur, Mme Idrissi est arrivée pour son IRM lombaire de 11h.",
      createdAt: iso(52),
    },
    {
      id: "am-2",
      channelId: "accueil-medecins",
      authorId: "med-skalli",
      authorName: "Dr. Naima Skalli",
      authorRole: "Médecin",
      body: "Merci, vérifiez la clairance rénale avant injection s'il vous plaît.",
      createdAt: iso(48),
    },
    {
      id: "am-3",
      channelId: "accueil-medecins",
      authorId: "accueil-souad",
      authorName: "Souad Bahri",
      authorRole: "Accueil",
      body: "Bilan biologique reçu du laboratoire.",
      createdAt: iso(44),
      attachment: { kind: "file", name: "Bilan_biologique_Idrissi.pdf", size: "212 Ko" },
    },
  ],
  "techniciens-medecins": [
    {
      id: "tm-1",
      channelId: "techniciens-medecins",
      authorId: "tech-hassan",
      authorName: "Hassan El Fassi",
      authorRole: "Technicien",
      body: "Série T2 FLAIR reprise, artefacts de mouvement corrigés.",
      createdAt: iso(35),
    },
    {
      id: "tm-2",
      channelId: "techniciens-medecins",
      authorId: "med-kettani",
      authorName: "Dr. Anas Kettani",
      authorRole: "Médecin",
      body: "Parfait, je relis la série dans la console de lecture.",
      createdAt: iso(31),
    },
    {
      id: "tm-3",
      channelId: "techniciens-medecins",
      authorId: "tech-hassan",
      authorName: "Hassan El Fassi",
      authorRole: "Technicien",
      body: "Note vocale sur le protocole d'injection.",
      createdAt: iso(28),
      attachment: {
        kind: "audio",
        durationSec: 18,
        transcript: "Protocole injection scanner thoracique",
      },
    },
  ],
  general: [
    {
      id: "gn-1",
      channelId: "general",
      authorId: "dir-adnane",
      authorName: "Mr Adnane",
      authorRole: "Directeur",
      body: "Réunion qualité vendredi à 17h en salle de staff. Merci de confirmer votre présence.",
      createdAt: iso(180),
    },
    {
      id: "gn-2",
      channelId: "general",
      authorId: "accueil-imane",
      authorName: "Imane Rachidi",
      authorRole: "Accueil",
      body: "Maintenance de l'IRM programmée samedi matin, planning adapté.",
      createdAt: iso(120),
    },
  ],
};
