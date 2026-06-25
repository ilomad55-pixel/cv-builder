"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"

interface ParseButtonProps {
  cvId: string
  label?: string
}

export function ParseButton({ cvId, label = "Extraire le texte" }: ParseButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleParse() {
    setLoading(true)
    setError(null)

    const res = await fetch(`/api/cv/${cvId}/parse`, { method: "POST" })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? "Erreur lors de l'extraction")
      setLoading(false)
      return
    }

    setLoading(false)
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-1">
      <Button onClick={handleParse} loading={loading} variant="secondary">
        {label}
      </Button>
      {error && <p className="text-xs text-red-500 max-w-xs">{error}</p>}
    </div>
  )
}
