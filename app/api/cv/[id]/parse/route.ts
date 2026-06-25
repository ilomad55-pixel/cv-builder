import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { downloadFile, extractKey } from "@/lib/storage"
import { extractText, mimeTypeFromExtension } from "@/lib/parsers"

export async function POST(
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

  if (!cv) {
    return NextResponse.json({ error: "CV introuvable" }, { status: 404 })
  }

  let buffer: Buffer
  try {
    const key = extractKey(cv.originalFileUrl)
    buffer = await downloadFile(key)
  } catch {
    return NextResponse.json(
      { error: "Impossible de télécharger le fichier depuis le stockage" },
      { status: 500 }
    )
  }

  const mimeType = mimeTypeFromExtension(cv.originalFileName)
  const result = await extractText(buffer, mimeType)

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 422 })
  }

  const updated = await prisma.cv.update({
    where: { id: cv.id },
    data: {
      status: "TEXT_EXTRACTED",
      rawText: result.text,
    },
  })

  return NextResponse.json({ cv: updated, wordCount: result.wordCount })
}
