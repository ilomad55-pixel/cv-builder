import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Navbar } from "@/components/layout/Navbar"

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const company = await prisma.company.findUnique({
    where: { id: session.user.id },
    select: { name: true },
  })

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar companyName={company?.name ?? session.user.name ?? ""} />
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}
