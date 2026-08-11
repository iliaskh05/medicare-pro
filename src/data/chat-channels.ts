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
