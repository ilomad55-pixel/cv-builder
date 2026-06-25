"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"

interface AiParseButtonProps {
  cvId: string
  label?: string
}

export function AiParseButton({ cvId, label = "Parser avec l'IA" }: AiParseButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAiParse() {
    setLoading(true)
    setError(null)

    const res = await fetch(`/api/cv/${cvId}/ai-parse`, { method: "POST" })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? "Erreur lors du parsing IA")
      setLoading(false)
      return
    }

    setLoading(false)
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-1">
      <Button onClick={handleAiParse} loading={loading}>
        {loading ? "Analyse en cours…" : label}
      </Button>
      {error && <p className="text-xs text-red-500 max-w-xs">{error}</p>}
    </div>
  )
}
