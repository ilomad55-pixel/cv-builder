import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { uploadFile, deleteFile, extractKey } from "@/lib/storage"

const ALLOWED = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/bmp", "image/webp"]
const MAX_BYTES = 3 * 1024 * 1024

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const cv = await prisma.cv.findFirst({
    where: { id: params.id, companyId: session.user.id },
    include: { contact: { select: { id: true, photoUrl: true } } },
  })
  if (!cv || !cv.contact) return NextResponse.json({ error: "CV introuvable" }, { status: 404 })

  const form = await request.formData()
  const file = form.get("file") as File | null
  if (!file) return NextResponse.json({ error: "Fichier manquant" }, { status: 400 })
  if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: "Format non supporté (PNG, JPG, WEBP)" }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Fichier trop lourd (max 3 Mo)" }, { status: 400 })

  // Supprimer l'ancienne photo
  if (cv.contact.photoUrl) {
    try { await deleteFile(extractKey(cv.contact.photoUrl)) } catch { /* ignore */ }
  }

  const ext = file.type.split("/")[1].replace("jpeg", "jpg")
  const key = `photos/${cv.id}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())
  const photoUrl = await uploadFile({ buffer, key, contentType: file.type })

  await prisma.contact.update({ where: { id: cv.contact.id }, data: { photoUrl } })

  return NextResponse.json({ photoUrl })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const cv = await prisma.cv.findFirst({
    where: { id: params.id, companyId: session.user.id },
    include: { contact: { select: { id: true, photoUrl: true } } },
  })
  if (!cv || !cv.contact) return NextResponse.json({ error: "CV introuvable" }, { status: 404 })

  if (cv.contact.photoUrl) {
    try { await deleteFile(extractKey(cv.contact.photoUrl)) } catch { /* ignore */ }
    await prisma.contact.update({ where: { id: cv.contact.id }, data: { photoUrl: null } })
  }

  return NextResponse.json({ ok: true })
}
