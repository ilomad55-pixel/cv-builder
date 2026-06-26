import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { uploadFile, deleteFile, extractKey } from "@/lib/storage"

const ALLOWED = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/bmp"]
const MAX_BYTES = 2 * 1024 * 1024 // 2 MB

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get("logo") as File | null
  if (!file) return NextResponse.json({ error: "Fichier manquant" }, { status: 400 })

  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "Format non supporté (PNG, JPG, WEBP, SVG)" }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 2 Mo)" }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const ext = file.type.split("/")[1].replace("jpeg", "jpg").replace("svg+xml", "svg")
  const key = `logos/${session.user.id}.${ext}`

  // Supprimer l'ancien logo si différent
  const company = await prisma.company.findUnique({
    where: { id: session.user.id },
    select: { logoUrl: true },
  })
  if (company?.logoUrl) {
    try { await deleteFile(extractKey(company.logoUrl)) } catch { /* ignore */ }
  }

  const url = await uploadFile({ buffer, key, contentType: file.type })

  await prisma.company.update({
    where: { id: session.user.id },
    data: { logoUrl: url },
  })

  return NextResponse.json({ logoUrl: url })
}

export async function DELETE(_request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const company = await prisma.company.findUnique({
    where: { id: session.user.id },
    select: { logoUrl: true },
  })
  if (company?.logoUrl) {
    try { await deleteFile(extractKey(company.logoUrl)) } catch { /* ignore */ }
  }

  await prisma.company.update({ where: { id: session.user.id }, data: { logoUrl: null } })
  return new NextResponse(null, { status: 204 })
}
