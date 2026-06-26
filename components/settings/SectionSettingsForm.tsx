"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"

type SectionConfig = { visible: boolean; order: number }
type Settings = Record<string, SectionConfig>

const DEFAULT_SECTIONS: Array<{ id: string; label: string }> = [
  { id: "profile",        label: "Profil / Résumé" },
  { id: "experiences",    label: "Expériences professionnelles" },
  { id: "skills",         label: "Compétences techniques" },
  { id: "methodologies",  label: "Méthodes & outils" },
  { id: "soft_skills",    label: "Soft skills" },
  { id: "education",      label: "Formation" },
  { id: "languages",      label: "Langues" },
  { id: "certifications", label: "Certifications" },
]

function buildDefault(): Settings {
  return Object.fromEntries(
    DEFAULT_SECTIONS.map((s, i) => [s.id, { visible: true, order: i }])
  )
}

function mergeWithDefaults(saved: Settings | null): Settings {
  const defaults = buildDefault()
  if (!saved) return defaults
  return Object.fromEntries(
    DEFAULT_SECTIONS.map((s) => [
      s.id,
      saved[s.id] ?? defaults[s.id],
    ])
  )
}

export function SectionSettingsForm({ initial }: { initial: Settings | null }) {
  const router = useRouter()
  const [settings, setSettings] = useState<Settings>(() => mergeWithDefaults(initial))
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const sorted = [...DEFAULT_SECTIONS].sort((a, b) => settings[a.id].order - settings[b.id].order)

  const toggle = (id: string) => setSettings((s) => ({ ...s, [id]: { ...s[id], visible: !s[id].visible } }))

  const move = useCallback((id: string, dir: -1 | 1) => {
    setSettings((prev) => {
      const entries = [...DEFAULT_SECTIONS]
        .map((s) => ({ id: s.id, ...prev[s.id] }))
        .sort((a, b) => a.order - b.order)

      const idx = entries.findIndex((e) => e.id === id)
      const swapIdx = idx + dir
      if (swapIdx < 0 || swapIdx >= entries.length) return prev

      const next = { ...prev }
      const tmp = next[entries[idx].id].order
      next[entries[idx].id] = { ...next[entries[idx].id], order: next[entries[swapIdx].id].order }
      next[entries[swapIdx].id] = { ...next[entries[swapIdx].id], order: tmp }
      return next
    })
  }, [])

  const save = async () => {
    setLoading(true)
    setSaved(false)
    await fetch("/api/settings/sections", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectionSettings: settings }),
    })
    setLoading(false)
    setSaved(true)
    router.refresh()
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Sections du CV</h2>
          <p className="text-xs text-gray-500 mt-0.5">Activez, désactivez et réorganisez les sections générées</p>
        </div>
        <button onClick={save} disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50">
          {loading ? "Enregistrement…" : saved ? "✓ Enregistré" : "Enregistrer"}
        </button>
      </div>

      <div className="space-y-2">
        {sorted.map((section, idx) => {
          const cfg = settings[section.id]
          return (
            <div key={section.id}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${cfg.visible ? "border-gray-200 bg-gray-50" : "border-dashed border-gray-200 bg-white opacity-60"}`}>
              {/* Poignée ordre */}
              <div className="flex flex-col gap-0.5">
                <button onClick={() => move(section.id, -1)} disabled={idx === 0}
                  className="text-gray-300 hover:text-gray-600 disabled:opacity-20 leading-none text-xs">▲</button>
                <button onClick={() => move(section.id, 1)} disabled={idx === sorted.length - 1}
                  className="text-gray-300 hover:text-gray-600 disabled:opacity-20 leading-none text-xs">▼</button>
              </div>

              {/* Label */}
              <span className="flex-1 text-sm font-medium text-gray-700">{section.label}</span>

              {/* Badge ordre */}
              <span className="text-xs text-gray-400 w-5 text-center">{idx + 1}</span>

              {/* Toggle visible */}
              <button
                onClick={() => toggle(section.id)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${cfg.visible ? "bg-brand-600" : "bg-gray-300"}`}
                title={cfg.visible ? "Masquer cette section" : "Afficher cette section"}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${cfg.visible ? "translate-x-4" : "translate-x-0.5"}`} />
              </button>
            </div>
          )
        })}
      </div>

      <p className="text-xs text-gray-400 mt-3">
        Les sections masquées n'apparaîtront pas dans le document Word généré.
      </p>
    </div>
  )
}
