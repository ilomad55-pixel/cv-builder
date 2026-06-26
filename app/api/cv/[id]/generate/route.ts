import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateCvDocx } from "@/lib/docx/generator"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const cv = await prisma.cv.findFirst({
    where: { id: params.id, companyId: session.user.id },
    include: {
      contact: true,
      experiences: { orderBy: { order: "asc" } },
      skills: { where: { display: true }, orderBy: { order: "asc" } },
      educations: { orderBy: { order: "asc" } },
      languages: { where: { display: true }, orderBy: { order: "asc" } },
      certifications: { where: { display: true }, orderBy: { order: "asc" } },
      company: { select: { name: true, primaryColor: true, fontFamily: true } },
    },
  })

  if (!cv) return NextResponse.json({ error: "CV introuvable" }, { status: 404 })

  if (cv.status !== "PARSED" && cv.status !== "GENERATED") {
    return NextResponse.json({ error: "Le CV doit être parsé avant la génération" }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))
  const templateId = Number(body.templateId) || 1

  const buffer = await generateCvDocx(
    {
      contact: cv.contact,
      experiences: cv.experiences,
      skills: cv.skills,
      educations: cv.educations,
      languages: cv.languages,
      certifications: cv.certifications,
    },
    { companyName: cv.company.name, primaryColor: cv.company.primaryColor, fontFamily: cv.company.fontFamily },
    templateId
  )

  // Mettre à jour le statut
  await prisma.cv.update({
    where: { id: params.id },
    data: { status: "GENERATED", templateId },
  })

  const safeName = cv.originalFileName.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9-_]/g, "_")

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${safeName}_template${templateId}.docx"`,
    },
  })
}
