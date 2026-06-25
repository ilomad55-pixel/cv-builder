"use client"

import { signOut } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/Button"

interface NavbarProps {
  companyName: string
}

export function Navbar({ companyName }: NavbarProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link href="/dashboard" className="text-lg font-bold text-brand-600">
          CV Builder
        </Link>
        <nav className="flex items-center gap-4 text-sm text-gray-600">
          <Link href="/dashboard" className="hover:text-gray-900 transition-colors">
            CVs
          </Link>
          <Link href="/settings" className="hover:text-gray-900 transition-colors">
            Paramètres
          </Link>
        </nav>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">{companyName}</span>
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
