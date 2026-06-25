"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Experience } from "@prisma/client"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"

interface ExperienceListProps {
  experiences: Experience[]
  cvId: string
}

type ExpForm = {
  title: string
  company: string
  startDate: string
  endDate: string
  context: string
  achievements: string
  technologies: string
}

const emptyForm = (): ExpForm => ({
  title: "",
  company: "",
  startDate: "",
  endDate: "",
  context: "",
  achievements: "",
  technologies: "",
})

function expToForm(exp: Experience): ExpForm {
  return {
    title: exp.title ?? "",
    company: exp.company ?? "",
    startDate: exp.startDate ?? "",
    endDate: exp.endDate ?? "",
    context: exp.context ?? "",
    achievements: exp.achievements ?? "",
    technologies: exp.technologies ?? "",
  }
}

function ExperienceForm({
  form,
  onChange,
  onSave,
  onCancel,
  loading,
  error,
  label,
}: {
  form: ExpForm
  onChange: (field: keyof ExpForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  onSave: () => void
  onCancel: () => void
  loading: boolean
  error: string
  label: string
}) {
  return (
    <div className="border border-brand-300 rounded-xl p-5 bg-brand-50/30">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-gray-700">{label}</p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onCancel} className="text-xs px-3 py-1.5">
            Annuler
          </Button>
          <Button loading={loading} onClick={onSave} className="text-xs px-3 py-1.5">
            Sauvegarder
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input label="Poste / Titre" value={form.title} onChange={onChange("title")} />
        <Input label="Entreprise" value={form.company} onChange={onChange("company")} />
        <Input label="Date de début" placeholder="ex: Jan 2022" value={form.startDate} onChange={onChange("startDate")} />
        <Input label="Date de fin" placeholder="ex: Dec 2023 (vide = poste actuel)" value={form.endDate} onChange={onChange("endDate")} />
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Contexte</label>
          <textarea
            rows={2}
            value={form.context}
            onChange={onChange("context")}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white
              focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Réalisations</label>
          <textarea
            rows={3}
            value={form.achievements}
            onChange={onChange("achievements")}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white
              focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
          />
        </div>
        <div className="col-span-2">
          <Input
            label="Technologies (séparées par des virgules)"
            placeholder="ex: React, Node.js, PostgreSQL"
            value={form.technologies}
            onChange={onChange("technologies")}
          />
        </div>
      </div>

      {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
    </div>
  )
}

export function ExperienceList({ experiences, cvId }: ExperienceListProps) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<ExpForm>(emptyForm())
  const [adding, setAdding] = useState(false)
  const [addForm, setAddForm] = useState<ExpForm>(emptyForm())
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState("")

  const setEdit = (field: keyof ExpForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setEditForm((f) => ({ ...f, [field]: e.target.value }))

  const setAdd = (field: keyof ExpForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setAddForm((f) => ({ ...f, [field]: e.target.value }))

  const startEdit = (exp: Experience) => {
    setEditingId(exp.id)
    setEditForm(expToForm(exp))
    setError("")
  }

  const saveEdit = async () => {
    if (!editingId) return
    setLoadingId(editingId)
    setError("")
    const res = await fetch(`/api/cv/${cvId}/experiences/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    })
    setLoadingId(null)
    if (res.ok) {
      setEditingId(null)
      router.refresh()
    } else {
      setError("Erreur lors de la sauvegarde")
    }
  }

  const deleteExp = async (expId: string) => {
    if (!confirm("Supprimer cette expérience ?")) return
    setLoadingId(expId)
    await fetch(`/api/cv/${cvId}/experiences/${expId}`, { method: "DELETE" })
    setLoadingId(null)
    router.refresh()
  }

  const saveAdd = async () => {
    setLoadingId("new")
    setError("")
    const res = await fetch(`/api/cv/${cvId}/experiences`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addForm),
    })
    setLoadingId(null)
    if (res.ok) {
      setAdding(false)
      setAddForm(emptyForm())
      router.refresh()
    } else {
      setError("Erreur lors de l'ajout")
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-700">
          Expériences{" "}
          <span className="text-gray-400 font-normal">({experiences.length})</span>
        </h2>
        {!adding && (
          <button
            onClick={() => { setAdding(true); setEditingId(null); setError("") }}
            className="text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors"
          >
            + Ajouter
          </button>
        )}
      </div>

      <div className="space-y-4">
        {experiences.length === 0 && !adding && (
          <p className="text-sm text-gray-400">Aucune expérience extraite.</p>
        )}

        {experiences.map((exp) =>
          editingId === exp.id ? (
            <ExperienceForm
              key={exp.id}
              form={editForm}
              onChange={setEdit}
              onSave={saveEdit}
              onCancel={() => { setEditingId(null); setError("") }}
              loading={loadingId === exp.id}
              error={error}
              label="Modifier l'expérience"
            />
          ) : (
            <div key={exp.id} className="border-l-2 border-brand-200 pl-4 group">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{exp.title || "Sans titre"}</p>
                  <p className="text-sm text-brand-600">{exp.company}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <p className="text-xs text-gray-500 whitespace-nowrap">
                    {exp.startDate}{exp.endDate ? ` — ${exp.endDate}` : ""}
                  </p>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEdit(exp)}
                      disabled={!!loadingId}
                      className="text-xs text-gray-400 hover:text-brand-600 transition-colors px-1 py-0.5"
                      title="Modifier"
                    >
                      Éditer
                    </button>
                    <button
                      onClick={() => deleteExp(exp.id)}
                      disabled={loadingId === exp.id}
                      className="text-xs text-gray-400 hover:text-red-500 transition-colors px-1 py-0.5"
                      title="Supprimer"
                    >
                      {loadingId === exp.id ? "…" : "Supprimer"}
                    </button>
                  </div>
                </div>
              </div>

              {exp.context && (
                <div className="mt-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Contexte</p>
                  <p className="text-xs text-gray-600 leading-relaxed">{exp.context}</p>
                </div>
              )}
              {exp.achievements && (
                <div className="mt-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Réalisations</p>
                  <p className="text-xs text-gray-600 leading-relaxed">{exp.achievements}</p>
                </div>
              )}
              {exp.technologies && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {exp.technologies.split(",").map((tech) => (
                    <span
                      key={tech.trim()}
                      className="inline-flex px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-md"
                    >
                      {tech.trim()}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        )}

        {adding && (
          <ExperienceForm
            form={addForm}
            onChange={setAdd}
            onSave={saveAdd}
            onCancel={() => { setAdding(false); setError("") }}
            loading={loadingId === "new"}
            error={error}
            label="Nouvelle expérience"
          />
        )}
      </div>
    </div>
  )
}
