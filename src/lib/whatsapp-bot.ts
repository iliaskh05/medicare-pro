import type { WaConversation, WaMessage, WaQuickReply, WaStatut } from "@/types/whatsapp";

/** Message produit par le moteur, avant attribution d'un identifiant et d'une heure. */
export type WaDraftMessage = Omit<WaMessage, "id" | "heure">;

export type WaScenario =
  | "rdv"
  | "preparation-irm"
  | "preparation-scanner"
  | "preparation-echographie"
  | "preparation-mammographie"
  | "assurance"
  | "rappel"
  | "compte-rendu"
  | "handoff";

export const MENTION_SIMULATION = "ℹ️ Message simulé — à confirmer par le secrétariat du centre.";

const preparationTextes: Record<string, { titre: string; etapes: string[]; piece: string }> = {
  irm: {
    titre: "Préparation — IRM",
    etapes: [
      "Aucun jeûne nécessaire, sauf indication contraire de votre médecin.",
      "Retirez tout objet métallique : bijoux, montre, épingles, prothèses amovibles.",
      "Signalez tout implant (pacemaker, valve, clip) avant l'examen.",
      "Prévoyez 30 minutes sur place, dont environ 20 minutes d'acquisition.",
    ],
    piece: "Preparation_IRM.pdf",
  },
  scanner: {
    titre: "Préparation — Scanner",
    etapes: [
      "Restez à jeun 4 heures avant l'examen si une injection est prévue.",
      "Apportez votre ordonnance et vos examens antérieurs.",
      "Signalez toute allergie connue au produit de contraste.",
      "Buvez normalement de l'eau, sauf consigne contraire.",
    ],
    piece: "Preparation_Scanner.pdf",
  },
  echographie: {
    titre: "Préparation — Échographie",
    etapes: [
      "Échographie abdominale : à jeun 6 heures avant l'examen.",
      "Échographie pelvienne : venez avec la vessie pleine.",
      "Portez une tenue confortable, facile à retirer.",
      "Durée moyenne : 15 à 20 minutes.",
    ],
    piece: "Preparation_Echographie.pdf",
  },
  mammographie: {
    titre: "Préparation — Mammographie",
    etapes: [
      "Aucun jeûne nécessaire.",
      "Évitez déodorant, crème et talc le jour de l'examen.",
      "Apportez vos clichés précédents si vous en disposez.",
      "Privilégiez un haut deux pièces pour plus de confort.",
    ],
    piece: "Preparation_Mammographie.pdf",
  },
};

const creneauxParExamen: Record<string, string[]> = {
  irm: ["Jeudi 13/08 à 10h30", "Vendredi 14/08 à 08h15", "Samedi 15/08 à 11h00"],
  scanner: ["Mardi 11/08 à 09h00", "Mercredi 12/08 à 14h45", "Jeudi 13/08 à 16h20"],
  echographie: ["Lundi 10/08 à 11h15", "Mardi 11/08 à 15h30", "Jeudi 13/08 à 09h45"],
  mammographie: ["Mercredi 12/08 à 08h30", "Vendredi 14/08 à 10h00", "Samedi 15/08 à 09h15"],
  radiographie: ["Aujourd'hui à 17h00", "Demain à 08h30", "Demain à 12h15"],
};

const normalise = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export function detecterTypeExamen(texte: string): keyof typeof creneauxParExamen {
  const q = normalise(texte);
  if (q.includes("irm") || q.includes("magnetique")) return "irm";
  if (q.includes("scanner") || q.includes("tdm") || q.includes("tomo")) return "scanner";
  if (q.includes("echo")) return "echographie";
  if (q.includes("mammo") || q.includes("sein")) return "mammographie";
  return "radiographie";
}

function preparationScenario(cle: keyof typeof preparationTextes): WaDraftMessage[] {
  const prep = preparationTextes[cle]!;
  return [
    {
      auteur: "bot",
      intent: "Préparation d'examen",
      etat: "delivre",
      texte: `${prep.titre}\n${prep.etapes.map((e) => `• ${e}`).join("\n")}\n\n${MENTION_SIMULATION}`,
      piece: { nom: prep.piece, taille: "96 Ko", type: "pdf" },
      quickReplies: [
        { label: "C'est noté", payload: "merci" },
        { label: "Parler au secrétariat", payload: "secretariat" },
      ],
    },
  ];
}

