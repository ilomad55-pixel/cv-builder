"use client"

import { signOut } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/Button"

interface NavbarProps {
  companyName: string
  primaryColor: string
}

export function Navbar({ companyName, primaryColor }: NavbarProps) {
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href)

  const linkClass = (href: string) =>
    `text-sm font-medium transition-colors ${
      isActive(href) ? "text-gray-900" : "text-gray-500 hover:text-gray-700"
    }`

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-0 flex items-stretch justify-between">
      <div className="flex items-stretch gap-6">
        {/* Logo avec couleur entreprise */}
        <Link
          href="/dashboard"
          className="flex items-center text-base font-bold py-3 pr-4 border-r border-gray-100"
          style={{ color: primaryColor }}
        >
          CV Builder
        </Link>

        <nav className="flex items-stretch gap-1">
          {[
            { href: "/dashboard", label: "CVs" },
            { href: "/settings", label: "Paramètres" },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`${linkClass(href)} flex items-center px-3 border-b-2 transition-colors ${
                isActive(href) ? "border-b-2" : "border-transparent"
              }`}
              style={isActive(href) ? { borderColor: primaryColor, color: primaryColor } : {}}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-600">{companyName}</span>
        <Button
          variant="secondary"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-xs px-3 py-1.5"
        >
          Déconnexion
        </Button>
      </div>
    </header>
  )
}
