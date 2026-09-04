/**
 * Base de connaissances locale de l'« Assistant RadioCRM ».
 * 100 % déterministe : aucun appel réseau, aucun LLM.
 */

export type AssistantRole = "directeur" | "accueil" | "technicien" | "medecin";

export type AssistantPage = {
  path: string;
  nom: string;
  /** Mots-clés qui permettent de reconnaître la page dans une question. */
  motsCles: string[];
  resume: string;
  aides: string[];
};

export const assistantPages: AssistantPage[] = [
  {
    path: "/dashboard",
    nom: "Tableau de bord",
    motsCles: ["dashboard", "tableau", "bord", "accueil", "kpi", "indicateur", "pilotage"],
    resume:
      "Vue de pilotage du centre : indicateurs du centre, tension du planning, alertes de conformité et synthèse comptable.",
    aides: [
      "Les cartes du haut résument les actes réalisés, le chiffre d'affaires du centre et le taux d'occupation.",
      "La heatmap « Tension du planning » repère les demi-journées surchargées.",
      "Le widget « Urgences Fraude & Anomalies » liste les 3 dernières alertes à traiter.",
    ],
  },
  {
    path: "/patients",
    nom: "Patients",
    motsCles: ["patient", "patients", "dossier", "dossiers", "fiche", "ajouter un patient"],
    resume:
      "Répertoire des patients du centre : recherche, filtres, statut de prise en charge et accès au dossier détaillé.",
    aides: [
      "Pour ajouter un patient : bouton « Nouveau patient » en haut à droite, puis renseignez identité, téléphone et mutuelle.",
      "La colonne « Dossier » permet de télécharger une pièce jointe au format PDF.",
      "Le bouton « Voir dossier » ouvre le dossier patient.",
    ],
  },
  {
    path: "/facturation",
    nom: "Facturation",
    motsCles: [
      "facture",
      "facturation",
      "encaissement",
      "mad",
      "dh",
      "paiement",
      "acompte",
      "caisse",
    ],
    resume:
      "Suivi des factures en dirhams : encaissements, acomptes, restes à payer et export comptable.",
    aides: [
      "Pour enregistrer une facture : bouton « Nouvelle facture », choisissez l'acte, la mutuelle puis le mode de règlement.",
      "Les lignes en rouge signalent un solde impayé alors que les clichés ont déjà été remis.",
      "L'export comptable génère un fichier CSV téléchargeable.",
    ],
  },
  {
    path: "/worklist",
    nom: "Worklist",
    motsCles: [
      "imagerie",
      "examen",
      "examens",
      "irm",
      "scanner",
      "échographie",
      "mammographie",
      "modalité",
      "worklist",
      "file",
    ],
    resume:
      "File d'attente des examens du jour : état patient, salle, modalité, compte rendu et paiement.",
    aides: [
      "Filtrez par modalité, salle ou radiologue pour retrouver un examen.",
      "Ouvrez le dossier patient pour imprimer l'étiquette liée à ce dossier.",
      "Le statut indique si le compte rendu reste à valider par le radiologue.",
    ],
  },
  {
    path: "/numerisation",
    nom: "Numérisation & étiquettes",
    motsCles: ["étiquette", "autocollant", "numérisation", "document", "impression"],
    resume:
      "Import de documents au dossier patient et impression d'étiquette / auto-collant liés au dossier.",
    aides: [
      "Recherchez le patient par CIN, n° dossier ou nom avant d'imprimer.",
      "Le menu propose étiquette, auto-collant, ou les deux.",
    ],
  },
  {
    path: "/audit",
    nom: "Audit & Conformité",
    motsCles: ["audit", "conformité", "fraude", "anomalie", "clustering", "risque", "alerte"],
    resume:
      "Détection d'anomalies de facturation : score de risque, clustering des signaux faibles et validation humaine.",
    aides: [
      "Pour traiter une alerte : ouvrez la ligne, lisez les motifs suspects, puis choisissez « Valider » ou « Faux positif ».",
      "Le curseur de sensibilité fait varier le nombre d'alertes remontées par le moteur de conformité.",
      "Chaque décision est tracée : aucune alerte n'est clôturée automatiquement.",
    ],
  },
  {
    path: "/medecins",
    nom: "Médecins prescripteurs",
    motsCles: ["médecin", "medecins", "prescripteur", "correspondant", "confrère"],
    resume: "Annuaire des médecins prescripteurs : spécialité, volume d'adressages et coordonnées.",
    aides: [
      "Utilisez la recherche pour retrouver un prescripteur par nom ou spécialité.",
      "Les volumes d'adressage aident à identifier les correspondants les plus actifs.",
    ],
  },
  {
    path: "/chat",
    nom: "Messagerie interne",
    motsCles: ["messagerie", "chat", "interne", "équipe", "discussion", "confrere"],
    resume:
      "Messagerie sécurisée entre radiologues, techniciens et secrétariat : groupes, échanges privés, images, vocaux et PDF.",
    aides: [
      "La colonne de gauche sépare les groupes et les conversations privées.",
      "La zone de saisie permet de joindre une photo, un vocal ou un document  .",
    ],
  },
  {
    path: "/whatsapp",
    nom: "Chatbot WhatsApp",
    motsCles: ["whatsapp", "chatbot", "bot", "rappel", "sms", "message patient", "relance"],
    resume:
      "Console WhatsApp : prise de rendez-vous, préparation d'examen, questions mutuelle, rappels J-1 et transfert au secrétariat.",
    aides: [
      "Pour envoyer un rappel : ouvrez la conversation puis « Rappel J-1 » dans la barre de scénarios.",
      "Le bouton « Prise en charge secrétariat » bascule la conversation du bot vers un agent humain.",
      "« Effacer la conversation » restaure toutes les conversations d'origine.",
    ],
  },
];

export const assistantSuggestionsParRole: Record<AssistantRole, string[]> = {
  directeur: [
    "Explique-moi les indicateurs du tableau de bord",
    "Comment traiter une alerte de conformité ?",
    "Comment exporter la comptabilité ?",
  ],
  accueil: [
    "Comment enregistrer une facture ?",
    "Comment créer un dossier patient ?",
    "Comment envoyer un rappel WhatsApp ?",
  ],
  technicien: [
    "Où consulter les examens du jour ?",
    "Comment transmettre une série au médecin ?",
    "Comment fonctionne le calque IA ?",
  ],
  medecin: [
    "Où consulter les examens ?",
    "Comment générer un compte rendu ?",
    "Comment fonctionne le calque IA ?",
  ],
};

export const assistantSuggestionsGenerales = [
  "Comment ajouter un patient ?",
  "Comment enregistrer une facture ?",
  "Où consulter les examens ?",
  "Comment envoyer un rappel WhatsApp ?",
];
