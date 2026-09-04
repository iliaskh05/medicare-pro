import {
  assistantPages,
  assistantSuggestionsGenerales,
  assistantSuggestionsParRole,
  type AssistantPage,
  type AssistantRole,
} from "@/data/assistant-knowledge";

const roleLabels: Record<AssistantRole, string> = {
  directeur: "Directeur (Mr Adnane)",
  accueil: "Accueil",
  technicien: "Technicien",
  medecin: "Médecin",
};

export type AssistantAction =
  | { kind: "navigate"; label: string; to: string }
  | { kind: "prompt"; label: string; prompt: string };

export type AssistantReply = {
  intent: string;
  text: string;
  actions: AssistantAction[];
};

export type AssistantContext = {
  pathname: string;
  role: AssistantRole;
};

const normalise = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

function findPageByPath(pathname: string): AssistantPage | undefined {
  return (
    assistantPages.find((p) => p.path === pathname) ??
    assistantPages.find((p) => pathname.startsWith(p.path) && p.path !== "/")
  );
}

function findPageByQuery(query: string): AssistantPage | undefined {
  const q = normalise(query);
  let best: { page: AssistantPage; score: number } | undefined;
  for (const page of assistantPages) {
    let score = 0;
    for (const mot of page.motsCles) {
      if (q.includes(normalise(mot))) score += normalise(mot).length;
    }
    if (score > 0 && (!best || score > best.score)) best = { page, score };
  }
  return best?.page;
}

function pageActions(page: AssistantPage): AssistantAction[] {
  return [
    { kind: "navigate", label: `Ouvrir ${page.nom}`, to: page.path },
    { kind: "prompt", label: `Aide sur ${page.nom}`, prompt: `Comment utiliser ${page.nom} ?` },
  ];
}

function describePage(page: AssistantPage, intent: string): AssistantReply {
  return {
    intent,
    text: `**${page.nom}** — ${page.resume}\n\n${page.aides.map((a) => `• ${a}`).join("\n")}`,
    actions: pageActions(page),
  };
}

type Rule = {
  intent: string;
  motsCles: string[];
  build: (ctx: AssistantContext) => AssistantReply;
};

