import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const schema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  headline: z.string().nullable().optional(),
  seniority: z.string().nullable().optional(),
  yearsOfExperience: z.string().nullable().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  linkedin: z.string().nullable().optional(),
  github: z.string().nullable().optional(),
  profileText: z.string().optional(),
})

export async function PATCH(
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

  const contact = await prisma.contact.upsert({
    where: { cvId: params.id },
    update: parsed.data,
    create: { cvId: params.id, ...parsed.data },
  })

  return NextResponse.json({ contact })
}
