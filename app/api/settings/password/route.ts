import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "Le mot de passe doit faire au moins 8 caractères"),
})

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const company = await prisma.company.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  })
  if (!company) return NextResponse.json({ error: "Compte introuvable" }, { status: 404 })

  const isValid = await bcrypt.compare(parsed.data.currentPassword, company.passwordHash)
  if (!isValid) return NextResponse.json({ error: "Mot de passe actuel incorrect" }, { status: 400 })

  const newHash = await bcrypt.hash(parsed.data.newPassword, 12)
  await prisma.company.update({
    where: { id: session.user.id },
    data: { passwordHash: newHash },
  })

  return NextResponse.json({ success: true })
}
