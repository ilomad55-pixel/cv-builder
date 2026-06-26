import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const schema = z.object({
  title: z.string().optional(),
  company: z.string().optional(),
  client: z.string().nullable().optional(),
  startDate: z.string().optional(),
  endDate: z.string().nullable().optional(),
  isCurrent: z.boolean().optional(),
  context: z.string().nullable().optional(),
  achievements: z.string().nullable().optional(),
  technologies: z.string().nullable().optional(),
  methods: z.string().nullable().optional(),
})

async function getExperience(cvId: string, expId: string, companyId: string) {
  return prisma.experience.findFirst({
    where: { id: expId, cvId, cv: { companyId } },
  })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; expId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const exp = await getExperience(params.id, params.expId, session.user.id)
  if (!exp) return NextResponse.json({ error: "Expérience introuvable" }, { status: 404 })

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 })

  const updated = await prisma.experience.update({
    where: { id: params.expId },
    data: parsed.data,
  })

  return NextResponse.json({ experience: updated })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; expId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const exp = await getExperience(params.id, params.expId, session.user.id)
  if (!exp) return NextResponse.json({ error: "Expérience introuvable" }, { status: 404 })

  await prisma.experience.delete({ where: { id: params.expId } })

  return new NextResponse(null, { status: 204 })
}
