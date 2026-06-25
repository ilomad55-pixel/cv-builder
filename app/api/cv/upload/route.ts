import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { uploadToR2 } from "@/lib/storage/r2"
import { prisma } from "@/lib/prisma"
import { extractText } from "@/lib/parsers"

const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]

const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 Mo

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 })
  }

  const file = formData.get("file") as File | null

  if (!file) {
    return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Format non supporté. Utilisez un fichier PDF ou Word (.docx)." },
      { status: 400 }
    )
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: "Fichier trop volumineux (maximum 10 Mo)" },
      { status: 400 }
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const ext = file.name.split(".").pop() ?? "bin"
  const key = `cvs/${session.user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  // Upload R2 et extraction texte en parallèle
  const [fileUrl, parseResult] = await Promise.all([
    uploadToR2({ buffer, key, contentType: file.type }).catch(() => null),
    extractText(buffer, file.type),
  ])

  if (!fileUrl) {
    return NextResponse.json(
      { error: "Erreur lors de l'upload du fichier" },
      { status: 500 }
    )
  }

  const cv = await prisma.cv.create({
    data: {
      companyId: session.user.id,
      originalFileUrl: fileUrl,
      originalFileName: file.name,
      status: parseResult.success ? "TEXT_EXTRACTED" : "PENDING",
      rawText: parseResult.success ? parseResult.text : null,
    },
  })

  return NextResponse.json(
    {
      cv,
      parseWarning: parseResult.success ? null : parseResult.error,
    },
    { status: 201 }
  )
}
