"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Skill } from "@prisma/client"

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  technical: { label: "Technique", color: "bg-blue-100 text-blue-700" },
  tool:       { label: "Outils",    color: "bg-violet-100 text-violet-700" },
  methodology:{ label: "Méthodes", color: "bg-teal-100 text-teal-700" },
  soft:       { label: "Soft",     color: "bg-amber-100 text-amber-700" },
}

const LEVEL_COLORS: Record<string, string> = {
  beginner:     "bg-gray-100 text-gray-500",
  intermediate: "bg-yellow-100 text-yellow-700",
  advanced:     "bg-orange-100 text-orange-700",
  expert:       "bg-red-100 text-red-700",
}

interface Props { skills: Skill[]; cvId: string }

export function SkillsSection({ skills, cvId }: Props) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [newSkill, setNewSkill] = useState({ name: "", category: "technical", level: "" })
  const [loading, setLoading] = useState(false)

  const byCategory = skills.reduce<Record<string, Skill[]>>((acc, s) => {
    ;(acc[s.category] ??= []).push(s)
    return acc
  }, {})

  const deleteSkill = async (id: string) => {
    await fetch(`/api/cv/${cvId}/skills/${id}`, { method: "DELETE" })
    router.refresh()
  }

  const addSkill = async () => {
    if (!newSkill.name.trim()) return
    setLoading(true)
    await fetch(`/api/cv/${cvId}/skills`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newSkill, level: newSkill.level || null }),
    })
    setLoading(false)
    setAdding(false)
    setNewSkill({ name: "", category: "technical", level: "" })
    router.refresh()
  }

  const categories = Object.keys(CATEGORY_META)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-700">
          Compétences <span className="text-gray-400 font-normal">({skills.length})</span>
        </h2>
        {!adding && (
          <button onClick={() => setAdding(true)} className="text-xs text-brand-600 hover:text-brand-700 font-medium">
            + Ajouter
          </button>
        )}
      </div>

      <div className="space-y-4">
        {categories.map((cat) => {
          const items = byCategory[cat]
          if (!items?.length) return null
          const meta = CATEGORY_META[cat]
          return (
            <div key={cat}>
              <p className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full mb-2 ${meta.color}`}>
                {meta.label}
              </p>
              <div className="flex flex-wrap gap-2">
                {items.map((s) => (
                  <div key={s.id} className="group flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1">
                    <span className="text-xs text-gray-800">{s.name}</span>
                    {s.level && (
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${LEVEL_COLORS[s.level] ?? "bg-gray-100 text-gray-500"}`}>
                        {s.level}
                      </span>
                    )}
                    <button
                      onClick={() => deleteSkill(s.id)}
                      className="ml-1 text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                      title="Supprimer"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {skills.length === 0 && !adding && (
          <p className="text-sm text-gray-400">Aucune compétence extraite.</p>
        )}

        {adding && (
          <div className="border border-brand-300 rounded-xl p-4 bg-brand-50/30 mt-2">
            <p className="text-sm font-semibold text-gray-700 mb-3">Nouvelle compétence</p>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <input
                placeholder="Nom (ex: React)"
                value={newSkill.name}
                onChange={(e) => setNewSkill((f) => ({ ...f, name: e.target.value }))}
                className="col-span-1 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <select
                value={newSkill.category}
                onChange={(e) => setNewSkill((f) => ({ ...f, category: e.target.value }))}
                className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {Object.entries(CATEGORY_META).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
              <select
                value={newSkill.level}
                onChange={(e) => setNewSkill((f) => ({ ...f, level: e.target.value }))}
                className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Niveau (optionnel)</option>
                <option value="beginner">Débutant</option>
                <option value="intermediate">Intermédiaire</option>
                <option value="advanced">Avancé</option>
                <option value="expert">Expert</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={addSkill}
                disabled={loading}
                className="px-3 py-1.5 text-xs font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50"
              >
                {loading ? "…" : "Ajouter"}
              </button>
              <button
                onClick={() => setAdding(false)}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
