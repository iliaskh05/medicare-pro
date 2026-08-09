import scanIrm from "@/assets/scan-irm-cerebrale.jpg";
import scanRadio from "@/assets/scan-radio-thorax.jpg";
import scanCt from "@/assets/scan-scanner-abdominal.jpg";

/* ---------------------------------- Messagerie interne ---------------------------------- */

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

export const conversationsInternes: ConversationInterne[] = [
  {
    id: "CONV-01",
    medecin: "Dr. Naima Skalli",
    specialite: "Neurologie",
    initiales: "NS",
    enLigne: true,
    nonLus: 2,
    dernierMessage: "Merci, je relis l'IRM de M. Bennani avant 17h.",
    messages: [
      { id: "m1", auteur: "moi", texte: "Bonjour Docteur, l'IRM cérébrale de Karim Bennani est disponible sur le PACS.", heure: "14:02" },
      { id: "m2", auteur: "medecin", texte: "Parfait. Le patient a-t-il signalé des céphalées nocturnes ?", heure: "14:09" },
      { id: "m3", auteur: "moi", texte: "Oui, depuis 3 semaines, noté au dossier PAT-1042.", heure: "14:11" },
      { id: "m4", auteur: "medecin", texte: "Merci, je relis l'IRM de M. Bennani avant 17h.", heure: "14:15" },
    ],
  },
  {
    id: "CONV-02",
    medecin: "Dr. Anas Kettani",
    specialite: "Pneumologie",
    initiales: "AK",
    enLigne: true,
    nonLus: 1,
    dernierMessage: "Reprogrammez le scanner de Mme Idrissi à jeudi svp.",
    messages: [
      { id: "m1", auteur: "medecin", texte: "Reprogrammez le scanner de Mme Idrissi à jeudi svp.", heure: "11:48" },
    ],
  },
  {
    id: "CONV-03",
    medecin: "Dr. Leila Amrani",
    specialite: "Gynécologie",
    initiales: "LA",
    enLigne: false,
    nonLus: 0,
    dernierMessage: "Compte rendu de mammographie envoyé, merci.",
    messages: [
      { id: "m1", auteur: "medecin", texte: "Compte rendu de mammographie envoyé, merci.", heure: "hier · 18:20" },
      { id: "m2", auteur: "moi", texte: "Bien reçu Docteur, transmis à la patiente.", heure: "hier · 18:34" },
    ],
  },
  {
    id: "CONV-04",
    medecin: "Dr. Mounir Belkadi",
    specialite: "Gastro-entérologie",
    initiales: "MB",
    enLigne: false,
    nonLus: 0,
    dernierMessage: "Pouvez-vous me confirmer la prise en charge CNOPS ?",
    messages: [
      { id: "m1", auteur: "medecin", texte: "Pouvez-vous me confirmer la prise en charge CNOPS ?", heure: "hier · 09:12" },
    ],
  },
];

/* ------------------------------- Chatbot WhatsApp patients ------------------------------ */

export type EtapeChatbot = "Accueil" | "Qualification" | "Rendez-vous" | "Rappel" | "Conclu" | "Abandon";

export type InteractionWhatsApp = {
  id: string;
  patient: string;
  telephone: string;
  dernierMessage: string;
  etape: EtapeChatbot;
  intention: string;
  messages: number;
  reponseMoyenne: string;
  satisfaction: number | null;
  priseEnCharge: "Bot" | "Secrétariat";
  maj: string;
};

