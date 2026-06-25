import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { StatusBadge } from "@/components/cv/StatusBadge"
import { ParseButton } from "@/components/cv/ParseButton"
import { AiParseButton } from "@/components/cv/AiParseButton"
import { ContactCard } from "@/components/cv/ContactCard"
import { ExperienceList } from "@/components/cv/ExperienceList"
import Link from "next/link"

export default async function CvDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return null

  const cv = await prisma.cv.findFirst({
    where: { id: params.id, companyId: session.user.id },
    include: {
      contact: true,
      experiences: { orderBy: { order: "asc" } },
    },
  })

  if (!cv) notFound()

  const wordCount = cv.rawText ? cv.rawText.split(/\s+/).filter(Boolean).length : 0
  const isParsed = cv.status === "PARSED" || cv.status === "GENERATED"
  const hasText = cv.status === "TEXT_EXTRACTED" || isParsed

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
              Importé le{" "}
              {new Date(cv.createdAt).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <StatusBadge status={cv.status} />
        </div>
      </div>

      {/* Étape 1 — Extraction du texte brut */}
      {cv.status === "PENDING" && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-5 mb-4">
          <p className="text-sm font-medium text-amber-800 mb-1">Extraction automatique échouée</p>
          <p className="text-xs text-amber-600 mb-3">
            Le fichier est peut-être un PDF scanné ou corrompu. Réessayez manuellement.
          </p>
          <ParseButton cvId={cv.id} />
        </div>
      )}

      {/* Étape 2 — Parsing IA */}
      {hasText && !isParsed && (
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-5 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-800">
                Texte extrait — {wordCount.toLocaleString("fr-FR")} mots
              </p>
              <p className="text-xs text-blue-600 mt-0.5">
                Prêt pour le parsing IA. Claude va extraire les champs structurés.
              </p>
            </div>
            <AiParseButton cvId={cv.id} />
          </div>
        </div>
      )}

      {/* Données structurées — Contact */}
      {isParsed && cv.contact && (
        <div className="mb-4">
          <ContactCard contact={cv.contact} cvId={cv.id} />
        </div>
      )}

      {/* Données structurées — Expériences */}
      {isParsed && (
        <div className="mb-4">
          <ExperienceList experiences={cv.experiences} cvId={cv.id} />
        </div>
      )}

      {/* Re-parser (disponible si déjà parsé) */}
      {isParsed && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">
                {cv.experiences.length} expérience{cv.experiences.length !== 1 ? "s" : ""} extraite{cv.experiences.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex gap-2">
              <ParseButton cvId={cv.id} label="Re-extraire le texte" />
              <AiParseButton cvId={cv.id} label="Re-parser avec l'IA" />
            </div>
          </div>
        </div>
      )}

      {/* Aperçu texte brut (collapsible visuel — uniquement si texte disponible) */}
      {cv.rawText && !isParsed && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Texte brut extrait
          </p>
          <div className="bg-gray-50 rounded-lg p-3 max-h-52 overflow-y-auto">
            <pre className="text-xs text-gray-500 whitespace-pre-wrap font-mono leading-relaxed">
              {cv.rawText.slice(0, 1500)}
              {cv.rawText.length > 1500 ? "\n\n[…]" : ""}
            </pre>
          </div>
        </div>
      )}

      {/* Sprint 5 — Génération Word (placeholder) */}
      <div className="bg-white rounded-xl border border-dashed border-gray-200 p-5 opacity-50">
        <p className="text-sm font-semibold text-gray-500 mb-1">Génération Word — Sprint 5</p>
        <p className="text-xs text-gray-400">
          Sélection du template + injection charte graphique → téléchargement .docx ATS-compatible.
          {!isParsed && " Disponible après le parsing IA."}
        </p>
      </div>
    </div>
  )
}
