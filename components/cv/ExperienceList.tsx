"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Experience } from "@prisma/client"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"

type ExpForm = {
  title: string
  company: string
  client: string
  startDate: string
  endDate: string
  isCurrent: boolean
  context: string
  achievements: string
  technologies: string
  methods: string
}

const emptyForm = (): ExpForm => ({
  title: "", company: "", client: "", startDate: "", endDate: "",
  isCurrent: false, context: "", achievements: "", technologies: "", methods: "",
})

function expToForm(exp: Experience): ExpForm {
  return {
    title: exp.title ?? "",
    company: exp.company ?? "",
    client: exp.client ?? "",
    startDate: exp.startDate ?? "",
    endDate: exp.endDate ?? "",
    isCurrent: exp.isCurrent ?? false,
    context: exp.context ?? "",
    achievements: exp.achievements ?? "",
    technologies: exp.technologies ?? "",
    methods: exp.methods ?? "",
  }
}

function ExperienceForm({ form, onChange, onCheck, onSave, onCancel, loading, error, label }: {
  form: ExpForm
  onChange: (field: keyof ExpForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  onCheck: (field: keyof ExpForm) => (e: React.ChangeEvent<HTMLInputElement>) => void
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
          <Button variant="secondary" onClick={onCancel} className="text-xs px-3 py-1.5">Annuler</Button>
          <Button loading={loading} onClick={onSave} className="text-xs px-3 py-1.5">Sauvegarder</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input label="Poste / Titre" value={form.title} onChange={onChange("title")} />
        <Input label="Entreprise (employeur)" value={form.company} onChange={onChange("company")} />
        <Input label="Client final (si ESN)" placeholder="ex: BNP Paribas" value={form.client} onChange={onChange("client")} />
        <div>
          <Input label="Date de début" placeholder="ex: Jan 2022" value={form.startDate} onChange={onChange("startDate")} />
        </div>
        <div>
          <Input label="Date de fin" placeholder="Vide si poste actuel" value={form.endDate} onChange={onChange("endDate")} disabled={form.isCurrent} />
        </div>
        <div className="flex items-center gap-2 pt-5">
          <input type="checkbox" id="isCurrent" checked={form.isCurrent} onChange={onCheck("isCurrent")}
            className="w-4 h-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500" />
          <label htmlFor="isCurrent" className="text-sm text-gray-700 cursor-pointer">Poste actuel</label>
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Contexte / Description</label>
          <textarea rows={2} value={form.context} onChange={onChange("context")}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Réalisations / Résultats</label>
          <textarea rows={3} value={form.achievements} onChange={onChange("achievements")}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
        </div>
        <div className="col-span-2">
          <Input label="Technologies (liste CSV)" placeholder="ex: React, Node.js, Docker" value={form.technologies} onChange={onChange("technologies")} />
        </div>
        <div className="col-span-2">
          <Input label="Méthodes (Agile, Scrum…)" placeholder="ex: Scrum, TDD, CI/CD" value={form.methods} onChange={onChange("methods")} />
        </div>
      </div>

      {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
    </div>
  )
}

export function ExperienceList({ experiences, cvId }: { experiences: Experience[]; cvId: string }) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<ExpForm>(emptyForm())
  const [adding, setAdding] = useState(false)
  const [addForm, setAddForm] = useState<ExpForm>(emptyForm())
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState("")

  const mkChange = (setter: React.Dispatch<React.SetStateAction<ExpForm>>, field: keyof ExpForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setter((f) => ({ ...f, [field]: e.target.value }))

  const mkCheck = (setter: React.Dispatch<React.SetStateAction<ExpForm>>, field: keyof ExpForm) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setter((f) => ({ ...f, [field]: e.target.checked }))

  const saveEdit = async () => {
    if (!editingId) return
    setLoadingId(editingId)
    setError("")
    const res = await fetch(`/api/cv/${cvId}/experiences/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...editForm,
        client: editForm.client || null,
        endDate: editForm.isCurrent ? null : (editForm.endDate || null),
        methods: editForm.methods || null,
      }),
    })
    setLoadingId(null)
    if (res.ok) { setEditingId(null); router.refresh() }
    else setError("Erreur lors de la sauvegarde")
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
      body: JSON.stringify({
        ...addForm,
        client: addForm.client || null,
        endDate: addForm.isCurrent ? null : (addForm.endDate || null),
        methods: addForm.methods || null,
      }),
    })
    setLoadingId(null)
    if (res.ok) { setAdding(false); setAddForm(emptyForm()); router.refresh() }
    else setError("Erreur lors de l'ajout")
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-700">
          Expériences <span className="text-gray-400 font-normal">({experiences.length})</span>
        </h2>
        {!adding && (
          <button onClick={() => { setAdding(true); setEditingId(null); setError("") }}
            className="text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors">
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
            <ExperienceForm key={exp.id} form={editForm}
              onChange={(f) => mkChange(setEditForm, f)}
              onCheck={(f) => mkCheck(setEditForm, f)}
              onSave={saveEdit} onCancel={() => { setEditingId(null); setError("") }}
              loading={loadingId === exp.id} error={error} label="Modifier l'expérience" />
          ) : (
            <div key={exp.id} className="border-l-2 border-brand-200 pl-4 group">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{exp.title || "Sans titre"}</p>
                  <p className="text-sm text-brand-600">
                    {exp.company}
                    {exp.client ? <span className="text-gray-500 text-xs"> · Client : {exp.client}</span> : null}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <p className="text-xs text-gray-500 whitespace-nowrap">
                    {exp.startDate}
                    {exp.isCurrent ? " — Présent" : exp.endDate ? ` — ${exp.endDate}` : ""}
                    {exp.isCurrent && <span className="ml-1 text-green-500">●</span>}
                  </p>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditingId(exp.id); setEditForm(expToForm(exp)) }}
                      disabled={!!loadingId}
                      className="text-xs text-gray-400 hover:text-brand-600 px-1">Éditer</button>
                    <button onClick={() => deleteExp(exp.id)} disabled={loadingId === exp.id}
                      className="text-xs text-gray-400 hover:text-red-500 px-1">
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
              {(exp.technologies || exp.methods) && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {exp.technologies?.split(",").map((t) => (
                    <span key={t.trim()} className="inline-flex px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-md">{t.trim()}</span>
                  ))}
                  {exp.methods?.split(",").map((m) => (
                    <span key={m.trim()} className="inline-flex px-2 py-0.5 bg-teal-50 text-teal-700 text-xs rounded-md">{m.trim()}</span>
                  ))}
                </div>
              )}
            </div>
          )
        )}

        {adding && (
          <ExperienceForm form={addForm}
            onChange={(f) => mkChange(setAddForm, f)}
            onCheck={(f) => mkCheck(setAddForm, f)}
            onSave={saveAdd} onCancel={() => { setAdding(false); setError("") }}
            loading={loadingId === "new"} error={error} label="Nouvelle expérience" />
        )}
      </div>
    </div>
  )
}
