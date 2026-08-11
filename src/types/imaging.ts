/** Types de la visionneuse d'imagerie et du moteur d'analyse. */

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

export type ClusterSignal = {
  id: string;
  nom: string;
  description: string;
  taille: number;
  densite: number;
  risque: "critique" | "eleve" | "moyen" | "faible";
  /** Points projetés en % du canevas */
  points: { x: number; y: number; r: number }[];
};

export type PredictionFraude = {
  factureId: string;
  probabilite: number;
  cluster: string;
  facteurs: { libelle: string; poids: number }[];
};

export type EtapeChatbot =
  | "Accueil"
  | "Qualification"
  | "Rendez-vous"
  | "Rappel"
  | "Conclu"
  | "Abandon";

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
