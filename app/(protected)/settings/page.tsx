import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { BrandingForm } from "@/components/settings/BrandingForm"

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  if (!session) return null

  const company = await prisma.company.findUnique({
    where: { id: session.user.id },
    select: { name: true, primaryColor: true, fontFamily: true },
  })

  if (!company) return null

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
        <p className="text-sm text-gray-500 mt-0.5">Charte graphique appliquée à tous vos CVs générés</p>
      </div>
      <BrandingForm initial={company} />
    </div>
  )
}
