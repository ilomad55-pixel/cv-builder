import OpenAI from "openai"
import { z } from "zod"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

// ─── Schéma de sortie canonique ──────────────────────────────────────────────

const SkillItemSchema = z.object({
  name: z.string(),
  level: z.string().nullable().optional(),
})

const ParsedCvSchema = z.object({
  identity: z.object({
    firstName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),
    headline: z.string().nullable().optional(),
    seniority: z.string().nullable().optional(),
    yearsOfExperience: z.string().nullable().optional(),
  }).catch({}),

  contact: z.object({
    email: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    linkedin: z.string().nullable().optional(),
    github: z.string().nullable().optional(),
  }).catch({}),

  profile: z.object({
    summary: z.string().nullable().optional(),
    objective: z.string().nullable().optional(),
  }).catch({}),

  skills: z.object({
    technical: z.array(SkillItemSchema).catch([]),
    soft: z.array(SkillItemSchema).catch([]),
    methodologies: z.array(SkillItemSchema).catch([]),
    tools: z.array(SkillItemSchema).catch([]),
  }).catch({ technical: [], soft: [], methodologies: [], tools: [] }),

  languages: z.array(z.object({
    language: z.string(),
    cefr: z.string().nullable().optional(),
    label: z.string().nullable().optional(),
  })).catch([]),

  experiences: z.array(z.object({
    title: z.string().catch(""),
    company: z.string().catch(""),
    client: z.string().nullable().optional(),
    startDate: z.string().catch(""),
    endDate: z.string().nullable().optional(),
    isCurrent: z.boolean().catch(false),
    context: z.string().nullable().optional(),
    achievements: z.string().nullable().optional(),
    technologies: z.string().nullable().optional(),
    methods: z.string().nullable().optional(),
    order: z.number().catch(0),
  })).catch([]),

  education: z.array(z.object({
    degree: z.string().catch(""),
    fieldOfStudy: z.string().nullable().optional(),
    school: z.string().catch(""),
    location: z.string().nullable().optional(),
    startYear: z.string().nullable().optional(),
    endYear: z.string().nullable().optional(),
    level: z.string().nullable().optional(),
    honors: z.string().nullable().optional(),
  })).catch([]),

  certifications: z.array(z.object({
    name: z.string().catch(""),
    issuer: z.string().nullable().optional(),
    date: z.string().nullable().optional(),
    expirationDate: z.string().nullable().optional(),
    credentialUrl: z.string().nullable().optional(),
  })).catch([]),

  privateData: z.object({
    dateOfBirth: z.string().nullable().optional(),
    nationality: z.string().nullable().optional(),
    drivingLicense: z.string().nullable().optional(),
  }).catch({}),

  parsing: z.object({
    confidence: z.number().catch(0),
    warnings: z.array(z.string()).catch([]),
    detectedLanguage: z.string().catch("fr"),
  }).catch({ confidence: 0, warnings: [], detectedLanguage: "fr" }),
})

export type ParsedCv = z.infer<typeof ParsedCvSchema>

// ─── Prompt système canonique ─────────────────────────────────────────────────

