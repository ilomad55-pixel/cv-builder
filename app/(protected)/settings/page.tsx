import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { BrandingForm } from "@/components/settings/BrandingForm"
import { PasswordForm } from "@/components/settings/PasswordForm"
import { SectionSettingsForm } from "@/components/settings/SectionSettingsForm"
import { LogoUpload } from "@/components/settings/LogoUpload"
import { BlockSettingsForm } from "@/components/settings/BlockSettingsForm"
import type { BlockSettings } from "@/components/settings/BlockSettingsForm"

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  if (!session) return null

  const company = await prisma.company.findUnique({
    where: { id: session.user.id },
    select: { name: true, primaryColor: true, secondaryColor: true, fontFamily: true, logoUrl: true, sectionSettings: true, blockSettings: true },
  })

  if (!company) return null

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
        <p className="text-sm text-gray-500 mt-0.5">Charte graphique et configuration des CVs générés</p>
      </div>
      <LogoUpload currentUrl={company.logoUrl} />
      <BrandingForm initial={{ name: company.name, primaryColor: company.primaryColor, secondaryColor: company.secondaryColor ?? "#e67700", fontFamily: company.fontFamily }} />
      <BlockSettingsForm
        initial={company.blockSettings as BlockSettings | null}
        primaryColor={company.primaryColor}
        fontFamily={company.fontFamily}
      />
      <SectionSettingsForm initial={company.sectionSettings as Record<string, { visible: boolean; order: number }> | null} />
      <PasswordForm />
    </div>
  )
}
