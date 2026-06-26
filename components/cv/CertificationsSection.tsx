"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Certification } from "@prisma/client"

type Form = { name: string; issuer: string; issueDate: string; expirationDate: string; credentialUrl: string }
const empty = (): Form => ({ name: "", issuer: "", issueDate: "", expirationDate: "", credentialUrl: "" })
const fromCert = (c: Certification): Form => ({
  name: c.name, issuer: c.issuer ?? "", issueDate: c.issueDate ?? "",
  expirationDate: c.expirationDate ?? "", credentialUrl: c.credentialUrl ?? "",
})

export function CertificationsSection({ certifications, cvId }: { certifications: Certification[]; cvId: string }) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Form>(empty())
  const [adding, setAdding] = useState(false)
  const [addForm, setAddForm] = useState<Form>(empty())
  const [loading, setLoading] = useState(false)

  const setF = (setter: React.Dispatch<React.SetStateAction<Form>>, field: keyof Form) =>
    (e: React.ChangeEvent<HTMLInputElement>) => setter((f) => ({ ...f, [field]: e.target.value }))

  const save = async (method: string, url: string, data: Form) => {
    setLoading(true)
    await fetch(url, {
      method, headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        issuer: data.issuer || null, issueDate: data.issueDate || null,
        expirationDate: data.expirationDate || null, credentialUrl: data.credentialUrl || null,
      }),
    })
    setLoading(false)
    setEditingId(null)
    setAdding(false)
    setAddForm(empty())
    router.refresh()
  }

  const del = async (id: string) => {
    if (!confirm("Supprimer cette certification ?")) return
    await fetch(`/api/cv/${cvId}/certifications/${id}`, { method: "DELETE" })
    router.refresh()
  }

  const CertForm = ({ form, setForm, onSave, onCancel, label }: {
    form: Form; setForm: React.Dispatch<React.SetStateAction<Form>>;
    onSave: () => void; onCancel: () => void; label: string
  }) => (
    <div className="border border-brand-300 rounded-xl p-4 bg-brand-50/30">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-gray-700">{label}</p>
        <div className="flex gap-2">
          <button onClick={onCancel}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            Annuler
          </button>
          <button onClick={onSave} disabled={loading}
            className="px-3 py-1.5 text-xs font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50">
            {loading ? "…" : "Sauvegarder"}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {(["name", "issuer", "issueDate", "expirationDate", "credentialUrl"] as (keyof Form)[]).map((field) => (
          <div key={field} className={field === "name" || field === "credentialUrl" ? "col-span-2" : ""}>
            <label className="block text-xs font-medium text-gray-600 mb-1 capitalize">
              {field === "name" ? "Nom de la certification" : field === "issuer" ? "Organisme émetteur" : field === "issueDate" ? "Date d'obtention" : field === "expirationDate" ? "Date d'expiration" : "URL (credential)"}
            </label>
            <input value={form[field]} onChange={setF(setForm, field)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder={field === "issueDate" || field === "expirationDate" ? "ex: Jan 2024" : ""} />
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-700">
          Certifications <span className="text-gray-400 font-normal">({certifications.length})</span>
        </h2>
        {!adding && (
          <button onClick={() => { setAdding(true); setEditingId(null) }}
            className="text-xs text-brand-600 hover:text-brand-700 font-medium">+ Ajouter</button>
        )}
      </div>

      <div className="space-y-4">
        {certifications.length === 0 && !adding && (
          <p className="text-sm text-gray-400">Aucune certification extraite.</p>
        )}

        {certifications.map((cert) => editingId === cert.id ? (
          <CertForm key={cert.id} form={editForm} setForm={setEditForm}
            onSave={() => save("PATCH", `/api/cv/${cvId}/certifications/${cert.id}`, editForm)}
            onCancel={() => setEditingId(null)} label="Modifier la certification" />
        ) : (
          <div key={cert.id} className="flex items-start justify-between group">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{cert.name}</p>
                {cert.issuer && <p className="text-xs text-brand-600">{cert.issuer}</p>}
                <p className="text-xs text-gray-400 mt-0.5">
                  {cert.issueDate}{cert.expirationDate ? ` → ${cert.expirationDate}` : ""}
                </p>
                {cert.credentialUrl && (
                  <a href={cert.credentialUrl} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:underline">Voir le credential</a>
                )}
              </div>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity mt-1">
              <button onClick={() => { setEditingId(cert.id); setEditForm(fromCert(cert)) }}
                className="text-xs text-gray-400 hover:text-brand-600 px-1">Éditer</button>
              <button onClick={() => del(cert.id)}
                className="text-xs text-gray-400 hover:text-red-500 px-1">Supprimer</button>
            </div>
          </div>
        ))}

        {adding && (
          <CertForm form={addForm} setForm={setAddForm}
            onSave={() => save("POST", `/api/cv/${cvId}/certifications`, addForm)}
            onCancel={() => { setAdding(false); setAddForm(empty()) }}
            label="Nouvelle certification" />
        )}
      </div>
    </div>
  )
}
