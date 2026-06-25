"use client"

import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { TEMPLATES } from "@/lib/docx/generator"

interface Props {
  cvId: string
  primaryColor: string
  currentTemplateId?: number | null
}

export function GenerateSection({ cvId, primaryColor, currentTemplateId }: Props) {
  const [selectedTemplate, setSelectedTemplate] = useState(currentTemplateId ?? 1)
  const [generating, setGenerating] = useState(false)

  const generate = async () => {
    setGenerating(true)
    const res = await fetch(`/api/cv/${cvId}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId: selectedTemplate }),
    })

    if (res.ok) {
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ?? "cv.docx"
      a.click()
      URL.revokeObjectURL(url)
    }
    setGenerating(false)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-sm font-semibold text-gray-700 mb-1">Génération Word</h2>
      <p className="text-xs text-gray-400 mb-5">
        Choisissez un template — votre charte graphique (couleur, police) sera appliquée automatiquement.
      </p>

      <div className="grid grid-cols-3 gap-3 mb-6">
        {TEMPLATES.map((tpl) => (
          <button
            key={tpl.id}
            onClick={() => setSelectedTemplate(tpl.id)}
            className={`text-left rounded-xl border-2 p-4 transition-all ${
              selectedTemplate === tpl.id
                ? "border-brand-500 bg-brand-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            {/* Mini preview */}
            <div className="mb-3 h-16 rounded-lg bg-gray-50 border border-gray-100 p-2 overflow-hidden">
              {tpl.id === 1 && (
                <>
                  <div className="h-2 w-16 rounded mb-1" style={{ backgroundColor: primaryColor }} />
                  <div className="h-1 w-full bg-gray-200 rounded mb-1" />
                  <div className="h-1 w-24 bg-gray-200 rounded mb-1" />
                  <div className="h-1 w-20 bg-gray-200 rounded" />
                </>
              )}
              {tpl.id === 2 && (
                <>
                  <div className="h-3 w-20 rounded mb-1.5" style={{ backgroundColor: primaryColor, opacity: 0.9 }} />
                  <div className="h-0.5 w-full rounded mb-1.5" style={{ backgroundColor: primaryColor }} />
                  <div className="flex gap-1 mb-1">
                    <div className="w-0.5 rounded" style={{ backgroundColor: primaryColor }} />
                    <div className="flex-1 space-y-0.5">
                      <div className="h-1 w-16 bg-gray-200 rounded" />
                      <div className="h-1 w-12 bg-gray-200 rounded" />
                    </div>
                  </div>
                </>
              )}
              {tpl.id === 3 && (
                <>
                  <div className="h-2 w-14 bg-gray-700 rounded mb-1" />
                  <div className="h-1 w-24 bg-gray-300 rounded mb-1.5" />
                  <div className="h-1 w-full bg-gray-200 rounded mb-0.5" />
                  <div className="h-1 w-full bg-gray-200 rounded mb-0.5" />
                  <div className="h-1 w-20 bg-gray-200 rounded" />
                </>
              )}
            </div>

            <p className="text-sm font-semibold text-gray-800 mb-0.5">{tpl.name}</p>
            <p className="text-xs text-gray-400 leading-tight">{tpl.description}</p>

            {selectedTemplate === tpl.id && (
              <div
                className="mt-2 h-0.5 rounded"
                style={{ backgroundColor: primaryColor }}
              />
            )}
          </button>
        ))}
      </div>

      <Button onClick={generate} loading={generating} className="w-full justify-center">
        {generating ? "Génération en cours…" : "Télécharger le CV Word (.docx)"}
      </Button>
    </div>
  )
}
