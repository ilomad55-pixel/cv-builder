import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { StatusBadge } from "@/components/cv/StatusBadge"
import { ParseButton } from "@/components/cv/ParseButton"
import Link from "next/link"

export default async function CvDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return null

  const cv = await prisma.cv.findFirst({
    where: { id: params.id, companyId: session.user.id },
  })

  if (!cv) notFound()

  const wordCount = cv.rawText ? cv.rawText.split(/\s+/).filter(Boolean).length : 0
  const textPreview = cv.rawText
    ? cv.rawText.slice(0, 2500) + (cv.rawText.length > 2500 ? "\n\n[…]" : "")
    : null

  return (
    <div className="max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/dashboard" className="hover:text-gray-900 transition-colors">
          CVs
        </Link>
        <span>/</span>
        <span className="text-gray-900 truncate max-w-xs">{cv.originalFileName}</span>
      </div>

      {/* En-tête */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{cv.originalFileName}</h1>
            <p className="text-sm text-gray-500 mt-1">
              Importé le {new Date(cv.createdAt).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <StatusBadge status={cv.status} />
        </div>
      </div>

      {/* Bloc extraction */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Extraction du texte</h2>

        {cv.status === "PENDING" && (
          <div className="flex items-center gap-4">
            <p className="text-sm text-gray-500">
              L&apos;extraction automatique a échoué (PDF scanné ou fichier corrompu).
            </p>
            <ParseButton cvId={cv.id} />
          </div>
        )}

        {cv.status !== "PENDING" && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-green-700 font-medium">
              ✓ {wordCount.toLocaleString("fr-FR")} mots extraits
            </p>
            <ParseButton cvId={cv.id} label="Re-extraire" />
          </div>
        )}
      </div>

      {/* Aperçu du texte brut */}
      {textPreview && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">Texte brut extrait</h2>
            <span className="text-xs text-gray-400">{wordCount.toLocaleString("fr-FR")} mots</span>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 max-h-80 overflow-y-auto">
            <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono leading-relaxed">
              {textPreview}
            </pre>
          </div>
        </div>
      )}

      {/* Sprint 3 — Parsing IA (placeholder) */}
      <div className="bg-white rounded-xl border border-dashed border-gray-200 p-6 opacity-60">
        <h2 className="text-sm font-semibold text-gray-500 mb-1">Parsing IA — Sprint 3</h2>
        <p className="text-xs text-gray-400">
          Extraction des champs structurés (contact, profil, expériences) via Claude API.
          {cv.status === "PENDING" && " Disponible après extraction du texte."}
        </p>
      </div>
    </div>
  )
}