export const interactionsWhatsApp: InteractionWhatsApp[] = [
  { id: "WA-4412", patient: "Karim Bennani", telephone: "06 61 23 45 78", dernierMessage: "Merci, je serai là à 9h.", etape: "Conclu", intention: "Confirmation RDV IRM", messages: 8, reponseMoyenne: "12 s", satisfaction: 5, priseEnCharge: "Bot", maj: "il y a 6 min" },
  { id: "WA-4411", patient: "Fatima Idrissi", telephone: "06 62 88 14 03", dernierMessage: "Est-ce que la CNOPS couvre le scanner ?", etape: "Qualification", intention: "Question mutuelle", messages: 5, reponseMoyenne: "18 s", satisfaction: null, priseEnCharge: "Secrétariat", maj: "il y a 21 min" },
  { id: "WA-4410", patient: "Salma Chraibi", telephone: "06 55 71 20 66", dernierMessage: "Quels documents dois-je apporter ?", etape: "Rendez-vous", intention: "Préparation examen", messages: 11, reponseMoyenne: "9 s", satisfaction: 4, priseEnCharge: "Bot", maj: "il y a 43 min" },
  { id: "WA-4409", patient: "Abdelkrim Ouazzani", telephone: "06 61 09 88 42", dernierMessage: "—", etape: "Abandon", intention: "Demande de tarif IRM", messages: 3, reponseMoyenne: "31 s", satisfaction: null, priseEnCharge: "Bot", maj: "il y a 1 h" },
  { id: "WA-4408", patient: "Nadia Berrada", telephone: "06 68 33 47 90", dernierMessage: "Rappel reçu, c'est noté.", etape: "Rappel", intention: "Rappel J-1 mammographie", messages: 4, reponseMoyenne: "7 s", satisfaction: 5, priseEnCharge: "Bot", maj: "il y a 2 h" },
  { id: "WA-4407", patient: "Hicham Tazi", telephone: "06 77 12 65 34", dernierMessage: "Je souhaite déplacer mon scanner.", etape: "Rendez-vous", intention: "Report de RDV", messages: 9, reponseMoyenne: "15 s", satisfaction: 3, priseEnCharge: "Secrétariat", maj: "il y a 3 h" },
  { id: "WA-4406", patient: "Meryem Alaoui", telephone: "06 60 54 19 87", dernierMessage: "Bonjour, mes résultats sont-ils prêts ?", etape: "Accueil", intention: "Retrait de résultats", messages: 2, reponseMoyenne: "11 s", satisfaction: null, priseEnCharge: "Bot", maj: "il y a 4 h" },
  { id: "WA-4405", patient: "Zineb Sekkat", telephone: "06 63 45 12 09", dernierMessage: "Merci beaucoup !", etape: "Conclu", intention: "Prise de RDV IRM genou", messages: 12, reponseMoyenne: "10 s", satisfaction: 5, priseEnCharge: "Bot", maj: "hier" },
];

export const volumeWhatsApp = [
  { jour: "Lun", conversations: 34, resolues: 27 },
  { jour: "Mar", conversations: 41, resolues: 33 },
  { jour: "Mer", conversations: 38, resolues: 31 },
  { jour: "Jeu", conversations: 47, resolues: 39 },
  { jour: "Ven", conversations: 52, resolues: 45 },
  { jour: "Sam", conversations: 29, resolues: 24 },
  { jour: "Dim", conversations: 12, resolues: 9 },
];

/* --------------------------------- Visionneuse de scans -------------------------------- */

export type AnnotationScan = {
  id: string;
  libelle: string;
  description: string;
  /** Position en % de l'image */
  x: number;
  y: number;
  w: number;
  h: number;
  severite: "critique" | "suspect" | "normal";
  confiance: number;
};

export type Scan = {
  id: string;
  patient: string;
  examen: string;
  date: string;
  medecin: string;
  image: string;
  annotations: AnnotationScan[];
};

export const scans: Scan[] = [
  {
    id: "SCN-3301",
    patient: "Karim Bennani",
    examen: "IRM Cérébrale",
    date: "04/08/2026",
    medecin: "Dr. Naima Skalli",
    image: scanIrm,
    annotations: [
      { id: "A1", libelle: "Hypersignal frontal droit", description: "Zone de 9 mm, contours flous — contrôle recommandé à 3 mois.", x: 55, y: 20, w: 16, h: 14, severite: "critique", confiance: 91 },
      { id: "A2", libelle: "Asymétrie ventriculaire", description: "Léger élargissement du ventricule latéral gauche.", x: 30, y: 46, w: 18, h: 16, severite: "suspect", confiance: 74 },
      { id: "A3", libelle: "Parenchyme occipital", description: "Aspect normal, aucune anomalie détectée.", x: 42, y: 74, w: 18, h: 14, severite: "normal", confiance: 96 },
    ],
  },
  {
    id: "SCN-3298",
    patient: "Youssef El Amrani",
    examen: "Radio Thorax",
    date: "03/08/2026",
    medecin: "Dr. Anas Kettani",
    image: scanRadio,
    annotations: [
      { id: "A1", libelle: "Opacité lobe inférieur gauche", description: "Opacité alvéolaire compatible avec un foyer infectieux.", x: 57, y: 52, w: 20, h: 18, severite: "critique", confiance: 88 },
      { id: "A2", libelle: "Index cardio-thoracique", description: "Mesuré à 0,52 — limite supérieure de la normale.", x: 38, y: 55, w: 22, h: 20, severite: "suspect", confiance: 66 },
    ],
  },
  {
    id: "SCN-3295",
    patient: "Hicham Tazi",
    examen: "Scanner Abdominal",
    date: "02/08/2026",
    medecin: "Dr. Mounir Belkadi",
    image: scanCt,
    annotations: [
      { id: "A1", libelle: "Nodule para-vertébral", description: "Nodule de 6 mm, densité tissulaire homogène.", x: 46, y: 33, w: 14, h: 13, severite: "suspect", confiance: 79 },
      { id: "A2", libelle: "Structures osseuses", description: "Corticales continues, pas de lyse visible.", x: 40, y: 60, w: 22, h: 16, severite: "normal", confiance: 94 },
    ],
  },
];

/* ------------------------------ Audit : clustering & fraude ----------------------------- */

