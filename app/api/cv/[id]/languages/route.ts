import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const schema = z.object({
  language: z.string().min(1),
  cefrLevel: z.string().nullable().optional(),
  levelLabel: z.string().nullable().optional(),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const cv = await prisma.cv.findFirst({ where: { id: params.id, companyId: session.user.id } })
  if (!cv) return NextResponse.json({ error: "Introuvable" }, { status: 404 })

  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 })

  const last = await prisma.language.findFirst({ where: { cvId: params.id }, orderBy: { order: "desc" }, select: { order: true } })
  const lang = await prisma.language.create({ data: { cvId: params.id, order: (last?.order ?? -1) + 1, ...parsed.data } })
  return NextResponse.json({ language: lang }, { status: 201 })
}
