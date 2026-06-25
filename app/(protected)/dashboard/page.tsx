import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UploadForm } from "@/components/cv/UploadForm"
import { StatusBadge } from "@/components/cv/StatusBadge"
import { CvStatus } from "@prisma/client"
import Link from "next/link"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) return null

  const cvs = await prisma.cv.findMany({
    where: { companyId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      originalFileName: true,
      status: true,
      createdAt: true,
    },
  })

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CVs</h1>
          <p className="text-sm text-gray-500 mt-0.5">{cvs.length} CV{cvs.length !== 1 ? "s" : ""} importé{cvs.length !== 1 ? "s" : ""}</p>
        </div>
        <UploadForm />
      </div>

      {cvs.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center">
          <p className="text-gray-500 text-sm">Aucun CV importé pour l&apos;instant.</p>
          <p className="text-gray-400 text-xs mt-1">Importez un CV PDF ou Word pour commencer.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fichier</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Statut</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cvs.map((cv) => (
                  <tr key={cv.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{cv.originalFileName}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={cv.status as CvStatus} />
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(cv.createdAt).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/cv/${cv.id}`}
                        className="text-brand-600 hover:underline text-xs font-medium"
                      >
                        Ouvrir →
                      </Link>
                    </td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
