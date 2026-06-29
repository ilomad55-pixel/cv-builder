import OpenAI from "openai"
import { z } from "zod"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

// ─── Schéma canonique — aligné sur le template métier ILOMAD ─────────────────

const ParsedCvSchema = z.object({
  CONTACT: z.object({
    prenom: z.string().nullable().optional(),
    nom: z.string().nullable().optional(),
    titre: z.string().nullable().optional(),
    resume_court: z.string().nullable().optional(),
    adresse: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    telephone: z.string().nullable().optional(),
    linkedin: z.string().nullable().optional(),
  }).catch({}),

  PROFIL: z.object({
    texte: z.string().nullable().optional(),
  }).catch({}),

  COMPETENCES: z.object({
    competences_metiers: z.array(z.string()).catch([]),
    competences_fonctionnelles: z.array(z.string()).catch([]),
    competences_techniques: z.array(
      z.object({
        groupe: z.string().catch(""),
        items: z.array(z.string()).catch([]),
      })
    ).catch([]),
  }).catch({ competences_metiers: [], competences_fonctionnelles: [], competences_techniques: [] }),

  FORMATION: z.array(z.object({
    titre: z.string().catch(""),
    annee: z.string().nullable().optional(),
    lieu_formation: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
  })).catch([]),

  LANGUES: z.array(z.object({
    langue: z.string().catch(""),
    niveau: z.string().nullable().optional(),
  })).catch([]),

  EXPERIENCES: z.array(z.object({
    client: z.string().nullable().optional(),
    organisation: z.string().catch(""),
    direction_ou_service: z.string().nullable().optional(),
    date_debut: z.string().catch(""),
    date_fin: z.string().nullable().optional(),
    titre: z.string().catch(""),
    projet: z.string().nullable().optional(),
    contexte: z.string().nullable().optional(),
    realisations: z.array(z.string()).catch([]),
    environnement_technique: z.object({
      technologies: z.array(z.string()).catch([]),
      plateformes: z.array(z.string()).catch([]),
    }).catch({ technologies: [], plateformes: [] }),
  })).catch([]),

  SOFT_SKILLS: z.array(z.string()).catch([]),

  PARSING: z.object({
    source: z.string().nullable().optional(),
    warnings: z.array(z.string()).catch([]),
  }).catch({ source: null, warnings: [] }),
})

export type ParsedCv = z.infer<typeof ParsedCvSchema>

// ─── Prompt système ───────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Tu es un moteur d'extraction de CV haute précision pour une ESN (agence de conseil IT).
Ta mission : analyser le texte brut du CV et retourner un objet JSON correspondant EXACTEMENT à ce schéma :

{
  "CONTACT": {
    "prenom": "prénom du candidat",
    "nom": "nom de famille du candidat",
    "titre": "titre professionnel exact tel qu'il apparaît dans le CV",
    "resume_court": "accroche courte si présente (1-2 phrases), sinon null",
    "adresse": "ville, pays ou null",
    "email": "email ou null",
    "telephone": "téléphone ou null",
    "linkedin": "URL LinkedIn ou null"
  },
  "PROFIL": {
    "texte": "paragraphe de profil/résumé complet, tel quel, ou null"
  },
  "COMPETENCES": {
    "competences_metiers": ["domaine métier 1", "domaine métier 2"],
    "competences_fonctionnelles": ["compétence fonctionnelle 1", "analyse des besoins"],
    "competences_techniques": [
      { "groupe": "Langages", "items": ["Java 8 / JEE", "C / C++", "Python", "JavaScript"] },
      { "groupe": "Frameworks", "items": ["Spring MVC", "Hibernate", "Angular"] },
      { "groupe": "SGBD", "items": ["Oracle", "MySQL", "PostgreSQL"] },
      { "groupe": "Outils", "items": ["Git", "Jenkins", "Docker"] },
      { "groupe": "Méthodes", "items": ["AGILE (Scrum, Kanban)", "PERT"] }
    ]
  },
  "FORMATION": [
    {
      "titre": "intitulé du diplôme ou de la formation",
      "annee": "année d'obtention ou null",
      "lieu_formation": "établissement ou ville ou null",
      "description": "mention, spécialité ou null"
    }
  ],
  "LANGUES": [
    { "langue": "Français", "niveau": "Langue maternelle" },
    { "langue": "Anglais", "niveau": "B2 - Courant" }
  ],
  "EXPERIENCES": [
    {
      "client": "nom du client final si différent de l'employeur, sinon null",
      "organisation": "nom de l'entreprise employeur",
      "direction_ou_service": "direction, service ou département concerné, sinon null",
      "date_debut": "date de début (ex: Jan 2022)",
      "date_fin": "date de fin ou null si poste actuel",
      "titre": "intitulé exact du poste",
      "projet": "nom du projet si mentionné, sinon null",
      "contexte": "description du contexte métier et du poste (1-3 phrases)",
      "realisations": [
        "Première réalisation ou mission — une phrase par élément",
        "Deuxième réalisation",
        "..."
      ],
      "environnement_technique": {
        "technologies": ["Java", "Spring Boot", "React"],
        "plateformes": ["AWS", "Docker", "Jira"]
      }
    }
  ],
  "SOFT_SKILLS": ["Leadership", "Communication", "Rigueur"],
  "PARSING": {
    "source": "nom du fichier si connu, sinon null",
    "warnings": ["liste des ambiguïtés ou informations manquantes"]
  }
}

