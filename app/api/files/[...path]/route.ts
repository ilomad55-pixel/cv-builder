import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { readFileLocally } from "@/lib/storage/local"

const MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return new NextResponse("Non autorisé", { status: 401 })
  }

  const key = params.path.join("/")
  const ext = key.split(".").pop() ?? ""

  try {
    const buffer = await readFileLocally(key)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": MIME_BY_EXT[ext] ?? "application/octet-stream",
        "Content-Disposition": "inline",
      },
    })
  } catch {
    return new NextResponse("Fichier introuvable", { status: 404 })
  }
}
