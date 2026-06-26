import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const schema = z.object({
  degree: z.string().optional(),
  fieldOfStudy: z.string().nullable().optional(),
  school: z.string().optional(),
  location: z.string().nullable().optional(),
  startYear: z.string().nullable().optional(),
  endYear: z.string().nullable().optional(),
  level: z.string().nullable().optional(),
  honors: z.string().nullable().optional(),
})

async function getEdu(cvId: string, eduId: string, companyId: string) {
  return prisma.education.findFirst({ where: { id: eduId, cvId, cv: { companyId } } })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string; eduId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  if (!await getEdu(params.id, params.eduId, session.user.id)) return NextResponse.json({ error: "Introuvable" }, { status: 404 })

  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 })

  const education = await prisma.education.update({ where: { id: params.eduId }, data: parsed.data })
  return NextResponse.json({ education })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; eduId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  if (!await getEdu(params.id, params.eduId, session.user.id)) return NextResponse.json({ error: "Introuvable" }, { status: 404 })

  await prisma.education.delete({ where: { id: params.eduId } })
  return new NextResponse(null, { status: 204 })
}
