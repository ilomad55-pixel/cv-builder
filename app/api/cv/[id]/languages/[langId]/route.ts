import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const schema = z.object({
  language: z.string().optional(),
  cefrLevel: z.string().nullable().optional(),
  levelLabel: z.string().nullable().optional(),
  display: z.boolean().optional(),
})

async function getLang(cvId: string, langId: string, companyId: string) {
  return prisma.language.findFirst({ where: { id: langId, cvId, cv: { companyId } } })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string; langId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  if (!await getLang(params.id, params.langId, session.user.id)) return NextResponse.json({ error: "Introuvable" }, { status: 404 })

  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 })

  const language = await prisma.language.update({ where: { id: params.langId }, data: parsed.data })
  return NextResponse.json({ language })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; langId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  if (!await getLang(params.id, params.langId, session.user.id)) return NextResponse.json({ error: "Introuvable" }, { status: 404 })

  await prisma.language.delete({ where: { id: params.langId } })
  return new NextResponse(null, { status: 204 })
}