export type ClusterSignal = {
  id: string;
  nom: string;
  description: string;
  taille: number;
  densite: number;
  risque: "critique" | "eleve" | "moyen" | "faible";
  /** Points projetés (t-SNE simulé) en % du canevas */
  points: { x: number; y: number; r: number }[];
};

export const clusters: ClusterSignal[] = [
  {
    id: "CL-01",
    nom: "Cluster A — Sur-prescription IRM",
    description: "12 dossiers partageant le même prescripteur et un intervalle d'examens < 10 jours.",
    taille: 12,
    densite: 0.82,
    risque: "critique",
    points: [
      { x: 22, y: 28, r: 7 }, { x: 28, y: 22, r: 5 }, { x: 18, y: 35, r: 6 },
      { x: 31, y: 33, r: 8 }, { x: 25, y: 40, r: 5 }, { x: 15, y: 25, r: 4 },
    ],
  },
  {
    id: "CL-02",
    nom: "Cluster B — Montants atypiques CNOPS",
    description: "Écart moyen de +38 % au barème sur les actes de scanner facturés en fin de mois.",
    taille: 9,
    densite: 0.67,
    risque: "eleve",
    points: [
      { x: 63, y: 30, r: 6 }, { x: 70, y: 26, r: 7 }, { x: 66, y: 38, r: 5 },
      { x: 74, y: 36, r: 4 }, { x: 60, y: 41, r: 6 },
    ],
  },
  {
    id: "CL-03",
    nom: "Cluster C — Doublons de saisie",
    description: "Factures créées à moins de 4 minutes d'intervalle pour le même acte.",
    taille: 7,
    densite: 0.54,
    risque: "moyen",
    points: [
      { x: 40, y: 68, r: 5 }, { x: 46, y: 72, r: 6 }, { x: 36, y: 76, r: 4 },
      { x: 49, y: 64, r: 5 },
    ],
  },
  {
    id: "CL-04",
    nom: "Cluster D — Comportement nominal",
    description: "Groupe de référence : facturation conforme au barème et prescriptions espacées.",
    taille: 1780,
    densite: 0.31,
    risque: "faible",
    points: [
      { x: 78, y: 68, r: 9 }, { x: 84, y: 74, r: 7 }, { x: 72, y: 76, r: 6 },
      { x: 86, y: 62, r: 5 }, { x: 79, y: 80, r: 6 },
    ],
  },
];

export type PredictionFraude = {
  factureId: string;
  probabilite: number;
  cluster: string;
  facteurs: { libelle: string; poids: number }[];
};

export const predictionsFraude: PredictionFraude[] = [
  { factureId: "FCT-8841", probabilite: 0.93, cluster: "Cluster A", facteurs: [{ libelle: "Montant / barème", poids: 0.41 }, { libelle: "Fréquence des actes", poids: 0.33 }, { libelle: "Historique prescripteur", poids: 0.19 }] },
  { factureId: "FCT-8836", probabilite: 0.87, cluster: "Cluster A", facteurs: [{ libelle: "Fréquence des actes", poids: 0.48 }, { libelle: "Même prescripteur", poids: 0.27 }] },
  { factureId: "FCT-8829", probabilite: 0.74, cluster: "Cluster C", facteurs: [{ libelle: "Cohérence acte / dossier", poids: 0.52 }, { libelle: "Saisie manuelle", poids: 0.18 }] },
  { factureId: "FCT-8822", probabilite: 0.61, cluster: "Cluster C", facteurs: [{ libelle: "Doublon horaire", poids: 0.44 }, { libelle: "Mutuelle", poids: 0.12 }] },
  { factureId: "FCT-8815", probabilite: 0.55, cluster: "Cluster B", facteurs: [{ libelle: "Validité mutuelle", poids: 0.39 }] },
  { factureId: "FCT-8808", probabilite: 0.84, cluster: "Cluster B", facteurs: [{ libelle: "Montant / barème", poids: 0.57 }, { libelle: "Fin de mois", poids: 0.16 }] },
  { factureId: "FCT-8801", probabilite: 0.44, cluster: "Cluster D", facteurs: [{ libelle: "Acte non prescrit", poids: 0.31 }] },
  { factureId: "FCT-8795", probabilite: 0.96, cluster: "Cluster A", facteurs: [{ libelle: "Fréquence des actes", poids: 0.55 }, { libelle: "Montant / barème", poids: 0.3 }] },
  { factureId: "FCT-8788", probabilite: 0.49, cluster: "Cluster C", facteurs: [{ libelle: "Cohérence acte / dossier", poids: 0.35 }] },
  { factureId: "FCT-8780", probabilite: 0.66, cluster: "Cluster C", facteurs: [{ libelle: "Doublon horaire", poids: 0.4 }] },
];

export const predictionParFacture = new Map(predictionsFraude.map((p) => [p.factureId, p]));