/** Scénarios déclenchés manuellement depuis la barre de démonstration. */
export function scenarioMessages(scenario: WaScenario, conv: WaConversation): WaDraftMessage[] {
  const examen = detecterTypeExamen(conv.examen);

  switch (scenario) {
    case "rdv": {
      const creneaux = creneauxParExamen[examen] ?? creneauxParExamen["radiographie"]!;
      return [
        {
          auteur: "bot",
          intent: "Prise de rendez-vous",
          etat: "delivre",
          texte: `Prise de rendez-vous — ${conv.examen}\nVoici les créneaux disponibles :\n${creneaux
            .map((c) => `• ${c}`)
            .join("\n")}\n\nQuel créneau souhaitez-vous ?`,
          quickReplies: creneaux.map((c) => ({ label: c, payload: `creneau:${c}` })),
        },
      ];
    }
    case "preparation-irm":
      return preparationScenario("irm");
    case "preparation-scanner":
      return preparationScenario("scanner");
    case "preparation-echographie":
      return preparationScenario("echographie");
    case "preparation-mammographie":
      return preparationScenario("mammographie");
    case "assurance":
      return [
        {
          auteur: "bot",
          intent: "Mutuelle & prise en charge",
          etat: "delivre",
          texte: `Prise en charge — dossier ${conv.dossier} (mutuelle déclarée : ${conv.mutuelle})\n• AMO / CNSS / CNOPS : présentation de la carte et de l'ordonnance obligatoire.\n• Assurance privée : une demande de prise en charge peut être exigée avant l'examen.\n• Sans mutuelle : règlement intégral au comptoir.\n\nLe niveau exact de couverture doit être vérifié par le centre avant l'examen.\n${MENTION_SIMULATION}`,
          quickReplies: [
            { label: "Transférer au secrétariat", payload: "secretariat" },
            { label: "Merci", payload: "merci" },
          ],
        },
      ];
    case "rappel":
      return [
        {
          auteur: "bot",
          intent: "Rappel J-1",
          etat: "delivre",
          texte: `Rappel de rendez-vous ⏰\n${conv.examen}\n${conv.prochainRdv}\n\nMerci de confirmer votre présence.`,
          quickReplies: [
            { label: "Confirmer", payload: "confirmer" },
            { label: "Reporter", payload: "reporter" },
            { label: "Annuler", payload: "annuler" },
          ],
        },
      ];
    case "compte-rendu":
      return [
        {
          auteur: "bot",
          intent: "Compte rendu disponible",
          etat: "delivre",
          texte: `Votre compte rendu de ${conv.examen.toLowerCase()} est disponible 📄\nIl vous sera remis au centre ou expliqué par votre médecin. Aucun résultat médical n'est transmis par messagerie.\n${MENTION_SIMULATION}`,
          quickReplies: [
            { label: "Contacter le centre", payload: "secretariat" },
            { label: "Merci", payload: "merci" },
          ],
        },
      ];
    case "handoff":
      return [
        {
          auteur: "systeme",
          texte: "Conversation transférée au secrétariat — le bot est désactivé pour ce patient.",
        },
        {
          auteur: "agent",
          etat: "delivre",
          texte: `Bonjour ${conv.patient.split(" ")[0]}, Souad du secrétariat prend le relais. Comment puis-je vous aider ?`,
        },
      ];
    default:
      return [];
  }
}

/** Statut résultant d'un scénario, s'il en modifie un. */
export function statutApresScenario(scenario: WaScenario, actuel: WaStatut): WaStatut {
  if (scenario === "handoff") return "secretariat";
  if (actuel === "cloture") return actuel;
  return actuel === "secretariat" ? actuel : "bot";
}

