import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY ?? "",
  dangerouslyAllowBrowser: true,
});

export interface ReportInputData {
  patientName: string;
  studyType: string;
  clinicalContext: string;
  dictationNotes: string;
}

export async function generateStructuredReport(data: ReportInputData): Promise<string> {
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
- Contexte clinique : ${data.clinicalContext}
- Notes de dictée : ${data.dictationNotes}
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.1,
    });

    return response.choices[0]?.message?.content || "Erreur : Le modèle n'a généré aucune réponse.";
  } catch (error) {
    console.error("Erreur lors de la structuration du compte rendu :", error);
    throw new Error("Le service de génération de compte rendu est temporairement indisponible.");
  }
}
