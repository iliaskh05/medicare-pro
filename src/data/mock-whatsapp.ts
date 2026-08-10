export type WaMessage = {
  id: string;
  auteur: "patient" | "bot";
  texte: string;
  heure: string;
  piece?: { nom: string; taille: string };
};

export type WaStatut = "IA" | "Attente" | "Secrétariat";

export type WaConversation = {
  id: string;
  patient: string;
  initiales: string;
  telephone: string;
  dossier: string;
  mutuelle: string;
  statut: WaStatut;
  nonLus: number;
  derniereHeure: string;
  apercu: string;
  messages: WaMessage[];
};

export const conversationsWhatsApp: WaConversation[] = [
  {
    id: "WA-01",
    patient: "Karim Bennani",
    initiales: "KB",
    telephone: "+212 661 45 88 12",
    dossier: "PAT-1042",
    mutuelle: "CNSS",
    statut: "IA",
    nonLus: 2,
    derniereHeure: "09:41",
    apercu: "Parfait, je confirme jeudi 10h30 alors 🙏",
    messages: [
      { id: "m1", auteur: "patient", texte: "Bonjour, mon médecin m'a prescrit une IRM lombaire. Comment prendre rendez-vous ?", heure: "09:12" },
      { id: "m2", auteur: "bot", texte: "Bonjour M. Bennani 👋 Bienvenue au Centre d'Imagerie Al Amal. Je peux vous réserver un créneau pour une IRM du rachis lombaire. Avez-vous votre ordonnance avec vous ?", heure: "09:13" },
      { id: "m3", auteur: "patient", texte: "Oui, ordonnance du Dr. Naima Skalli, datée du 4 août.", heure: "09:16" },
      { id: "m4", auteur: "bot", texte: "Merci. Voici les créneaux disponibles pour l'IRM lombaire :\n• Jeudi 13/08 à 10h30\n• Vendredi 14/08 à 08h15\n• Samedi 15/08 à 11h00\nQuel créneau vous conviendrait ?", heure: "09:18" },
      { id: "m5", auteur: "patient", texte: "Jeudi 10h30 c'est parfait.", heure: "09:33" },
      { id: "m6", auteur: "bot", texte: "Rendez-vous confirmé ✅\nIRM rachis lombaire — Jeudi 13/08 à 10h30\nSalle IRM 1, 2e étage. Merci d'arriver 15 min avant avec votre CIN, votre ordonnance et votre carte CNSS. Tarif conventionné : 1 450 MAD (part patient estimée : 290 MAD).", heure: "09:35" },
      { id: "m7", auteur: "patient", texte: "Parfait, je confirme jeudi 10h30 alors 🙏", heure: "09:41" },
    ],
  },
  {
    id: "WA-02",
    patient: "Fatima Zahra Idrissi",
    initiales: "FI",
    telephone: "+212 662 09 77 41",
    dossier: "PAT-0987",
    mutuelle: "CNOPS",
    statut: "Attente",
    nonLus: 1,
    derniereHeure: "08:58",
    apercu: "Est-ce que je dois être à jeun pour le scanner ?",
    messages: [
      { id: "m1", auteur: "patient", texte: "Bonjour, j'ai un scanner abdominal demain matin.", heure: "08:54" },
      { id: "m2", auteur: "bot", texte: "Bonjour Mme Idrissi. Votre scanner abdominal est bien prévu mardi 11/08 à 09h00.", heure: "08:55" },
      { id: "m3", auteur: "patient", texte: "Est-ce que je dois être à jeun pour le scanner ?", heure: "08:58" },
    ],
  },
  {
    id: "WA-03",
    patient: "Youssef El Amrani",
    initiales: "YE",
    telephone: "+212 670 32 14 05",
    dossier: "PAT-1120",
    mutuelle: "AMO",
    statut: "Secrétariat",
    nonLus: 0,
    derniereHeure: "Hier",
    apercu: "Je transmets votre demande au secrétariat 📞",
    messages: [
      { id: "m1", auteur: "patient", texte: "Je souhaite annuler mon échographie et être remboursé.", heure: "17:20" },
      { id: "m2", auteur: "bot", texte: "Je comprends. Les demandes de remboursement sont traitées par notre secrétariat. Je transmets votre demande au secrétariat 📞", heure: "17:21" },
    ],
  },
  {
    id: "WA-04",
    patient: "Salma Benjelloun",
    initiales: "SB",
    telephone: "+212 655 88 20 63",
    dossier: "PAT-1077",
    mutuelle: "Saham",
    statut: "IA",
    nonLus: 0,
    derniereHeure: "Hier",
    apercu: "Votre compte rendu de mammographie est disponible 📄",
    messages: [
      { id: "m1", auteur: "patient", texte: "Bonjour, mon compte rendu de mammographie est-il prêt ?", heure: "15:02" },
      { id: "m2", auteur: "bot", texte: "Bonjour Mme Benjelloun. Votre compte rendu de mammographie est disponible 📄", heure: "15:03", piece: { nom: "CR_Mammographie_SB.pdf", taille: "412 Ko" } },
    ],
  },
  {
    id: "WA-05",
    patient: "Abdelhak Tazi",
    initiales: "AT",
    telephone: "+212 668 11 47 29",
    dossier: "PAT-1198",
    mutuelle: "Sans mutuelle",
    statut: "Attente",
    nonLus: 3,
    derniereHeure: "Lundi",
    apercu: "Combien coûte une radio du genou svp ?",
    messages: [
      { id: "m1", auteur: "patient", texte: "Salam, combien coûte une radio du genou svp ?", heure: "10:44" },
    ],
  },
];

export const reponsesDemo = {
  ia: "Bien sûr 😊 Pour une IRM lombaire, l'examen dure environ 20 minutes et ne nécessite aucune injection. Souhaitez-vous que je vous envoie la fiche de préparation ?",
  rdv: "Nouveau rendez-vous enregistré ✅\nIRM rachis lombaire — Jeudi 13/08 à 10h30 (Salle IRM 1)\nUn rappel automatique vous sera envoyé 24h avant.",
  pdf: "Voici votre compte rendu signé par le radiologue 📄",
};