const rules: Rule[] = [
  {
    intent: "salutation",
    motsCles: ["bonjour", "salut", "bonsoir", "salam", "hello"],
    build: (ctx) => ({
      intent: "salutation",
      text: `Bonjour 👋 Je suis l'Assistant RadioCRM. Je vous guide dans l'utilisation de la plateforme : navigation, explication des écrans et des indicateurs du centre.\n\nProfil actif : **${roleLabels[ctx.role]}** (rôle utilisateur (Mr Adnane)).`,
      actions: [
        {
          kind: "prompt",
          label: "Que puis-je faire ici ?",
          prompt: "Que puis-je faire sur cette page ?",
        },
        { kind: "navigate", label: "Aller au tableau de bord", to: "/dashboard" },
      ],
    }),
  },
  {
    intent: "capacites",
    motsCles: ["que sais-tu", "que peux-tu", "aide", "aidez", "help", "capacite", "fonction"],
    build: (ctx) => ({
      intent: "capacites",
      text: "Je peux :\n• expliquer le rôle de chaque écran ;\n• vous y conduire directement ;\n• détailler les indicateurs et les alertes de conformité ;\n• décrire les procédures courantes (patient, facture, examen, rappel WhatsApp).\n\nToutes mes réponses sont locales et déterministes : aucun modèle externe n'est appelé.",
      actions: assistantSuggestionsParRole[ctx.role].map((prompt) => ({
        kind: "prompt" as const,
        label: prompt,
        prompt,
      })),
    }),
  },
  {
    intent: "page-courante",
    motsCles: [
      "cette page",
      "page actuelle",
      "ou suis-je",
      "ici",
      "cet ecran",
      "a quoi sert cette",
      "que puis-je faire",
    ],
    build: (ctx) => {
      const page = findPageByPath(ctx.pathname);
      if (!page) {
        return {
          intent: "page-courante",
          text: "Je ne reconnais pas cet écran. Choisissez une destination et je vous explique son fonctionnement.",
          actions: assistantPages
            .slice(0, 4)
            .map((p) => ({ kind: "navigate" as const, label: p.nom, to: p.path })),
        };
      }
      return describePage(page, "page-courante");
    },
  },
  {
    intent: "ajouter-patient",
    motsCles: [
      "ajouter un patient",
      "creer un patient",
      "nouveau patient",
      "enregistrer un patient",
    ],
    build: () => ({
      intent: "ajouter-patient",
      text: "**Ajouter un patient**\n1. Ouvrez la page Patients.\n2. Cliquez sur « Nouveau patient ».\n3. Renseignez identité, téléphone, mutuelle (AMO, CNSS, CNOPS ou privée).\n4. Enregistrez : le dossier apparaît en haut de la liste.\n\nLes données sont traitées localement par le moteur de conformité.",
      actions: [{ kind: "navigate", label: "Ouvrir Patients", to: "/patients" }],
    }),
  },
  {
    intent: "enregistrer-facture",
    motsCles: [
      "enregistrer une facture",
      "creer une facture",
      "nouvelle facture",
      "facturer",
      "encaisser",
    ],
    build: () => ({
      intent: "enregistrer-facture",
      text: "**Enregistrer une facture**\n1. Ouvrez Facturation.\n2. Cliquez sur « Nouvelle facture ».\n3. Sélectionnez le patient et l'acte (les tarifs sont exprimés en MAD).\n4. Indiquez l'acompte éventuel puis le mode de règlement.\n5. Validez : le reste à payer est recalculé automatiquement.",
      actions: [
        { kind: "navigate", label: "Ouvrir Facturation", to: "/facturation" },
        {
          kind: "prompt",
          label: "Comment exporter la comptabilité ?",
          prompt: "Comment exporter la comptabilité ?",
        },
      ],
    }),
  },
  {
    intent: "export-comptable",
    motsCles: ["export", "exporter", "comptabilite", "csv", "comptable"],
    build: (ctx) => ({
      intent: "export-comptable",
      text:
        ctx.role === "directeur"
          ? "**Export comptable** — depuis Facturation ou Audit, le bouton d'export produit un fichier CSV téléchargeable, correspondant aux lignes actuellement filtrées."
          : "L'export comptable est réservé au profil **Directeur**. Connectez-vous avec un compte Directeur pour y accéder.",
      actions: [{ kind: "navigate", label: "Ouvrir Facturation", to: "/facturation" }],
    }),
  },
  {
    intent: "traiter-alerte",
    motsCles: ["alerte", "conformite", "anomalie", "fraude", "traiter une alerte", "faux positif"],
    build: () => ({
      intent: "traiter-alerte",
      text: "**Traiter une alerte de conformité**\n1. Ouvrez Audit & Conformité.\n2. Repérez la ligne au score de risque le plus élevé.\n3. Consultez les motifs suspects dans la fiche détaillée.\n4. Choisissez « Valider l'anomalie » ou « Faux positif ».\n\nLes scores proviennent d'un moteur de conformité : **validation humaine obligatoire**, aucune décision n'est automatique.",
      actions: [{ kind: "navigate", label: "Ouvrir Audit", to: "/audit" }],
    }),
  },
  {
    intent: "rappel-whatsapp",
    motsCles: ["rappel", "relance", "whatsapp", "sms", "prevenir le patient", "notifier"],
    build: () => ({
      intent: "rappel-whatsapp",
      text: "**Envoyer un rappel WhatsApp  **\n1. Ouvrez la console Chatbot WhatsApp.\n2. Sélectionnez la conversation du patient.\n3. Dans la barre de scénarios, cliquez sur « Rappel J-1 ».\n4. Le patient reçoit trois réponses rapides : Confirmer, Reporter, Annuler.\n\nLes messages sont gérés via le moteur de conformité local.",
      actions: [{ kind: "navigate", label: "Ouvrir WhatsApp", to: "/whatsapp" }],
    }),
  },
  {
    intent: "consulter-examens",
    motsCles: [
      "consulter les examens",
      "ou sont les examens",
      "voir les examens",
      "liste des examens",
    ],
    build: () => ({
      intent: "consulter-examens",
      text: "**Consulter les examens** — la worklist regroupe les examens du jour par patient, salle et modalité. Ouvrez un dossier patient pour l'historique, ou la numérisation pour joindre des pièces et imprimer des étiquettes.",
      actions: [
        { kind: "navigate", label: "Ouvrir la worklist", to: "/worklist" },
        { kind: "navigate", label: "Numérisation & étiquettes", to: "/numerisation" },
      ],
    }),
  },
  {
    intent: "kpi",
    motsCles: ["kpi", "indicateur", "chiffre", "statistique", "taux", "graphique"],
    build: () => ({
      intent: "kpi",
      text: "**Indicateurs du tableau de bord  **\n• Actes réalisés : nombre d'examens finalisés sur la période.\n• Chiffre d'affaires : total facturé en MAD, acomptes inclus.\n• Taux d'occupation : remplissage des créneaux de la semaine.\n• Taux de conformité : part des dossiers sans anomalie détectée.\n\nCes valeurs sont générées à partir des données du centre.",
      actions: [{ kind: "navigate", label: "Ouvrir le tableau de bord", to: "/dashboard" }],
    }),
  },
  {
    intent: "role",
    motsCles: ["role", "profil", "droit", "permission", "rbac", "directeur", "radiologue"],
    build: (ctx) => ({
      intent: "role",
      text: `**Gestion des rôles** — chaque compte est associé à un seul type d'utilisateur (Directeur, Secrétariat, Manipulateur ou Radiologue). Les droits sont définis à la connexion ; aucun changement de rôle n'est possible depuis le profil.\n\nProfil actif : **${roleLabels[ctx.role]}**.`,
      actions: [{ kind: "navigate", label: "Ouvrir le tableau de bord", to: "/dashboard" }],
    }),
  },
  {
    intent: "confidentialite",
    motsCles: ["donnee", "reelle", "confidentialite", "rgpd", "cndp", "securite", "vrai"],
    build: () => ({
      intent: "confidentialite",
      text: "Cette plateforme est une **interface de gestion** : patients, montants et analyses sont issus du moteur local. Aucune donnée médicale réelle, aucune clé d'API et aucun service externe ne sont utilisés.",
      actions: [],
    }),
  },
];

