"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Language } from "@prisma/client"

const CEFR_COLOR: Record<string, string> = {
  A1: "bg-gray-100 text-gray-500", A2: "bg-gray-100 text-gray-500",
  B1: "bg-blue-100 text-blue-600", B2: "bg-blue-100 text-blue-700",
  C1: "bg-indigo-100 text-indigo-700", C2: "bg-violet-100 text-violet-700",
  native: "bg-green-100 text-green-700",
}

const CEFR_OPTIONS = ["A1", "A2", "B1", "B2", "C1", "C2", "native"]

export function LanguagesSection({ languages, cvId }: { languages: Language[]; cvId: string }) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ language: "", cefrLevel: "", levelLabel: "" })
  const [loading, setLoading] = useState(false)

  const del = async (id: string) => {
    await fetch(`/api/cv/${cvId}/languages/${id}`, { method: "DELETE" })
    router.refresh()
  }

  const add = async () => {
    if (!form.language.trim()) return
    setLoading(true)
    await fetch(`/api/cv/${cvId}/languages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: form.language, cefrLevel: form.cefrLevel || null, levelLabel: form.levelLabel || null }),
    })
    setLoading(false)
    setAdding(false)
    setForm({ language: "", cefrLevel: "", levelLabel: "" })
    router.refresh()
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-700">
          Langues <span className="text-gray-400 font-normal">({languages.length})</span>
        </h2>
        {!adding && (
          <button onClick={() => setAdding(true)} className="text-xs text-brand-600 hover:text-brand-700 font-medium">
            + Ajouter
          </button>
        )}
      </div>

      <div className="space-y-2">
        {languages.length === 0 && !adding && <p className="text-sm text-gray-400">Aucune langue extraite.</p>}

        {languages.map((l) => (
          <div key={l.id} className="flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-800">{l.language}</span>
              {l.cefrLevel && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${CEFR_COLOR[l.cefrLevel] ?? "bg-gray-100 text-gray-500"}`}>
                  {l.cefrLevel}
                </span>
              )}
              {l.levelLabel && <span className="text-xs text-gray-500">{l.levelLabel}</span>}
            </div>
            <button onClick={() => del(l.id)}
              className="text-xs text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
              Supprimer
            </button>
          </div>
        ))}

        {adding && (
          <div className="border border-brand-300 rounded-xl p-4 bg-brand-50/30 mt-2">
            <div className="grid grid-cols-3 gap-2 mb-3">
              <input placeholder="Langue (ex: Anglais)" value={form.language}
                onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
                className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
              <select value={form.cefrLevel} onChange={(e) => setForm((f) => ({ ...f, cefrLevel: e.target.value }))}
                className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="">Niveau CEFR</option>
                {CEFR_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
              <input placeholder="Label (ex: Courant)" value={form.levelLabel}
                onChange={(e) => setForm((f) => ({ ...f, levelLabel: e.target.value }))}
                className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div className="flex gap-2">
              <button onClick={add} disabled={loading}
                className="px-3 py-1.5 text-xs font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50">
                {loading ? "…" : "Ajouter"}
              </button>
              <button onClick={() => setAdding(false)}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
