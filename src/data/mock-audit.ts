/* Données factices du module Audit & Conformité (détection d'anomalies de facturation) */

export type TypeExamen = "IRM" | "Scanner" | "Échographie" | "Mammographie" | "Radiologie";

export type MotifSuspect =
  | "Montant atypique"
  | "Fréquence rapprochée"
  | "Fréquence anormale"
  | "Horaire atypique"
  | "Doublon de saisie"
  | "Acte non prescrit"
  | "Incohérence dossier"
  | "Mutuelle expirée"
  | "Signal faible"
  | "Comportement nominal";

export type StatutAnomalie = "pending" | "confirmed" | "dismissed";

export type Anomalie = {
  id: string;
  patient: string;
  cin: string;
  acte: string;
  typeExamen: TypeExamen;
  date: string; // ISO
  montant: number;
  bareme: number;
  score: number; // 0 → 100
  motifs: MotifSuspect[];
  cluster: string;
  prescripteur: string;
  mutuelle: string;
  statut: StatutAnomalie;
};

export const anomalies: Anomalie[] = [
  {
    id: "FCT-8912",
    patient: "Karim Bennani",
    cin: "BE448291",
    acte: "IRM Cérébrale (2 séquences)",
    typeExamen: "IRM",
    date: "2026-08-07",
    montant: 4800,
    bareme: 2500,
    score: 94,
    motifs: ["Montant atypique", "Fréquence rapprochée"],
    cluster: "Cluster A — Sur-prescription IRM",
    prescripteur: "Dr. Naima Skalli",
    mutuelle: "CNOPS",
    statut: "pending",
  },
  {
    id: "FCT-8903",
    patient: "Hicham Tazi",
    acte: "Scanner Abdominal avec injection",
    cin: "TA109774",
    typeExamen: "Scanner",
    date: "2026-08-06",
    montant: 6400,
    bareme: 1600,
    score: 91,
    motifs: ["Montant atypique", "Doublon de saisie"],
    cluster: "Cluster B — Montants atypiques CNOPS",
    prescripteur: "Dr. Mounir Belkadi",
    mutuelle: "CNSS",
    statut: "pending",
  },
  {
    id: "FCT-8897",
    patient: "Mehdi Fassi Fihri",
    cin: "FF230118",
    acte: "IRM Lombaire",
    typeExamen: "IRM",
    date: "2026-08-06",
    montant: 7500,
    bareme: 2500,
    score: 88,
    motifs: ["Doublon de saisie", "Montant atypique"],
    cluster: "Cluster A — Sur-prescription IRM",
    prescripteur: "Dr. Anas Kettani",
    mutuelle: "AMO",
    statut: "pending",
  },
  {
    id: "FCT-8884",
    patient: "Zineb Sekkat",
    cin: "SE778120",
    acte: "IRM Genou droit",
    typeExamen: "IRM",
    date: "2026-08-05",
    montant: 5200,
    bareme: 2200,
    score: 82,
    motifs: ["Fréquence rapprochée"],
    cluster: "Cluster A — Sur-prescription IRM",
    prescripteur: "Dr. Naima Skalli",
    mutuelle: "CNOPS",
    statut: "pending",
  },
  {
    id: "FCT-8871",
    patient: "Meryem Alaoui",
    cin: "AL556003",
    acte: "Échographie Pelvienne",
    typeExamen: "Échographie",
    date: "2026-08-04",
    montant: 1200,
    bareme: 400,
    score: 76,
    motifs: ["Incohérence dossier"],
    cluster: "Cluster C — Doublons de saisie",
    prescripteur: "Dr. Leila Amrani",
    mutuelle: "Sanlam",
    statut: "pending",
  },
  {
    id: "FCT-8862",
    patient: "Omar Benjelloun",
    cin: "BJ441907",
    acte: "Scanner Cérébral",
    typeExamen: "Scanner",
    date: "2026-08-03",
    montant: 2900,
    bareme: 1500,
    score: 71,
    motifs: ["Montant atypique"],
    cluster: "Cluster B — Montants atypiques CNOPS",
    prescripteur: "Dr. Mounir Belkadi",
    mutuelle: "CNSS",
    statut: "pending",
  },
  {
    id: "FCT-8854",
    patient: "Nadia Berrada",
    cin: "BR330491",
    acte: "Mammographie bilatérale",
    typeExamen: "Mammographie",
    date: "2026-08-02",
    montant: 1450,
    bareme: 700,
    score: 68,
    motifs: ["Fréquence rapprochée", "Mutuelle expirée"],
    cluster: "Cluster C — Doublons de saisie",
    prescripteur: "Dr. Leila Amrani",
    mutuelle: "AXA Assurance",
    statut: "pending",
  },
  {
    id: "FCT-8846",
    patient: "Abdelkrim Ouazzani",
    cin: "OU882316",
    acte: "IRM Lombaire (contrôle)",
    typeExamen: "IRM",
    date: "2026-08-01",
    montant: 3100,
    bareme: 2500,
    score: 61,
    motifs: ["Fréquence rapprochée"],
    cluster: "Cluster A — Sur-prescription IRM",
    prescripteur: "Dr. Anas Kettani",
    mutuelle: "CNOPS",
    statut: "pending",
  },
  {
    id: "FCT-8838",
    patient: "Salma Chraibi",
    cin: "CH192884",
    acte: "Échographie Abdominale",
    typeExamen: "Échographie",
    date: "2026-07-31",
    montant: 780,
    bareme: 450,
    score: 55,
    motifs: ["Acte non prescrit"],
    cluster: "Cluster C — Doublons de saisie",
    prescripteur: "Dr. Leila Amrani",
    mutuelle: "AMO",
    statut: "pending",
  },
  {
    id: "FCT-8829",
    patient: "Youssef El Amrani",
    cin: "EA660145",
    acte: "Radio Thorax (face + profil)",
    typeExamen: "Radiologie",
    date: "2026-07-30",
    montant: 620,
    bareme: 250,
    score: 52,
    motifs: ["Montant atypique"],
    cluster: "Cluster C — Doublons de saisie",
    prescripteur: "Dr. Anas Kettani",
    mutuelle: "CNSS",
    statut: "pending",
  },
  {
    id: "FCT-8817",
    patient: "Amina Hakimi",
    cin: "HA774510",
    acte: "Radio Poignet gauche",
    typeExamen: "Radiologie",
    date: "2026-07-28",
    montant: 430,
    bareme: 250,
    score: 47,
    motifs: ["Incohérence dossier"],
    cluster: "Cluster D — Comportement nominal",
    prescripteur: "Dr. Mounir Belkadi",
    mutuelle: "AMO",
    statut: "pending",
  },
  {
    id: "FCT-8805",
    patient: "Fatima Idrissi",
    cin: "ID228970",
    acte: "Scanner Thoracique",
    typeExamen: "Scanner",
    date: "2026-07-26",
    montant: 1720,
    bareme: 1400,
    score: 41,
    motifs: ["Mutuelle expirée"],
    cluster: "Cluster D — Comportement nominal",
    prescripteur: "Dr. Naima Skalli",
    mutuelle: "CNOPS",
    statut: "pending",
  },
];

export const tendanceAnomalies = [
  { semaine: "S24", anomalies: 9, confirmees: 4 },
  { semaine: "S25", anomalies: 14, confirmees: 6 },
  { semaine: "S26", anomalies: 11, confirmees: 5 },
  { semaine: "S27", anomalies: 17, confirmees: 9 },
  { semaine: "S28", anomalies: 21, confirmees: 12 },
  { semaine: "S29", anomalies: 16, confirmees: 8 },
  { semaine: "S30", anomalies: 24, confirmees: 15 },
  { semaine: "S31", anomalies: 19, confirmees: 11 },
];

export const auditKpis = {
  dossiersAnalyses: 1842,
  dossiersAnalysesDelta: 8.4,
  tauxConformite: 96.3,
  tauxConformiteDelta: 0.7,
  montantEnJeu: 41_100,
};

export const typesExamen: TypeExamen[] = [
  "IRM",
  "Scanner",
  "Échographie",
  "Mammographie",
  "Radiologie",
];
