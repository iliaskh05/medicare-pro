import scanIrm from "@/assets/scan-irm-cerebrale.jpg";
import scanRadio from "@/assets/scan-radio-thorax.jpg";

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

/** Groupes de travail du centre */
export const groupesTravail: ChatChannel[] = [
  {
    id: "room-staff",
    name: "Staff Médical",
    subtitle: "8 membres · radiologues & techniciens",
    initiales: "SM",
    nonLus: 3,
    dernierMessage: "Dr. Skalli : CR de l'IRM lombaire relu et signé.",
  },
  {
    id: "room-urgences-irm",
    name: "Urgences IRM",
    subtitle: "5 membres · astreinte 24/7",
    initiales: "UI",
    nonLus: 1,
    dernierMessage: "Technicien Amine : créneau libéré à 21h30.",
  },
  {
    id: "room-direction",
    name: "Direction",
    subtitle: "3 membres · pilotage & conformité",
    initiales: "DR",
    nonLus: 0,
    dernierMessage: "Export comptable de la semaine transmis au cabinet.",
  },
];

/** Discussions privées */
export const discussionsPrivees: ChatChannel[] = [
  {
    id: "dm-skalli",
    name: "Dr. Naima Skalli",
    subtitle: "Neuroradiologue",
    initiales: "NS",
    enLigne: true,
    nonLus: 2,
    dernierMessage: "Je relis l'IRM de M. Bennani avant 17h.",
  },
  {
    id: "dm-tazi",
    name: "Dr. Omar Tazi",
    subtitle: "Radiologue thoracique",
    initiales: "OT",
    enLigne: true,
    nonLus: 0,
    dernierMessage: "Merci pour le cliché, opacité confirmée.",
  },
  {
    id: "dm-amine",
    name: "Amine Rachidi",
    subtitle: "Technicien scanner",
    initiales: "AR",
    enLigne: false,
    nonLus: 1,
    dernierMessage: "Injection préparée pour le patient de 15h.",
  },
  {
    id: "dm-souad",
    name: "Souad Bahri",
    subtitle: "Secrétaire médicale",
    initiales: "SB",
    enLigne: true,
    nonLus: 0,
    dernierMessage: "Mutuelle CNOPS validée, reste 240 MAD.",
  },
];

