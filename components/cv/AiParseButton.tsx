"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"

interface ParseSummary {
  experiences: number
  skills: number
  education: number
  languages: number
  certifications: number
  confidence: number
  warnings: string[]
}

function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const color = pct >= 80 ? "text-green-700 bg-green-100" : pct >= 55 ? "text-amber-700 bg-amber-100" : "text-red-700 bg-red-100"
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>{pct}% confiance</span>
}

export function AiParseButton({ cvId, label = "Parser avec l'IA" }: { cvId: string; label?: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<ParseSummary | null>(null)

  async function handleAiParse() {
    setLoading(true)
    setError(null)
    setSummary(null)

    const res = await fetch(`/api/cv/${cvId}/ai-parse`, { method: "POST" })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? "Erreur lors du parsing IA")
      setLoading(false)
      return
    }

    setSummary(data.summary)
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={handleAiParse} loading={loading}>
        {loading ? "Analyse en cours…" : label}
      </Button>

      {error && <p className="text-xs text-red-500 max-w-xs">{error}</p>}

      {summary && (
        <div className="mt-1 p-3 bg-green-50 border border-green-200 rounded-xl text-xs">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-semibold text-green-800">Parsing réussi</span>
            <ConfidenceBadge value={summary.confidence} />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-green-700 mb-2">
            <span>{summary.experiences} exp.</span>
            <span>{summary.skills} compétences</span>
            <span>{summary.education} formations</span>
            <span>{summary.languages} langues</span>
            <span>{summary.certifications} certifications</span>
          </div>
          {summary.warnings.length > 0 && (
            <div className="mt-2 pt-2 border-t border-green-200">
              <p className="text-amber-700 font-medium mb-1">Avertissements :</p>
              <ul className="space-y-0.5">
                {summary.warnings.slice(0, 5).map((w, i) => (
                  <li key={i} className="text-amber-600">· {w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
