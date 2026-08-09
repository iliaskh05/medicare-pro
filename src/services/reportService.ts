import { APIError, OpenAI } from "openai";

export interface ReportInputData {
  patientName: string;
  studyType: string;
  clinicalContext: string;
  dictationNotes: string;
}

function getOpenAIClient(): OpenAI {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY?.trim();
  console.log("[reportService] Clé API présente:", Boolean(apiKey), "| longueur:", apiKey?.length ?? 0);

  if (!apiKey) {
    throw new Error(
      "Clé OpenAI manquante. Ajoutez VITE_OPENAI_API_KEY dans votre fichier .env puis redémarrez le serveur Vite.",
    );
  }

  return new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true,
  });
}

function mapOpenAIError(error: unknown): Error {
  console.error("[reportService] Erreur brute OpenAI:", error);

  if (error instanceof APIError) {
    const status = error.status;
    const apiMessage = error.message;

    if (status === 401) {
      return new Error(
        "Clé API OpenAI invalide ou révoquée (401). Vérifiez VITE_OPENAI_API_KEY dans .env.",
      );
    }
    if (status === 403) {
      return new Error(
        "Accès refusé par OpenAI (403). Votre organisation ou projet n'a peut-être pas accès à ce modèle.",
      );
    }
    if (status === 429) {
      return new Error(
        "Quota ou limite de débit OpenAI atteint (429). Réessayez plus tard ou vérifiez votre facturation.",
      );
    }
    if (status === 404) {
      return new Error(
        "Modèle introuvable (404). Vérifiez que gpt-4o est disponible sur votre compte OpenAI.",
      );
    }
    if (status === 500 || status === 502 || status === 503) {
      return new Error(
        `Service OpenAI indisponible (${status}). Réessayez dans quelques instants.`,
      );
    }

    return new Error(
      `Erreur OpenAI${status ? ` (${status})` : ""}: ${apiMessage || "réponse invalide"}.`,
    );
  }

  if (error instanceof Error) {
    if (/Failed to fetch|NetworkError|CORS/i.test(error.message)) {
      return new Error(
        "Erreur réseau vers OpenAI (CORS ou connexion). Vérifiez votre connexion internet et la console navigateur.",
      );
    }
    return error;
  }

  return new Error("Le service de génération de compte rendu est temporairement indisponible.");
}

export async function generateStructuredReport(data: ReportInputData): Promise<string> {
  console.log("[reportService] generateStructuredReport — payload reçu:", {
    patientName: data.patientName,
    studyType: data.studyType,
    clinicalContextLength: data.clinicalContext?.length ?? 0,
    dictationNotesLength: data.dictationNotes?.length ?? 0,
  });

  if (!data.dictationNotes?.trim()) {
    throw new Error("Les notes de dictée sont vides. Saisissez une dictée avant de générer le CR.");
  }

  const systemPrompt = `Tu es un radiologue expert travaillant dans un centre d'imagerie.
Ton rôle est de transformer des notes de dictée brutes et un contexte clinique en un compte rendu radiologique structuré, professionnel et standardisé.

Le rapport doit impérativement respecter la structure suivante :
1. Renseignements cliniques
2. Technique
3. Résultats
4. Conclusion

Contraintes strictes :
- Utilise un vocabulaire médical précis, rigoureux et neutre.
- Ne pose AUCUN diagnostic qui ne serait pas induit par les notes fournies.`;

  const userPrompt = `
Veuillez générer le compte rendu pour l'examen suivant :
- Patient : ${data.patientName}
- Type d'examen : ${data.studyType}
- Contexte clinique : ${data.clinicalContext || "Non précisé"}
- Notes de dictée : ${data.dictationNotes}
`;

  try {
    const openai = getOpenAIClient();
    console.log("[reportService] Appel OpenAI chat.completions.create (modèle gpt-4o)…");

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content;
    console.log("[reportService] Réponse OpenAI reçue:", {
      id: response.id,
      model: response.model,
      finishReason: response.choices[0]?.finish_reason,
      contentPreview: content?.slice(0, 180) ?? null,
      contentLength: content?.length ?? 0,
    });

    if (!content?.trim()) {
      throw new Error("Le modèle n'a généré aucune réponse. Réessayez ou enrichissez la dictée.");
    }

    return content;
  } catch (error) {
    throw mapOpenAIError(error);
  }
}
