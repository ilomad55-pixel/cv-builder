import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { parseCvWithAI } from "@/lib/ai/parser"

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

  if (!cv) {
    return NextResponse.json({ error: "CV introuvable" }, { status: 404 })
  }

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
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur du parsing IA" },
      { status: 500 }
    )
  }

  // Upsert contact + profil
  await prisma.contact.upsert({
    where: { cvId: cv.id },
    create: {
      cvId: cv.id,
      firstName: parsed.contact.firstName ?? "",
      lastName: parsed.contact.lastName ?? "",
      address: parsed.contact.address ?? null,
      email: parsed.contact.email ?? null,
      phone: parsed.contact.phone ?? null,
      profileText: parsed.profile ?? null,
    },
    update: {
      firstName: parsed.contact.firstName ?? "",
      lastName: parsed.contact.lastName ?? "",
      address: parsed.contact.address ?? null,
      email: parsed.contact.email ?? null,
      phone: parsed.contact.phone ?? null,
      profileText: parsed.profile ?? null,
    },
  })

  // Supprimer les expériences existantes et recréer (re-parse propre)
  await prisma.experience.deleteMany({ where: { cvId: cv.id } })

  if (parsed.experiences.length > 0) {
    await prisma.experience.createMany({
      data: parsed.experiences.map((exp, i) => ({
        cvId: cv.id,
        title: exp.title,
        startDate: exp.startDate,
        endDate: exp.endDate ?? null,
        company: exp.company,
        context: exp.context ?? null,
        achievements: exp.achievements ?? null,
        technologies: exp.technologies ?? null,
        order: exp.order ?? i,
      })),
    })
  }

  await prisma.cv.update({
    where: { id: cv.id },
    data: { status: "PARSED" },
  })

  return NextResponse.json({
    success: true,
    experienceCount: parsed.experiences.length,
  })
}
