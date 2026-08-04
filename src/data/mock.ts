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

export const patients: Patient[] = [
  { id: "PAT-1042", nom: "Karim Bennani", cin: "BE884512", age: 47, telephone: "06 61 23 45 78", mutuelle: "CNSS", ville: "Casablanca", dernierExamen: "IRM Cérébrale" },
  { id: "PAT-1043", nom: "Fatima Idrissi", cin: "BK112904", age: 62, telephone: "06 62 88 14 03", mutuelle: "CNOPS", ville: "Rabat", dernierExamen: "Scanner Thoracique" },
  { id: "PAT-1044", nom: "Youssef El Amrani", cin: "JC554120", age: 35, telephone: "06 70 45 92 11", mutuelle: "AMO", ville: "Casablanca", dernierExamen: "Radio Thorax" },
  { id: "PAT-1045", nom: "Salma Chraibi", cin: "BJ330871", age: 29, telephone: "06 55 71 20 66", mutuelle: "Privée", ville: "Mohammedia", dernierExamen: "Échographie Abdominale" },
  { id: "PAT-1046", nom: "Abdelkrim Ouazzani", cin: "AD902314", age: 71, telephone: "06 61 09 88 42", mutuelle: "CNOPS", ville: "Salé", dernierExamen: "IRM Lombaire" },
  { id: "PAT-1047", nom: "Nadia Berrada", cin: "BH471029", age: 41, telephone: "06 68 33 47 90", mutuelle: "CNSS", ville: "Casablanca", dernierExamen: "Mammographie" },
  { id: "PAT-1048", nom: "Hicham Tazi", cin: "BE223019", age: 53, telephone: "06 77 12 65 34", mutuelle: "AMO", ville: "Berrechid", dernierExamen: "Scanner Abdominal" },
  { id: "PAT-1049", nom: "Meryem Alaoui", cin: "BB781203", age: 38, telephone: "06 60 54 19 87", mutuelle: "Privée", ville: "Casablanca", dernierExamen: "Échographie Pelvienne" },
  { id: "PAT-1050", nom: "Rachid Lamrani", cin: "CD330912", age: 58, telephone: "06 66 20 74 51", mutuelle: "CNSS", ville: "El Jadida", dernierExamen: "Radio Genou" },
  { id: "PAT-1051", nom: "Zineb Sekkat", cin: "BK992014", age: 33, telephone: "06 63 45 12 09", mutuelle: "AMO", ville: "Casablanca", dernierExamen: "IRM Genou" },
  { id: "PAT-1052", nom: "Omar Benjelloun", cin: "BJ118742", age: 66, telephone: "06 61 78 90 23", mutuelle: "CNOPS", ville: "Rabat", dernierExamen: "Scanner Cérébral" },
  { id: "PAT-1053", nom: "Khadija Ait Bouzid", cin: "JB554901", age: 45, telephone: "06 69 31 08 77", mutuelle: "AMO", ville: "Settat", dernierExamen: "Échographie Thyroïde" },
  { id: "PAT-1054", nom: "Mehdi Fassi Fihri", cin: "BE770125", age: 51, telephone: "06 62 14 39 88", mutuelle: "Privée", ville: "Casablanca", dernierExamen: "IRM Épaule" },
  { id: "PAT-1055", nom: "Amina Hakimi", cin: "BH229471", age: 27, telephone: "06 71 66 21 40", mutuelle: "CNSS", ville: "Casablanca", dernierExamen: "Radio Poignet" },
];

export const actesParSemaine = [
  { semaine: "S18", IRM: 42, Scanner: 55, Echographie: 78, Radio: 96 },
  { semaine: "S19", IRM: 48, Scanner: 61, Echographie: 84, Radio: 88 },
  { semaine: "S20", IRM: 39, Scanner: 47, Echographie: 71, Radio: 102 },
  { semaine: "S21", IRM: 55, Scanner: 66, Echographie: 90, Radio: 110 },
  { semaine: "S22", IRM: 51, Scanner: 58, Echographie: 86, Radio: 94 },
  { semaine: "S23", IRM: 60, Scanner: 72, Echographie: 95, Radio: 118 },
];

