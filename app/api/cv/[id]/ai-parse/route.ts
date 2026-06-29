import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { parseCvWithAI } from "@/lib/ai/parser"
import OpenAI from "openai"

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const cv = await prisma.cv.findFirst({
    where: { id: params.id, companyId: session.user.id },
  })

  if (!cv) return NextResponse.json({ error: "CV introuvable" }, { status: 404 })
  if (!cv.rawText) {
    return NextResponse.json(
      { error: "Texte non extrait. Lancez d'abord l'extraction du texte brut." },
      { status: 422 }
    )
  }

  let parsed
  try {
    parsed = await parseCvWithAI(cv.rawText, cv.originalFileName ?? undefined)
  } catch (err) {
    if (err instanceof OpenAI.APIError) {
      if (err.status === 429) return NextResponse.json({ error: "Quota OpenAI dépassé" }, { status: 503 })
      if (err.status === 401) return NextResponse.json({ error: "Clé API OpenAI invalide" }, { status: 503 })
      return NextResponse.json({ error: `Erreur OpenAI (${err.status}) : ${err.message}` }, { status: 503 })
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur du parsing IA" }, { status: 500 })
  }

  // ─── Post-traitement nom ──────────────────────────────────────────────────
  const toTitleCase = (s: string) =>
    s.split(/(\s+|-)/).map(t => /[a-zA-ZÀ-ÿ]/.test(t) ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : t).join("")

  let firstName = (parsed.CONTACT.prenom ?? "").trim()
  let lastName = (parsed.CONTACT.nom ?? "").trim()

  // Normalisation casse (ex: "MORA" → "Mora")
  if (firstName && firstName === firstName.toUpperCase() && firstName.length > 1) firstName = toTitleCase(firstName)
  if (lastName && lastName === lastName.toUpperCase() && lastName.length > 1) lastName = toTitleCase(lastName)

  // Fallback nom de fichier si l'IA n'a pas trouvé
  if ((!firstName || !lastName) && cv.originalFileName) {
    const base = cv.originalFileName.replace(/\.[^.]+$/, "")
    const tokens = base.split(/[-_\s]+/).filter(t => t.length > 1 && /^[A-Za-zÀ-ÿ-]+$/.test(t)).slice(0, 2)
    if (tokens.length >= 2) {
      const t0caps = tokens[0] === tokens[0].toUpperCase()
      const t1caps = tokens[1] === tokens[1].toUpperCase()
      if (!t0caps && t1caps) {
        if (!firstName) firstName = toTitleCase(tokens[0])
        if (!lastName) lastName = toTitleCase(tokens[1])
      } else if (t0caps && !t1caps) {
        if (!lastName) lastName = toTitleCase(tokens[0])
        if (!firstName) firstName = toTitleCase(tokens[1])
      } else {
        if (!firstName) firstName = toTitleCase(tokens[0])
        if (!lastName) lastName = toTitleCase(tokens[1])
      }
    }
  }

  // ─── Mapping compétences → catégories Prisma ─────────────────────────────
  // competences_techniques  → "technical_group" (nom=groupe, level="item1 | item2 | ...")
  // competences_fonctionnelles → "methodology"
  // competences_metiers → "tool"
  // SOFT_SKILLS → "soft"
  const skillRows: Array<{ name: string; category: string; order: number; cvId: string; level: string | null; display: boolean }> = [
    // Groupes techniques : 1 row par groupe, items encodés dans level
    ...parsed.COMPETENCES.competences_techniques.map((g, i) => ({
      name: g.groupe,
      category: "technical_group",
      level: g.items.filter(Boolean).join(" | ") || null,
      order: i,
      cvId: cv.id,
      display: true,
    })),
    ...parsed.COMPETENCES.competences_fonctionnelles.map((name, i) => ({ name, category: "methodology", order: i, cvId: cv.id, level: null, display: true })),
    ...parsed.COMPETENCES.competences_metiers.map((name, i) => ({ name, category: "tool", order: i, cvId: cv.id, level: null, display: true })),
    ...parsed.SOFT_SKILLS.map((name, i) => ({ name, category: "soft", order: i, cvId: cv.id, level: null, display: true })),
  ]

  // ─── Écriture en transaction ──────────────────────────────────────────────
  await prisma.$transaction(async (tx) => {

    // Contact
    await tx.contact.upsert({
      where: { cvId: cv.id },
      create: {
        cvId: cv.id,
        firstName,
        lastName,
        headline: parsed.CONTACT.titre ?? null,
        seniority: null,
        yearsOfExperience: null,
        email: parsed.CONTACT.email ?? null,
        phone: parsed.CONTACT.telephone ?? null,
        address: parsed.CONTACT.adresse ?? null,
        linkedin: parsed.CONTACT.linkedin ?? null,
        profileText: parsed.PROFIL.texte ?? parsed.CONTACT.resume_court ?? null,
      },
      update: {
        firstName,
        lastName,
        headline: parsed.CONTACT.titre ?? null,
        seniority: null,
        yearsOfExperience: null,
        email: parsed.CONTACT.email ?? null,
        phone: parsed.CONTACT.telephone ?? null,
        address: parsed.CONTACT.adresse ?? null,
        linkedin: parsed.CONTACT.linkedin ?? null,
        profileText: parsed.PROFIL.texte ?? parsed.CONTACT.resume_court ?? null,
      },
    })

    // Expériences — realisations[] → achievements joint par \n
    await tx.experience.deleteMany({ where: { cvId: cv.id } })
    if (parsed.EXPERIENCES.length > 0) {
      await tx.experience.createMany({
        data: parsed.EXPERIENCES.map((exp, i) => ({
          cvId: cv.id,
          title: exp.titre,
          company: exp.organisation,
          client: exp.client ?? null,
          startDate: exp.date_debut,
          endDate: exp.date_fin ?? null,
          isCurrent: !exp.date_fin,
          context: [exp.contexte, exp.projet ? `Projet : ${exp.projet}` : null, exp.direction_ou_service ? `Service : ${exp.direction_ou_service}` : null]
            .filter(Boolean).join("\n") || null,
          achievements: exp.realisations.filter(Boolean).join("\n") || null,
          technologies: [
            ...exp.environnement_technique.technologies,
            ...exp.environnement_technique.plateformes,
          ].filter(Boolean).join(", ") || null,
          methods: null,
          order: i,
        })),
      })
    }

    // Compétences
    await tx.skill.deleteMany({ where: { cvId: cv.id } })
    if (skillRows.length > 0) await tx.skill.createMany({ data: skillRows })

    // Formations
    await tx.education.deleteMany({ where: { cvId: cv.id } })
    if (parsed.FORMATION.length > 0) {
      await tx.education.createMany({
        data: parsed.FORMATION.map((f, i) => ({
          cvId: cv.id,
          degree: f.titre,
          fieldOfStudy: f.description ?? null,
          school: f.lieu_formation ?? "",
          location: null,
          startYear: null,
          endYear: f.annee ?? null,
          level: null,
          honors: null,
          order: i,
        })),
      })
    }

    // Langues
    await tx.language.deleteMany({ where: { cvId: cv.id } })
    if (parsed.LANGUES.length > 0) {
      await tx.language.createMany({
        data: parsed.LANGUES.map((l, i) => ({
          cvId: cv.id,
          language: l.langue,
          cefrLevel: null,
          levelLabel: l.niveau ?? null,
          order: i,
        })),
      })
    }

    // Statut + JSON brut
    await tx.cv.update({
      where: { id: cv.id },
      data: { status: "PARSED", parsedData: parsed as object },
    })
  })

  const warnings = [...(parsed.PARSING.warnings ?? [])]
  if (parsed.EXPERIENCES.length === 0) {
    warnings.unshift("Aucune expérience extraite — section non détectée ou format non reconnu")
  }

  const totalSkills =
    parsed.COMPETENCES.competences_techniques.reduce((acc, g) => acc + g.items.length, 0) +
    parsed.COMPETENCES.competences_fonctionnelles.length +
    parsed.COMPETENCES.competences_metiers.length

  return NextResponse.json({
    success: true,
    summary: {
      experiences: parsed.EXPERIENCES.length,
      skills: totalSkills,
      soft_skills: parsed.SOFT_SKILLS.length,
      education: parsed.FORMATION.length,
      languages: parsed.LANGUES.length,
      confidence: null,
      warnings,
    },
  })
}
