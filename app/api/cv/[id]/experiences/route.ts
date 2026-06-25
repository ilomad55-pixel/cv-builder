import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const schema = z.object({
  title: z.string().default(""),
  company: z.string().default(""),
  startDate: z.string().default(""),
  endDate: z.string().optional(),
  context: z.string().optional(),
  achievements: z.string().optional(),
  technologies: z.string().optional(),
})

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
  })
  if (!cv) return NextResponse.json({ error: "CV introuvable" }, { status: 404 })

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 })

  const last = await prisma.experience.findFirst({
    where: { cvId: params.id },
    orderBy: { order: "desc" },
    select: { order: true },
  })

  const experience = await prisma.experience.create({
    data: { cvId: params.id, order: (last?.order ?? -1) + 1, ...parsed.data },
  })

  return NextResponse.json({ experience }, { status: 201 })
}
