import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UploadForm } from "@/components/cv/UploadForm"
import { CvTable } from "@/components/cv/CvTable"
import { CvStatus } from "@prisma/client"

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
          <p className="text-sm text-gray-500 mt-0.5">
            {cvs.length} CV{cvs.length !== 1 ? "s" : ""} importé{cvs.length !== 1 ? "s" : ""}
          </p>
        </div>
        <UploadForm />
      </div>

      {cvs.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center">
          <p className="text-gray-500 text-sm">Aucun CV importé pour l&apos;instant.</p>
          <p className="text-gray-400 text-xs mt-1">Importez un CV PDF ou Word pour commencer.</p>
        </div>
      ) : (
        <CvTable cvs={cvs.map((cv) => ({ ...cv, status: cv.status as CvStatus }))} />
      )}
    </div>
  )
}