/** Réponse déterministe du bot à un message texte ou à une réponse rapide. */
export function reponseBot(entree: string, conv: WaConversation): WaDraftMessage[] {
  const q = normalise(entree);

  if (q.startsWith("creneau:")) {
    const creneau = entree.slice("creneau:".length);
    return [
      {
        auteur: "bot",
        intent: "Rendez-vous confirmé",
        etat: "delivre",
        texte: `Rendez-vous confirmé ✅\n${conv.examen}\n${creneau}\n\nMerci d'arriver 15 minutes avant avec votre CIN, votre ordonnance et votre carte de mutuelle.\n${MENTION_SIMULATION}`,
        piece: { nom: "Confirmation_RDV.pdf", taille: "128 Ko", type: "pdf" },
        quickReplies: [
          { label: "Recevoir la préparation", payload: "preparation" },
          { label: "Merci", payload: "merci" },
        ],
      },
    ];
  }

  if (
    q === "secretariat" ||
    q.includes("secretariat") ||
    q.includes("agent") ||
    q.includes("humain")
  ) {
    return scenarioMessages("handoff", conv);
  }

  if (q === "confirmer" || q.includes("je confirme")) {
    return [
      {
        auteur: "bot",
        intent: "Rappel J-1",
        etat: "delivre",
        texte: `Merci, votre présence est confirmée ✅\n${conv.prochainRdv}`,
      },
    ];
  }

  if (q === "reporter" || q.includes("reporter") || q.includes("decaler")) {
    return scenarioMessages("rdv", conv);
  }

  if (q === "annuler" || q.includes("annuler")) {
    return [
      {
        auteur: "bot",
        intent: "Annulation",
        etat: "delivre",
        texte:
          "Votre demande d'annulation est enregistrée. Le secrétariat vous confirmera la libération du créneau.",
        quickReplies: [{ label: "Transférer au secrétariat", payload: "secretariat" }],
      },
    ];
  }

  if (q === "merci" || q.includes("merci")) {
    return [
      {
        auteur: "bot",
        etat: "delivre",
        texte: "Avec plaisir 🙏 Le Centre d'Imagerie Médicale reste à votre disposition.",
      },
    ];
  }

  if (
    q.includes("rendez-vous") ||
    q.includes("rdv") ||
    q.includes("reserver") ||
    q.includes("disponibilite")
  ) {
    return scenarioMessages("rdv", conv);
  }

  if (
    q.includes("prepar") ||
    q.includes("jeun") ||
    q.includes("avant l'examen") ||
    q === "preparation"
  ) {
    const examen = detecterTypeExamen(`${entree} ${conv.examen}`);
    if (examen === "scanner") return preparationScenario("scanner");
    if (examen === "echographie") return preparationScenario("echographie");
    if (examen === "mammographie") return preparationScenario("mammographie");
    return preparationScenario("irm");
  }

  if (
    q.includes("mutuelle") ||
    q.includes("amo") ||
    q.includes("cnss") ||
    q.includes("cnops") ||
    q.includes("assurance") ||
    q.includes("rembours") ||
    q.includes("prix") ||
    q.includes("tarif") ||
    q.includes("cout") ||
    q.includes("coute")
  ) {
    return scenarioMessages("assurance", conv);
  }

  if (q.includes("compte rendu") || q.includes("resultat") || q.includes("cr ")) {
    return scenarioMessages("compte-rendu", conv);
  }

  if (q.includes("bonjour") || q.includes("salam") || q.includes("salut")) {
    return [
      {
        auteur: "bot",
        etat: "delivre",
        texte: `Bonjour 👋 Vous êtes en contact avec l'assistant du Centre d'Imagerie Médicale. Que souhaitez-vous faire ?`,
        quickReplies: [
          { label: "Prendre un rendez-vous", payload: "rendez-vous" },
          { label: "Préparation d'examen", payload: "preparation" },
          { label: "Mutuelle", payload: "mutuelle" },
        ],
      },
    ];
  }

  return [
    {
      auteur: "bot",
      etat: "delivre",
      texte:
        "Je n'ai pas compris votre demande. Vous pouvez choisir une option ci-dessous ou demander un agent du secrétariat.",
      quickReplies: [
        { label: "Prendre un rendez-vous", payload: "rendez-vous" },
        { label: "Préparation d'examen", payload: "preparation" },
        { label: "Mutuelle", payload: "mutuelle" },
        { label: "Transférer au secrétariat", payload: "secretariat" },
      ] satisfies WaQuickReply[],
    },
  ];
}
