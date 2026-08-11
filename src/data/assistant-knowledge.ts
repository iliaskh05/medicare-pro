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
    path: "/patient/demo",
    nom: "Dossier patient",
    motsCles: ["dossier patient", "historique", "ordonnance", "antécédent", "fiche patient"],
    resume:
      "Dossier patient complet : historique, imagerie, ordonnances, facturation et panneau d'analyse IA du moteur de conformité.",
    aides: [
      "Les onglets de gauche regroupent l'historique médical, les examens, les ordonnances et la facturation.",
      "Le panneau de droite affiche un score de risque et le clustering des signaux faibles.",
      "Toute conclusion affichée fait l'objet d'une analyse IA : la validation humaine reste obligatoire.",
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
    path: "/imagerie",
    nom: "Imagerie",
    motsCles: [
      "imagerie",
      "examen",
      "examens",
      "irm",
      "scanner",
      "échographie",
      "mammographie",
      "modalité",
    ],
    resume:
      "Liste des examens acquis par modalité (IRM, scanner, radiologie, mammographie) avec leur statut de lecture.",
    aides: [
      "Filtrez par modalité pour retrouver un examen précis.",
      "Le bouton « Visionneuse IA » ouvre les images avec le calque de segmentation IA.",
      "Le statut indique si le compte rendu reste à valider par le radiologue.",
    ],
  },
  {
    path: "/viewer",
    nom: "Visionneuse IA",
    motsCles: ["visionneuse", "viewer", "image", "calque", "segmentation", "compte rendu", "cr"],
    resume:
      "Visionneuse d'images avec calque d'analyse IA, outils de mesure et génération de compte rendu structuré.",
    aides: [
      "Le commutateur « Activer le calque IA » superpose les zones détectées  .",
      "Les résultats affichés ne constituent jamais un diagnostic : validation humaine obligatoire.",
      "L'export PDF produit un document de conformité.",
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
    resume:
      "Annuaire des médecins prescripteurs : spécialité, volume d'adressages et coordonnées.",
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
