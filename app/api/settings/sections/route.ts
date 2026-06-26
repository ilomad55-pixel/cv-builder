import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const body = await request.json()
  if (!body.sectionSettings || typeof body.sectionSettings !== "object") {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 })
  }

  const company = await prisma.company.update({
    where: { id: session.user.id },
    data: { sectionSettings: body.sectionSettings },
    select: { sectionSettings: true },
  })

  return NextResponse.json({ sectionSettings: company.sectionSettings })
}