const today = (h: number, m: number) => {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

export const seedMessages: ChatSeedMessage[] = [
  /* --- Staff Médical --- */
  {
    id: "seed-staff-1",
    roomId: "room-staff",
    senderId: "tech-amine",
    senderName: "Amine Rachidi (technicien)",
    body: "Acquisition terminée pour Karim Bennani (PAT-1042) — IRM cérébrale, 4 séries.",
    createdAt: today(9, 12),
  },
  {
    id: "seed-staff-2",
    roomId: "room-staff",
    senderId: "tech-amine",
    senderName: "Amine Rachidi (technicien)",
    body: "Coupe axiale T2 la plus parlante :",
    createdAt: today(9, 14),
    attachment: {
      kind: "image",
      url: scanIrm,
      caption: "IRM cérébrale — coupe axiale T2",
      meta: "PAT-1042 · série 3/4 · 512×512",
    },
  },
  {
    id: "seed-staff-3",
    roomId: "room-staff",
    senderId: "doc-skalli",
    senderName: "Dr. Naima Skalli",
    body: "Bien reçu, hypersignal péri-ventriculaire à surveiller. Dictée ci-dessous.",
    createdAt: today(9, 26),
    attachment: {
      kind: "audio",
      durationSec: 42,
      transcript: "Dictée vocale — conclusion IRM PAT-1042",
    },
  },
  {
    id: "seed-staff-4",
    roomId: "room-staff",
    senderId: "doc-skalli",
    senderName: "Dr. Naima Skalli",
    body: "CR de l'IRM lombaire relu et signé.",
    createdAt: today(10, 3),
    attachment: {
      kind: "file",
      name: "CR_IRM_lombaire_PAT-1088.pdf",
      size: "248 Ko",
      pages: 2,
    },
  },

  /* --- Urgences IRM --- */
  {
    id: "seed-urg-1",
    roomId: "room-urgences-irm",
    senderId: "doc-tazi",
    senderName: "Dr. Omar Tazi",
    body: "Patient adressé des urgences CHU Ibn Rochd : suspicion d'embolie, besoin d'un créneau angio-scanner.",
    createdAt: today(20, 41),
  },
  {
    id: "seed-urg-2",
    roomId: "room-urgences-irm",
    senderId: "tech-amine",
    senderName: "Amine Rachidi (technicien)",
    body: "Créneau libéré à 21h30, salle 2 prête.",
    createdAt: today(20, 52),
    attachment: {
      kind: "audio",
      durationSec: 18,
      transcript: "Message vocal — organisation salle 2",
    },
  },
  {
    id: "seed-urg-3",
    roomId: "room-urgences-irm",
    senderId: "tech-amine",
    senderName: "Amine Rachidi (technicien)",
    body: "Cliché thoracique de contrôle avant injection :",
    createdAt: today(21, 5),
    attachment: {
      kind: "image",
      url: scanRadio,
      caption: "Radiographie thoracique de face",
      meta: "PAT-1157 · contrôle pré-injection",
    },
  },

  /* --- Direction --- */
  {
    id: "seed-dir-1",
    roomId: "room-direction",
    senderId: "admin-alaoui",
    senderName: "Mr Adnane (direction)",
    body: "Rapport de conformité hebdomadaire — 3 anomalies confirmées sur 412 dossiers.",
    createdAt: today(8, 30),
    attachment: {
      kind: "file",
      name: "Rapport_conformite_S32_comptable.pdf",
      size: "1,1 Mo",
      pages: 6,
    },
  },
  {
    id: "seed-dir-2",
    roomId: "room-direction",
    senderId: "sec-souad",
    senderName: "Souad Bahri (secrétariat)",
    body: "Export comptable de la semaine transmis au cabinet comptable.",
    createdAt: today(8, 47),
  },

  /* --- Discussions privées --- */
  {
    id: "seed-dm-skalli-1",
    roomId: "dm-skalli",
    senderId: "doc-skalli",
    senderName: "Dr. Naima Skalli",
    body: "Le patient signale des céphalées nocturnes depuis 3 semaines ?",
    createdAt: today(14, 9),
  },
  {
    id: "seed-dm-skalli-2",
    roomId: "dm-skalli",
    senderId: "doc-skalli",
    senderName: "Dr. Naima Skalli",
    body: "Je relis l'IRM de M. Bennani avant 17h.",
    createdAt: today(14, 15),
    attachment: {
      kind: "audio",
      durationSec: 27,
      transcript: "Message vocal — plan de relecture",
    },
  },
  {
    id: "seed-dm-tazi-1",
    roomId: "dm-tazi",
    senderId: "doc-tazi",
    senderName: "Dr. Omar Tazi",
    body: "Merci pour le cliché, opacité du lobe inférieur droit confirmée.",
    createdAt: today(11, 22),
    attachment: {
      kind: "image",
      url: scanRadio,
      caption: "Radio thorax — lobe inférieur droit",
      meta: "PAT-1203 · face debout",
    },
  },
  {
    id: "seed-dm-amine-1",
    roomId: "dm-amine",
    senderId: "tech-amine",
    senderName: "Amine Rachidi",
    body: "Injection de produit de contraste préparée pour le patient de 15h.",
    createdAt: today(14, 40),
  },
  {
    id: "seed-dm-souad-1",
    roomId: "dm-souad",
    senderId: "sec-souad",
    senderName: "Souad Bahri",
    body: "Mutuelle CNOPS validée : reste à charge 240 MAD. Facture jointe.",
    createdAt: today(12, 5),
    attachment: {
      kind: "file",
      name: "Facture_FAC-2026-0481.pdf",
      size: "96 Ko",
      pages: 1,
    },
  },
];