const SYSTEM_PROMPT = `Tu es un moteur d'extraction de CV haute précision, spécialisé pour les ESN et agences de recrutement.

MISSION : Analyser le texte brut du CV fourni et retourner un objet JSON canonique structuré.

RÈGLES ABSOLUES :
1. N'invente JAMAIS d'information absente du document — utilise null ou [] si absent
2. Si une information est ambiguë, ajoute une entrée dans parsing.warnings
3. Conserve les formulations professionnelles originales sans paraphrase excessive
4. Les données sensibles (date de naissance, nationalité, situation maritale, permis) → privateData uniquement
5. Normalise les niveaux de langues en CEFR (A1, A2, B1, B2, C1, C2 ou "native")
6. Pour chaque expérience : extrais TOUS les éléments disponibles — missions, réalisations chiffrées, technologies, méthodes
   - context : 1 à 3 lignes décrivant l'environnement, le périmètre, la mission générale du poste
   - achievements : LISTE EXHAUSTIVE de toutes les réalisations, missions détaillées, résultats — chaque bullet point du CV original devient UNE ligne séparée par \n. Ne tronque JAMAIS cette liste. Si le CV a 6 bullets, achievements doit avoir 6 lignes. Préfixe chaque ligne avec "– " si le CV utilise ce format.
   - Ne mets PAS les réalisations dans context. Ne saute PAS de bullet point.
7. Distingue certifications (avec émetteur officiel) vs formations académiques
8. Estime seniority basé sur années d'expérience et responsabilités : junior|confirmed|senior|lead|expert|unknown
9. technologies : liste séparée par des virgules
10. methods : méthodologies et approches utilisées dans le poste (Agile, Scrum, etc.)
11. NOM DU CANDIDAT — règles strictes :
    - Le nom est TOUJOURS présent dans un CV. Cherche-le en en-tête, dans les coordonnées, dans l'email si nécessaire.
    - Si le nom est en MAJUSCULES (ex: "DUPONT JEAN-MARIE"), convertis en format Titre : lastName="Dupont", firstName="Jean-Marie"
    - Si tu vois "NOM Prénom" (format Malgache/Africain : nom de famille EN PREMIER), inverser : lastName=premier token, firstName=reste
    - Si tu ne peux pas distinguer prénom et nom, mets le prénom probable dans firstName et le reste dans lastName — ne laisse JAMAIS les deux à null si un nom est visible
    - Si vraiment aucun nom trouvé, note-le dans parsing.warnings

SCHÉMA JSON ATTENDU (retourne EXACTEMENT cette structure) :
{
  "identity": {
    "firstName": "string|null",
    "lastName": "string|null",
    "headline": "titre professionnel extrait ou inféré|null",
    "seniority": "junior|confirmed|senior|lead|expert|unknown",
    "yearsOfExperience": "nombre d'années estimé|null"
  },
  "contact": {
    "email": "string|null",
    "phone": "string|null",
    "address": "ville, pays|null",
    "linkedin": "URL LinkedIn|null",
    "github": "URL GitHub|null"
  },
  "profile": {
    "summary": "résumé professionnel complet|null",
    "objective": "objectif de carrière si mentionné|null"
  },
  "skills": {
    "technical": [{"name": "compétence", "level": "beginner|intermediate|advanced|expert|null"}],
    "soft": [{"name": "compétence comportementale"}],
    "methodologies": [{"name": "méthode ou approche"}],
    "tools": [{"name": "outil ou logiciel", "level": "null ou niveau"}]
  },
  "languages": [
    {"language": "Français", "cefr": "native", "label": "Langue maternelle"}
  ],
  "experiences": [
    {
      "title": "string",
      "company": "string",
      "client": "nom du client final si différent de l'employeur|null",
      "startDate": "format libre (ex: Jan 2022)",
      "endDate": "format libre ou null",
      "isCurrent": false,
      "context": "contexte métier et description du poste|null",
      "achievements": "réalisations mesurables, résultats chiffrés|null",
      "technologies": "React, Node.js, Docker (liste CSV)|null",
      "methods": "Agile, Scrum, TDD (liste CSV)|null",
      "order": 0
    }
  ],
  "education": [
    {
      "degree": "intitulé du diplôme",
      "fieldOfStudy": "spécialité|null",
      "school": "établissement",
      "location": "ville|null",
      "startYear": "null",
      "endYear": "2020",
      "level": "bachelor|master|engineer|phd|bootcamp|other|unknown",
      "honors": "mention|null"
    }
  ],
  "certifications": [
    {
      "name": "nom certification",
      "issuer": "organisme émetteur|null",
      "date": "date obtention|null",
      "expirationDate": "date expiration|null",
      "credentialUrl": "URL|null"
    }
  ],
  "privateData": {
    "dateOfBirth": "null sauf si clairement indiqué",
    "nationality": "null sauf si clairement indiqué",
    "drivingLicense": "null sauf si mentionné"
  },
  "parsing": {
    "confidence": 0.85,
    "warnings": ["liste des ambiguïtés ou informations manquantes importantes"],
    "detectedLanguage": "fr|en|other"
  }
}`

const MAX_TEXT_LENGTH = 20_000

export async function parseCvWithAI(rawText: string): Promise<ParsedCv> {
  const text = rawText.slice(0, MAX_TEXT_LENGTH)

  const response = await openai.chat.completions.create({
    model: process.env.AI_MODEL ?? "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `TEXTE DU CV À ANALYSER :\n\n${text}` },
    ],
    response_format: { type: "json_object" },
    max_tokens: 8000,
    temperature: 0,
  })

  const content = response.choices[0].message.content
  if (!content) throw new Error("Réponse vide de l'API OpenAI")

  const raw = JSON.parse(content)
  return ParsedCvSchema.parse(raw)
}
