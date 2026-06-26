import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const schema = z.object({
  name: z.string().optional(),
  category: z.enum(["technical", "tool", "methodology", "soft"]).optional(),
  level: z.string().nullable().optional(),
  display: z.boolean().optional(),
})

async function getSkill(cvId: string, skillId: string, companyId: string) {
  return prisma.skill.findFirst({ where: { id: skillId, cvId, cv: { companyId } } })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string; skillId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  if (!await getSkill(params.id, params.skillId, session.user.id)) return NextResponse.json({ error: "Introuvable" }, { status: 404 })

  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 })

  const skill = await prisma.skill.update({ where: { id: params.skillId }, data: parsed.data })
  return NextResponse.json({ skill })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; skillId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  if (!await getSkill(params.id, params.skillId, session.user.id)) return NextResponse.json({ error: "Introuvable" }, { status: 404 })

  await prisma.skill.delete({ where: { id: params.skillId } })
  return new NextResponse(null, { status: 204 })
}
