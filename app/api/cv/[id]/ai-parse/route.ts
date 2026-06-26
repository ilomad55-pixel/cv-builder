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
    parsed = await parseCvWithAI(cv.rawText)
  } catch (err) {
    if (err instanceof OpenAI.APIError) {
      if (err.status === 429) {
        return NextResponse.json(
          { error: "Quota OpenAI dépassé — rechargez votre compte sur platform.openai.com/account/billing" },
          { status: 503 }
        )
      }
      if (err.status === 401) {
        return NextResponse.json(
          { error: "Clé API OpenAI invalide — vérifiez OPENAI_API_KEY dans le .env" },
          { status: 503 }
        )
      }
      return NextResponse.json(
        { error: `Erreur OpenAI (${err.status}) : ${err.message}` },
        { status: 503 }
      )
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur du parsing IA" },
      { status: 500 }
    )
  }

  // ─── Toutes les écritures en une transaction ──────────────────────────────
  await prisma.$transaction(async (tx) => {

    // Contact enrichi
    const address = parsed.contact.address ?? null
    await tx.contact.upsert({
      where: { cvId: cv.id },
      create: {
        cvId: cv.id,
        firstName: parsed.identity.firstName ?? "",
        lastName: parsed.identity.lastName ?? "",
        headline: parsed.identity.headline ?? null,
        seniority: parsed.identity.seniority ?? null,
        yearsOfExperience: parsed.identity.yearsOfExperience ?? null,
        email: parsed.contact.email ?? null,
        phone: parsed.contact.phone ?? null,
        address,
        linkedin: parsed.contact.linkedin ?? null,
        github: parsed.contact.github ?? null,
        profileText: parsed.profile.summary ?? null,
      },
      update: {
        firstName: parsed.identity.firstName ?? "",
        lastName: parsed.identity.lastName ?? "",
        headline: parsed.identity.headline ?? null,
        seniority: parsed.identity.seniority ?? null,
        yearsOfExperience: parsed.identity.yearsOfExperience ?? null,
        email: parsed.contact.email ?? null,
        phone: parsed.contact.phone ?? null,
        address,
        linkedin: parsed.contact.linkedin ?? null,
        github: parsed.contact.github ?? null,
        profileText: parsed.profile.summary ?? null,
      },
    })

    // Expériences
    await tx.experience.deleteMany({ where: { cvId: cv.id } })
    if (parsed.experiences.length > 0) {
      await tx.experience.createMany({
        data: parsed.experiences.map((exp, i) => ({
          cvId: cv.id,
          title: exp.title,
          company: exp.company,
          client: exp.client ?? null,
          startDate: exp.startDate,
          endDate: exp.endDate ?? null,
          isCurrent: exp.isCurrent ?? false,
          context: exp.context ?? null,
          achievements: exp.achievements ?? null,
          technologies: exp.technologies ?? null,
          methods: exp.methods ?? null,
          order: exp.order ?? i,
        })),
      })
    }

    // Compétences (toutes catégories)
    await tx.skill.deleteMany({ where: { cvId: cv.id } })
    const skillRows = [
      ...parsed.skills.technical.map((s, i) => ({ cvId: cv.id, name: s.name, category: "technical", level: s.level ?? null, order: i })),
      ...parsed.skills.tools.map((s, i) => ({ cvId: cv.id, name: s.name, category: "tool", level: s.level ?? null, order: i })),
      ...parsed.skills.methodologies.map((s, i) => ({ cvId: cv.id, name: s.name, category: "methodology", level: null, order: i })),
      ...parsed.skills.soft.map((s, i) => ({ cvId: cv.id, name: s.name, category: "soft", level: null, order: i })),
    ]
    if (skillRows.length > 0) await tx.skill.createMany({ data: skillRows })

    // Formations
    await tx.education.deleteMany({ where: { cvId: cv.id } })
    if (parsed.education.length > 0) {
      await tx.education.createMany({
        data: parsed.education.map((edu, i) => ({
          cvId: cv.id,
          degree: edu.degree,
          fieldOfStudy: edu.fieldOfStudy ?? null,
          school: edu.school,
          location: edu.location ?? null,
          startYear: edu.startYear ?? null,
          endYear: edu.endYear ?? null,
          level: edu.level ?? null,
          honors: edu.honors ?? null,
          order: i,
        })),
      })
    }

    // Langues
    await tx.language.deleteMany({ where: { cvId: cv.id } })
    if (parsed.languages.length > 0) {
      await tx.language.createMany({
        data: parsed.languages.map((l, i) => ({
          cvId: cv.id,
          language: l.language,
          cefrLevel: l.cefr ?? null,
          levelLabel: l.label ?? null,
          order: i,
        })),
      })
    }

    // Certifications
    await tx.certification.deleteMany({ where: { cvId: cv.id } })
    if (parsed.certifications.length > 0) {
      await tx.certification.createMany({
        data: parsed.certifications.map((c, i) => ({
          cvId: cv.id,
          name: c.name,
          issuer: c.issuer ?? null,
          issueDate: c.date ?? null,
          expirationDate: c.expirationDate ?? null,
          credentialUrl: c.credentialUrl ?? null,
          order: i,
        })),
      })
    }

    // JSON canonique brut + statut
    await tx.cv.update({
      where: { id: cv.id },
      data: {
        status: "PARSED",
        parsedData: parsed as object,
      },
    })
  })

  return NextResponse.json({
    success: true,
    summary: {
      experiences: parsed.experiences.length,
      skills: parsed.skills.technical.length + parsed.skills.tools.length,
      education: parsed.education.length,
      languages: parsed.languages.length,
      certifications: parsed.certifications.length,
      confidence: parsed.parsing.confidence,
      warnings: parsed.parsing.warnings,
    },
  })
}
