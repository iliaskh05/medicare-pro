/* Base de données locale des médecins correspondants (mappée depuis l'API Java). */

export type Referent = {
  id: string;
  nom: string;
  specialite: string;
  ville: "Casablanca" | "Rabat" | "Témara" | "Mohammédia" | "Salé";
  quartier: string;
  adresse: string;
  telephone: string;
  email: string;
  patientsAdresses: number;
  dernierEnvoi: string;
  actif: boolean;
};

export const referents: Referent[] = [
  {
    id: "REF-001",
    nom: "Dr. Naima Skalli",
    specialite: "Neurologie",
    ville: "Rabat",
    quartier: "Agdal",
    adresse: "12, avenue de France, imm. B, 3e étage",
    telephone: "+212 6 61 22 14 08",
    email: "n.skalli@cabinet-rabat.ma",
    patientsAdresses: 48,
    dernierEnvoi: "2026-08-10",
    actif: true,
  },
  {
    id: "REF-002",
    nom: "Dr. Anas Kettani",
    specialite: "Pneumologie",
    ville: "Témara",
    quartier: "Centre-ville",
    adresse: "45, boulevard Mohammed V, résidence Al Manar",
    telephone: "+212 6 70 55 41 92",
    email: "a.kettani@pneumo-temara.ma",
    patientsAdresses: 36,
    dernierEnvoi: "2026-08-09",
    actif: true,
  },
  {
    id: "REF-003",
    nom: "Dr. Leila Amrani",
    specialite: "Gynécologie",
    ville: "Rabat",
    quartier: "Hay Riad",
    adresse: "8, rue Al Yamama, clinique Agdal",
    telephone: "+212 6 12 87 33 40",
    email: "l.amrani@clinique-agdal.ma",
    patientsAdresses: 31,
    dernierEnvoi: "2026-08-08",
    actif: true,
  },
  {
    id: "REF-004",
    nom: "Dr. Youssef Bengaied",
    specialite: "Gastro-entérologie",
    ville: "Témara",
    quartier: "Massira",
    adresse: "27, avenue Hassan II, imm. Zohra",
    telephone: "+212 6 45 09 77 21",
    email: "y.bengaied@gastro-temara.ma",
    patientsAdresses: 27,
    dernierEnvoi: "2026-08-07",
    actif: true,
  },
  {
    id: "REF-005",
    nom: "Dr. Samira Oufkir",
    specialite: "Rhumatologie",
    ville: "Rabat",
    quartier: "Hassan",
    adresse: "3, rue Patrice Lumumba, cabinet 4",
    telephone: "+212 6 33 41 18 76",
    email: "s.oufkir@rhumato-hassan.ma",
    patientsAdresses: 22,
    dernierEnvoi: "2026-08-05",
    actif: true,
  },
  {
    id: "REF-006",
    nom: "Dr. Mehdi Chraibi",
    specialite: "Orthopédie",
    ville: "Salé",
    quartier: "Bettana",
    adresse: "16, avenue Al Mansour Eddahbi",
    telephone: "+212 6 55 62 30 14",
    email: "m.chraibi@ortho-sale.ma",
    patientsAdresses: 19,
    dernierEnvoi: "2026-08-04",
    actif: true,
  },
  {
    id: "REF-007",
    nom: "Dr. Hind Berrada",
    specialite: "Cardiologie",
    ville: "Casablanca",
    quartier: "Maârif",
    adresse: "62, rue Jabal Toubkal, résidence Yasmine",
    telephone: "+212 6 21 74 55 09",
    email: "h.berrada@cardio-maarif.ma",
    patientsAdresses: 15,
    dernierEnvoi: "2026-07-30",
    actif: false,
  },
  {
    id: "REF-008",
    nom: "Dr. Omar Lahlou",
    specialite: "Urologie",
    ville: "Témara",
    quartier: "Ain Atiq",
    adresse: "9, route de Casablanca, centre médical Atlas",
    telephone: "+212 6 88 12 44 65",
    email: "o.lahlou@uro-temara.ma",
    patientsAdresses: 12,
    dernierEnvoi: "2026-07-28",
    actif: true,
  },
  {
    id: "REF-009",
    nom: "Dr. Rachid Ouazzani",
    specialite: "Neurologie",
    ville: "Mohammédia",
    quartier: "Al Alia",
    adresse: "21, boulevard Abderrahim Bouabid",
    telephone: "+212 6 90 31 20 77",
    email: "r.ouazzani@neuro-mohammedia.ma",
    patientsAdresses: 9,
    dernierEnvoi: "2026-07-24",
    actif: false,
  },
  {
    id: "REF-010",
    nom: "Dr. Salma Idrissi",
    specialite: "Pédiatrie",
    ville: "Rabat",
    quartier: "Agdal",
    adresse: "5, rue Oued Sebou, imm. Nakhil",
    telephone: "+212 6 44 90 12 33",
    email: "s.idrissi@pediatrie-agdal.ma",
    patientsAdresses: 7,
    dernierEnvoi: "2026-07-21",
    actif: true,
  },
];

export const referentVilles = [
  "Casablanca",
  "Rabat",
  "Témara",
  "Mohammédia",
  "Salé",
] as const satisfies readonly Referent["ville"][];

export const referentSpecialites = Array.from(new Set(referents.map((r) => r.specialite))).sort();
