import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const schema = z.object({
  name: z.string().min(1).optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  fontFamily: z.enum(["Arial", "Calibri", "Times New Roman", "Georgia"]).optional(),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const company = await prisma.company.findUnique({
    where: { id: session.user.id },
    select: { name: true, primaryColor: true, fontFamily: true, logoUrl: true },
  })

  return NextResponse.json({ company })
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 })

  const company = await prisma.company.update({
    where: { id: session.user.id },
    data: parsed.data,
    select: { name: true, primaryColor: true, fontFamily: true, logoUrl: true },
  })

  return NextResponse.json({ company })
}
