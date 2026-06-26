import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const schema = z.object({
  name: z.string().min(1),
  category: z.enum(["technical", "tool", "methodology", "soft"]).default("technical"),
  level: z.string().nullable().optional(),
})

async function checkOwner(cvId: string, companyId: string) {
  return prisma.cv.findFirst({ where: { id: cvId, companyId } })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  if (!await checkOwner(params.id, session.user.id)) return NextResponse.json({ error: "Introuvable" }, { status: 404 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 })

  const last = await prisma.skill.findFirst({ where: { cvId: params.id }, orderBy: { order: "desc" }, select: { order: true } })
  const skill = await prisma.skill.create({
    data: { cvId: params.id, order: (last?.order ?? -1) + 1, ...parsed.data },
  })
  return NextResponse.json({ skill }, { status: 201 })
}