export type SalleAttente = {
  heure: string;
  patient: string;
  examen: string;
  medecin: string;
  statut: "En attente" | "En cours" | "Préparation";
};

export const salleAttente: SalleAttente[] = [
  { heure: "09:10", patient: "Karim Bennani", examen: "IRM Cérébrale", medecin: "Dr. Naima Skalli", statut: "En cours" },
  { heure: "09:35", patient: "Fatima Idrissi", examen: "Scanner Thoracique", medecin: "Dr. Anas Kettani", statut: "Préparation" },
  { heure: "10:00", patient: "Salma Chraibi", examen: "Échographie Abdominale", medecin: "Dr. Leila Amrani", statut: "En attente" },
  { heure: "10:20", patient: "Abdelkrim Ouazzani", examen: "IRM Lombaire", medecin: "Dr. Naima Skalli", statut: "En attente" },
  { heure: "10:45", patient: "Hicham Tazi", examen: "Scanner Abdominal", medecin: "Dr. Mounir Belkadi", statut: "En attente" },
  { heure: "11:15", patient: "Nadia Berrada", examen: "Mammographie", medecin: "Dr. Leila Amrani", statut: "En attente" },
];

export type Alerte = {
  id: string;
  titre: string;
  detail: string;
  niveau: "critique" | "eleve" | "moyen";
  temps: string;
};

export const alertes: Alerte[] = [
  { id: "FA-2291", titre: "Montant hors norme", detail: "IRM facturée 4 800 MAD (barème : 2 500 MAD)", niveau: "critique", temps: "il y a 12 min" },
  { id: "FA-2288", titre: "Sur-prescription", detail: "4 scanners pour le même patient en 9 jours", niveau: "eleve", temps: "il y a 48 min" },
  { id: "FA-2284", titre: "Incohérence des actes", detail: "Échographie pelvienne sur dossier masculin", niveau: "critique", temps: "il y a 2 h" },
  { id: "FA-2279", titre: "Doublon de facturation", detail: "Facture FCT-8841 saisie deux fois (CNOPS)", niveau: "moyen", temps: "il y a 5 h" },
  { id: "FA-2275", titre: "Mutuelle expirée", detail: "Prise en charge CNSS non valide au 01/08", niveau: "moyen", temps: "hier" },
];

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

export const factures: Facture[] = [
  { id: "FCT-8912", date: "04/08/2026", patient: "Karim Bennani", examen: "IRM Cérébrale", total: 2500, partMutuelle: 1750, resteACharge: 750, paiement: "Carte bancaire", statut: "Payé" },
  { id: "FCT-8911", date: "04/08/2026", patient: "Fatima Idrissi", examen: "Scanner Thoracique", total: 1400, partMutuelle: 1120, resteACharge: 280, paiement: "Espèces", statut: "En attente de mutuelle" },
  { id: "FCT-8910", date: "03/08/2026", patient: "Salma Chraibi", examen: "Échographie Abdominale", total: 450, partMutuelle: 0, resteACharge: 450, paiement: "Espèces", statut: "Payé" },
  { id: "FCT-8909", date: "03/08/2026", patient: "Abdelkrim Ouazzani", examen: "IRM Lombaire", total: 2500, partMutuelle: 2000, resteACharge: 500, paiement: "Chèque", statut: "En attente de mutuelle" },
  { id: "FCT-8908", date: "03/08/2026", patient: "Nadia Berrada", examen: "Mammographie", total: 700, partMutuelle: 490, resteACharge: 210, paiement: "Carte bancaire", statut: "Payé" },
  { id: "FCT-8907", date: "02/08/2026", patient: "Hicham Tazi", examen: "Scanner Abdominal", total: 1600, partMutuelle: 1120, resteACharge: 480, paiement: "Virement", statut: "Annulé" },
  { id: "FCT-8906", date: "02/08/2026", patient: "Meryem Alaoui", examen: "Échographie Pelvienne", total: 400, partMutuelle: 0, resteACharge: 400, paiement: "Espèces", statut: "Payé" },
  { id: "FCT-8905", date: "01/08/2026", patient: "Omar Benjelloun", examen: "Scanner Cérébral", total: 1500, partMutuelle: 1200, resteACharge: 300, paiement: "Carte bancaire", statut: "En attente de mutuelle" },
];

