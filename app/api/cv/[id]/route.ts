import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { deleteFile, extractKey } from "@/lib/storage"
import { z } from "zod"

const renameSchema = z.object({
  originalFileName: z.string().min(1),
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
  const parsed = renameSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Nom invalide" }, { status: 400 })

  const updated = await prisma.cv.update({
    where: { id: params.id },
    data: { originalFileName: parsed.data.originalFileName },
  })

  return NextResponse.json({ cv: updated })
}

export async function DELETE(
  _request: NextRequest,
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

  // Supprimer le fichier du stockage (best-effort)
  try {
    await deleteFile(extractKey(cv.originalFileUrl))
  } catch {
    // Le fichier peut ne pas exister — on continue
  }

  await prisma.cv.delete({ where: { id: params.id } })

  return new NextResponse(null, { status: 204 })
}
