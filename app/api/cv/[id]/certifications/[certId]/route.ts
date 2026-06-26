import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const schema = z.object({
  name: z.string().optional(),
  issuer: z.string().nullable().optional(),
  issueDate: z.string().nullable().optional(),
  expirationDate: z.string().nullable().optional(),
  credentialUrl: z.string().nullable().optional(),
  display: z.boolean().optional(),
})

async function getCert(cvId: string, certId: string, companyId: string) {
  return prisma.certification.findFirst({ where: { id: certId, cvId, cv: { companyId } } })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string; certId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  if (!await getCert(params.id, params.certId, session.user.id)) return NextResponse.json({ error: "Introuvable" }, { status: 404 })

  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 })

  const certification = await prisma.certification.update({ where: { id: params.certId }, data: parsed.data })
  return NextResponse.json({ certification })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; certId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  if (!await getCert(params.id, params.certId, session.user.id)) return NextResponse.json({ error: "Introuvable" }, { status: 404 })

  await prisma.certification.delete({ where: { id: params.certId } })
  return new NextResponse(null, { status: 204 })
}