export type Medecin = {
  id: string;
  nom: string;
  specialite: string;
  adresse: string;
  telephone: string;
  referes: number;
  evolution: number;
};

export const medecins: Medecin[] = [
  { id: "MED-01", nom: "Dr. Naima Skalli", specialite: "Neurologie", adresse: "12 Bd Anfa, Casablanca", telephone: "05 22 47 18 90", referes: 38, evolution: 12 },
  { id: "MED-02", nom: "Dr. Anas Kettani", specialite: "Pneumologie", adresse: "45 Av. Hassan II, Rabat", telephone: "05 37 70 22 41", referes: 31, evolution: -4 },
  { id: "MED-03", nom: "Dr. Leila Amrani", specialite: "Gynécologie", adresse: "8 Rue Ibn Batouta, Casablanca", telephone: "05 22 26 55 10", referes: 44, evolution: 21 },
  { id: "MED-04", nom: "Dr. Mounir Belkadi", specialite: "Gastro-entérologie", adresse: "Résidence Al Manar, Mohammedia", telephone: "05 23 31 09 77", referes: 22, evolution: 6 },
  { id: "MED-05", nom: "Dr. Samir Ouahbi", specialite: "Traumatologie", adresse: "3 Rue Al Massira, Settat", telephone: "05 23 40 12 88", referes: 27, evolution: 9 },
  { id: "MED-06", nom: "Dr. Houda Benkirane", specialite: "Rhumatologie", adresse: "76 Bd Zerktouni, Casablanca", telephone: "05 22 94 63 20", referes: 19, evolution: -2 },
  { id: "MED-07", nom: "Dr. Tarik Bouzoubaa", specialite: "Médecine générale", adresse: "Quartier Riad, Salé", telephone: "05 37 88 41 06", referes: 35, evolution: 15 },
  { id: "MED-08", nom: "Dr. Sanae Filali", specialite: "Endocrinologie", adresse: "21 Av. Mohammed V, El Jadida", telephone: "05 23 37 55 42", referes: 16, evolution: 3 },
];

export type FactureSuspecte = {
  id: string;
  date: string;
  patient: string;
  montant: number;
  raison: string;
  score: number;
};

export const facturesSuspectes: FactureSuspecte[] = [
  { id: "FCT-8841", date: "01/08/2026", patient: "Karim Bennani", montant: 4800, raison: "Montant hors norme", score: 92 },
  { id: "FCT-8836", date: "31/07/2026", patient: "Hicham Tazi", montant: 6400, raison: "Sur-prescription", score: 87 },
  { id: "FCT-8829", date: "30/07/2026", patient: "Meryem Alaoui", montant: 400, raison: "Incohérence des actes", score: 78 },
  { id: "FCT-8822", date: "29/07/2026", patient: "Omar Benjelloun", montant: 3000, raison: "Doublon de facturation", score: 64 },
  { id: "FCT-8815", date: "28/07/2026", patient: "Rachid Lamrani", montant: 2900, raison: "Mutuelle expirée", score: 58 },
  { id: "FCT-8808", date: "27/07/2026", patient: "Zineb Sekkat", montant: 5200, raison: "Montant hors norme", score: 81 },
  { id: "FCT-8801", date: "26/07/2026", patient: "Khadija Ait Bouzid", montant: 1350, raison: "Acte non prescrit", score: 47 },
  { id: "FCT-8795", date: "25/07/2026", patient: "Mehdi Fassi Fihri", montant: 7500, raison: "Sur-prescription", score: 95 },
  { id: "FCT-8788", date: "24/07/2026", patient: "Amina Hakimi", montant: 980, raison: "Incohérence des actes", score: 52 },
  { id: "FCT-8780", date: "23/07/2026", patient: "Nadia Berrada", montant: 2100, raison: "Doublon de facturation", score: 69 },
];

export const formatMAD = (n: number) =>
  new Intl.NumberFormat("fr-MA", { maximumFractionDigits: 0 }).format(n) + " MAD";
