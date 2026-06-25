import OpenAI from "openai"
import { z } from "zod"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

const ExperienceSchema = z.object({
  title: z.string().catch(""),
  startDate: z.string().catch(""),
  endDate: z.string().nullable().optional(),
  company: z.string().catch(""),
  context: z.string().nullable().optional(),
  achievements: z.string().nullable().optional(),
  technologies: z.string().nullable().optional(),
  order: z.number().catch(0),
})

const ParsedCvSchema = z.object({
  contact: z
    .object({
      firstName: z.string().nullable().optional(),
      lastName: z.string().nullable().optional(),
      address: z.string().nullable().optional(),
      email: z.string().nullable().optional(),
      phone: z.string().nullable().optional(),
    })
    .catch({}),
  profile: z.string().nullable().optional(),
  experiences: z.array(ExperienceSchema).catch([]),
})

export type ParsedCv = z.infer<typeof ParsedCvSchema>

const SYSTEM_PROMPT = `Tu es un extracteur de données de CV professionnel. Analyse le texte brut fourni et retourne UNIQUEMENT un objet JSON valide.

Format JSON attendu :
{
  "contact": {
    "firstName": "string ou null",
    "lastName": "string ou null",
    "address": "string ou null",
    "email": "string ou null",
    "phone": "string ou null"
  },
  "profile": "string ou null",
  "experiences": [
    {
      "title": "string",
      "startDate": "string",
      "endDate": "string ou null",
      "company": "string",
      "context": "string ou null",
      "achievements": "string ou null",
      "technologies": "string ou null",
      "order": 0
    }
  ]
}

Règles :
- Retourne null pour tout champ introuvable dans le CV
- technologies : liste séparée par des virgules (ex: "React, Node.js, Docker")
- achievements : réalisations et résultats mesurables en texte libre
- context : contexte du poste ou description de la mission
- endDate : "En cours" si poste actuel, null si non précisé
- order : 0 = expérience la plus récente, s'incrémente vers les plus anciennes`

const MAX_TEXT_LENGTH = 12_000

export async function parseCvWithAI(rawText: string): Promise<ParsedCv> {
  const text = rawText.slice(0, MAX_TEXT_LENGTH)

  const response = await openai.chat.completions.create({
    model: process.env.AI_MODEL ?? "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: text },
    ],
    response_format: { type: "json_object" }, // garantit un JSON valide
    max_tokens: 4096,
    temperature: 0,
  })

  const content = response.choices[0].message.content
  if (!content) throw new Error("Réponse vide de l'API OpenAI")

  const raw = JSON.parse(content)
  return ParsedCvSchema.parse(raw)
}
