import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const body = await request.json()
  if (!body.blockSettings || typeof body.blockSettings !== "object") {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 })
  }

  const company = await prisma.company.update({
    where: { id: session.user.id },
    data: { blockSettings: body.blockSettings },
    select: { blockSettings: true },
  })

  return NextResponse.json({ blockSettings: company.blockSettings })
}
