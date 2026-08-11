/**
 * Types métier du CRM radiologique (production).
 * Aucune donnée n'est stockée ici : toutes les valeurs proviennent du backend.
 */

export type Mutuelle = "AMO" | "CNSS" | "CNOPS" | "Privée";

export type Patient = {
  id: string;
  nom: string;
  cin: string;
  age: number;
  telephone: string;
  mutuelle: Mutuelle;
  ville: string;
  dernierExamen: string;
};

export type SalleAttente = {
  heure: string;
  patient: string;
  examen: string;
  medecin: string;
  statut: "En attente" | "En cours" | "Préparation";
};

export type Alerte = {
  id: string;
  titre: string;
  detail: string;
  niveau: "critique" | "eleve" | "moyen";
  temps: string;
};

export type Facture = {
  id: string;
  date: string;
  patient: string;
  examen: string;
  total: number;
  partMutuelle: number;
  resteACharge: number;
  paiement: "Espèces" | "Carte bancaire" | "Chèque" | "Virement";
  statut: "Payé" | "En attente de mutuelle" | "Annulé";
};

export type Medecin = {
  id: string;
  nom: string;
  specialite: string;
  adresse: string;
  telephone: string;
  referes: number;
  evolution: number;
};

export type FactureSuspecte = {
  id: string;
  date: string;
  patient: string;
  montant: number;
  raison: string;
  score: number;
};

export type PlanningSlot = {
  day: string;
  dayLabel: string;
  slot: "Matin" | "Midi" | "Après-midi";
  level: "libre" | "occupé" | "saturé" | "critique";
};

export type UrgenceFraude = {
  id: string;
  patient: string;
  anomalie: string;
  score: number;
  temps: string;
};

export type SyntheseComptable = {
  validated: number;
  pending: number;
  lastExport: string | null;
};

/** Nomenclature des actes proposés par le centre (référentiel, non des données patients). */
export const typesExamen = [
  "IRM Cérébrale",
  "IRM Lombaire",
  "IRM Genou",
  "Scanner Thoracique",
  "Scanner Abdominal",
  "Scanner Cérébral",
  "Échographie Abdominale",
  "Échographie Thyroïde",
  "Mammographie",
  "Radio Thorax",
  "Radio Genou",
];

/** Formatage monétaire dirham marocain. */
export const formatMAD = (n: number) =>
  new Intl.NumberFormat("fr-MA", { maximumFractionDigits: 0 }).format(n) + " MAD";
