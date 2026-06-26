"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Education } from "@prisma/client"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"

const LEVEL_LABELS: Record<string, string> = {
  baccalaureate: "Bac", bachelor: "Licence/Bachelor", master: "Master",
  engineer: "Ingénieur", phd: "Doctorat", bootcamp: "Bootcamp", other: "Autre",
}

type Form = { degree: string; fieldOfStudy: string; school: string; location: string; startYear: string; endYear: string; level: string; honors: string }
const empty = (): Form => ({ degree: "", fieldOfStudy: "", school: "", location: "", startYear: "", endYear: "", level: "", honors: "" })
const fromEdu = (e: Education): Form => ({
  degree: e.degree, fieldOfStudy: e.fieldOfStudy ?? "", school: e.school,
  location: e.location ?? "", startYear: e.startYear ?? "", endYear: e.endYear ?? "",
  level: e.level ?? "", honors: e.honors ?? "",
})

export function EducationSection({ educations, cvId }: { educations: Education[]; cvId: string }) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Form>(empty())
  const [adding, setAdding] = useState(false)
  const [addForm, setAddForm] = useState<Form>(empty())
  const [loading, setLoading] = useState(false)

  const setF = (setter: React.Dispatch<React.SetStateAction<Form>>, field: keyof Form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setter((f) => ({ ...f, [field]: e.target.value }))

  const save = async (method: string, url: string, data: Form) => {
    setLoading(true)
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
    setLoading(false)
    setEditingId(null)
    setAdding(false)
    setAddForm(empty())
    router.refresh()
  }

  const del = async (id: string) => {
    if (!confirm("Supprimer cette formation ?")) return
    await fetch(`/api/cv/${cvId}/educations/${id}`, { method: "DELETE" })
    router.refresh()
  }

  const EduForm = ({ form, setForm, onSave, onCancel, label }: {
    form: Form; setForm: React.Dispatch<React.SetStateAction<Form>>;
    onSave: () => void; onCancel: () => void; label: string
  }) => (
    <div className="border border-brand-300 rounded-xl p-4 bg-brand-50/30">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-gray-700">{label}</p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onCancel} className="text-xs px-3 py-1.5">Annuler</Button>
          <Button loading={loading} onClick={onSave} className="text-xs px-3 py-1.5">Sauvegarder</Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Diplôme / Titre" value={form.degree} onChange={setF(setForm, "degree")} />
        <Input label="Spécialité" value={form.fieldOfStudy} onChange={setF(setForm, "fieldOfStudy")} />
        <Input label="Établissement" value={form.school} onChange={setF(setForm, "school")} />
        <Input label="Lieu" placeholder="Ville" value={form.location} onChange={setF(setForm, "location")} />
        <Input label="Année début" placeholder="ex: 2018" value={form.startYear} onChange={setF(setForm, "startYear")} />
        <Input label="Année fin" placeholder="ex: 2021" value={form.endYear} onChange={setF(setForm, "endYear")} />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Niveau</label>
          <select value={form.level} onChange={setF(setForm, "level")}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
            <option value="">Non précisé</option>
            {Object.entries(LEVEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <Input label="Mention" placeholder="ex: Mention Bien" value={form.honors} onChange={setF(setForm, "honors")} />
      </div>
    </div>
  )

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-700">
          Formation <span className="text-gray-400 font-normal">({educations.length})</span>
        </h2>
        {!adding && (
          <button onClick={() => { setAdding(true); setEditingId(null) }}
            className="text-xs text-brand-600 hover:text-brand-700 font-medium">+ Ajouter</button>
        )}
      </div>

      <div className="space-y-4">
        {educations.length === 0 && !adding && <p className="text-sm text-gray-400">Aucune formation extraite.</p>}

        {educations.map((edu) => editingId === edu.id ? (
          <EduForm key={edu.id} form={editForm} setForm={setEditForm}
            onSave={() => save("PATCH", `/api/cv/${cvId}/educations/${edu.id}`, editForm)}
            onCancel={() => setEditingId(null)} label="Modifier la formation" />
        ) : (
          <div key={edu.id} className="border-l-2 border-brand-200 pl-4 group">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-gray-900 text-sm">
                  {edu.degree}{edu.fieldOfStudy ? ` — ${edu.fieldOfStudy}` : ""}
                </p>
                <p className="text-sm text-brand-600">{edu.school}{edu.location ? `, ${edu.location}` : ""}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {edu.endYear || edu.startYear ? [edu.startYear, edu.endYear].filter(Boolean).join(" → ") : ""}
                  {edu.honors ? ` · ${edu.honors}` : ""}
                  {edu.level ? ` · ${LEVEL_LABELS[edu.level] ?? edu.level}` : ""}
                </p>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setEditingId(edu.id); setEditForm(fromEdu(edu)) }}
                  className="text-xs text-gray-400 hover:text-brand-600 px-1">Éditer</button>
                <button onClick={() => del(edu.id)}
                  className="text-xs text-gray-400 hover:text-red-500 px-1">Supprimer</button>
              </div>
            </div>
          </div>
        ))}

        {adding && (
          <EduForm form={addForm} setForm={setAddForm}
            onSave={() => save("POST", `/api/cv/${cvId}/educations`, addForm)}
            onCancel={() => { setAdding(false); setAddForm(empty()) }}
            label="Nouvelle formation" />
        )}
      </div>
    </div>
  )
}