export function assistantQuickActionsForRoute(ctx: AssistantContext): AssistantAction[] {
  const page = findPageByPath(ctx.pathname);
  const base: AssistantAction[] = page
    ? [
        {
          kind: "prompt",
          label: `À quoi sert ${page.nom} ?`,
          prompt: `À quoi sert la page ${page.nom} ?`,
        },
      ]
    : [];
  const roleSuggestions = assistantSuggestionsParRole[ctx.role].map((prompt) => ({
    kind: "prompt" as const,
    label: prompt,
    prompt,
  }));
  return [...base, ...roleSuggestions].slice(0, 4);
}

export function assistantWelcome(ctx: AssistantContext): AssistantReply {
  const page = findPageByPath(ctx.pathname);
  return {
    intent: "accueil",
    text: `Bonjour, je suis l'**Assistant RadioCRM** 👋\n\n${
      page
        ? `Vous êtes sur **${page.nom}**. ${page.resume}`
        : "Choisissez une destination pour commencer."
    }\n\n_Assistant enrichi par Gemini (avec repli local si indisponible)._`,
    actions: assistantQuickActionsForRoute(ctx),
  };
}

export function resolveAssistantReply(input: string, ctx: AssistantContext): AssistantReply {
  const q = normalise(input);
  if (!q.trim()) return assistantWelcome(ctx);

  // 1. Navigation explicite : « va sur », « ouvre », « emmène-moi »
  if (/(va |aller|ouvre|ouvrir|emmene|montre|affiche|navigue)/.test(q)) {
    const page = findPageByQuery(q);
    if (page) {
      return {
        intent: "navigation",
        text: `Je vous emmène sur **${page.nom}**. ${page.resume}`,
        actions: [{ kind: "navigate", label: `Ouvrir ${page.nom}`, to: page.path }],
      };
    }
  }

  // 2. Règles métier par mots-clés (score = longueur du mot-clé le plus spécifique)
  let bestRule: { rule: Rule; score: number } | undefined;
  for (const rule of rules) {
    for (const mot of rule.motsCles) {
      const m = normalise(mot);
      if (q.includes(m) && (!bestRule || m.length > bestRule.score)) {
        bestRule = { rule, score: m.length };
      }
    }
  }

  // 3. Une page reconnue plus précisément qu'une règle générique l'emporte
  const page = findPageByQuery(q);
  if (page && (!bestRule || bestRule.score < 6)) return describePage(page, "page");
  if (bestRule) return bestRule.rule.build(ctx);
  if (page) return describePage(page, "page");

  // 4. Réponse de repli
  return {
    intent: "repli",
    text: "Je n'ai pas de réponse pour cette formulation. Essayez l'une de ces questions :",
    actions: assistantSuggestionsGenerales.map((prompt) => ({
      kind: "prompt" as const,
      label: prompt,
      prompt,
    })),
  };
}