RÈGLES ABSOLUES :
1. N'invente JAMAIS d'information absente du document — utilise null ou [] si absent.
2. CONTACT.prenom et CONTACT.nom — règles strictes :
   - Le nom est en général sur la PREMIÈRE LIGNE du CV, souvent en gras ou grande taille.
   - Format "Prénom NOM_EN_MAJUSCULES" (ex: "Olivier MORA") → prenom="Olivier", nom="Mora"
   - Format "NOM_EN_MAJUSCULES Prénom" (nom de famille en premier) → inverser : nom=premier token, prenom=suite
   - Format tout en majuscules "JEAN DUPONT" → prenom="Jean", nom="Dupont"
   - NE JAMAIS utiliser le nom local d'une adresse email comme source du nom. "moramanana@gmail.com" n'est PAS un nom.
   - Ne laisse JAMAIS prenom ET nom tous les deux vides si un nom est visible dans le document.
3. CONTACT.titre — règles strictes :
   - Copie le titre EXACTEMENT tel qu'il apparaît dans le CV, sans couper ni modifier.
   - Exemple : "Chef de projet confirmé" → titre="Chef de projet confirmé" (ne pas couper "confirmé")
   - Si aucun titre explicite, infère depuis le poste le plus récent.
4. EXPERIENCES — priorité absolue :
   - Chaque poste = 1 objet dans EXPERIENCES[]. Ne regroupe JAMAIS plusieurs postes.
   - realisations[] = tableau de chaînes. Chaque élément = 1 réalisation/mission. UNE PHRASE PAR ÉLÉMENT.
   - Ne déplace PAS le contenu d'une expérience vers COMPETENCES.
   - Si date_fin est null ou absente → le poste est actuel.
5. COMPETENCES — 3 catégories distinctes :
   - competences_metiers : domaines métier maîtrisés (ex: "Gestion de projet", "Finance", "Assurance")
   - competences_fonctionnelles : compétences transversales (ex: "Rédaction de spécifications", "Animation d'ateliers")
   - competences_techniques : TOUJOURS un tableau de groupes { groupe, items }. Chaque groupe = une famille technologique.
     Groupes typiques (adapter au contenu) : Langages, Frameworks, SGBD, Serveurs, Outils, Méthodes, IA & Automatisation, Cloud, Front-end, Back-end.
     Si le CV ne structure pas par groupe, inférer la catégorie la plus pertinente pour chaque techno.
   - Ne pas dupliquer une compétence entre catégories.
6. Normalise les niveaux de langue en clair (ex: "Bilingue", "Courant - B2", "Notions").
7. SOFT_SKILLS : qualités humaines et comportementales uniquement.`

const MAX_TEXT_LENGTH = 20_000

export async function parseCvWithAI(rawText: string, fileName?: string): Promise<ParsedCv> {
  const text = rawText.slice(0, MAX_TEXT_LENGTH)

  const fileHint = fileName
    ? `Nom du fichier CV : "${fileName}"\n\n`
    : ""

  const response = await openai.chat.completions.create({
    model: process.env.AI_MODEL ?? "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `${fileHint}TEXTE DU CV À ANALYSER :\n\n${text}` },
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
