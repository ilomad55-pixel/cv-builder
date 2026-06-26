"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Contact } from "@prisma/client"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"

const SENIORITY_LABELS: Record<string, string> = {
  junior: "Junior",
  confirmed: "Confirmé",
  senior: "Senior",
  lead: "Lead",
  expert: "Expert",
}

const SENIORITY_COLORS: Record<string, string> = {
  junior: "bg-gray-100 text-gray-600",
  confirmed: "bg-blue-100 text-blue-700",
  senior: "bg-indigo-100 text-indigo-700",
  lead: "bg-violet-100 text-violet-700",
  expert: "bg-amber-100 text-amber-700",
}

type Form = {
  firstName: string
  lastName: string
  headline: string
  seniority: string
  yearsOfExperience: string
  email: string
  phone: string
  address: string
  linkedin: string
  github: string
  profileText: string
}

export function ContactCard({ contact, cvId }: { contact: Contact; cvId: string }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState<Form>({
    firstName: contact.firstName ?? "",
    lastName: contact.lastName ?? "",
    headline: contact.headline ?? "",
    seniority: contact.seniority ?? "",
    yearsOfExperience: contact.yearsOfExperience ?? "",
    email: contact.email ?? "",
    phone: contact.phone ?? "",
    address: contact.address ?? "",
    linkedin: contact.linkedin ?? "",
    github: contact.github ?? "",
    profileText: contact.profileText ?? "",
  })

  const set = (field: keyof Form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }))

  const save = async () => {
    setLoading(true)
    setError("")
    const res = await fetch(`/api/cv/${cvId}/contact`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        headline: form.headline || null,
        seniority: form.seniority || null,
        yearsOfExperience: form.yearsOfExperience || null,
        linkedin: form.linkedin || null,
        github: form.github || null,
      }),
    })
    setLoading(false)
    if (res.ok) {
      setEditing(false)
      router.refresh()
    } else {
      setError("Erreur lors de la sauvegarde")
    }
  }

  if (editing) {
    return (
      <div className="bg-white rounded-xl border border-brand-300 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-gray-700">Contact & Identité</h2>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => { setEditing(false); setError("") }} className="text-xs px-3 py-1.5">
              Annuler
            </Button>
            <Button loading={loading} onClick={save} className="text-xs px-3 py-1.5">
              Sauvegarder
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input label="Prénom" value={form.firstName} onChange={set("firstName")} />
          <Input label="Nom" value={form.lastName} onChange={set("lastName")} />
          <div className="col-span-2">
            <Input label="Titre professionnel" placeholder="ex: Développeur Full-Stack Senior" value={form.headline} onChange={set("headline")} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Séniorité</label>
            <select value={form.seniority} onChange={set("seniority")}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
              <option value="">Non précisé</option>
              {Object.entries(SENIORITY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <Input label="Années d'expérience" placeholder="ex: 7" value={form.yearsOfExperience} onChange={set("yearsOfExperience")} />
          <Input label="Email" type="email" value={form.email} onChange={set("email")} />
          <Input label="Téléphone" value={form.phone} onChange={set("phone")} />
          <div className="col-span-2">
            <Input label="Adresse / Localisation" value={form.address} onChange={set("address")} />
          </div>
          <Input label="LinkedIn (URL)" placeholder="https://linkedin.com/in/..." value={form.linkedin} onChange={set("linkedin")} />
          <Input label="GitHub (URL)" placeholder="https://github.com/..." value={form.github} onChange={set("github")} />
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Profil / Résumé</label>
            <textarea
              rows={4}
              value={form.profileText}
              onChange={set("profileText")}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white
                focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
            />
          </div>
        </div>

        {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
      </div>
    )
  }

  const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(" ")

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-700">Contact & Identité</h2>
        <button onClick={() => setEditing(true)}
          className="text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors">
          Éditer
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            {fullName && <p className="text-lg font-bold text-gray-900">{fullName}</p>}
            {contact.headline && <p className="text-sm text-brand-600 mt-0.5">{contact.headline}</p>}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {contact.seniority && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${SENIORITY_COLORS[contact.seniority] ?? "bg-gray-100 text-gray-600"}`}>
                {SENIORITY_LABELS[contact.seniority] ?? contact.seniority}
              </span>
            )}
            {contact.yearsOfExperience && (
              <span className="text-xs text-gray-400">{contact.yearsOfExperience} ans d'exp.</span>
            )}
          </div>
        </div>

        {contact.profileText && (
          <div className="pt-1 pb-2 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Profil</p>
            <p className="text-sm text-gray-700 leading-relaxed">{contact.profileText}</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-1.5 text-sm">
          {contact.email && (
            <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-gray-600 hover:text-brand-600 transition-colors">
              <span className="text-gray-400 w-4 text-center">✉</span>
              {contact.email}
            </a>
          )}
          {contact.phone && (
            <div className="flex items-center gap-2 text-gray-600">
              <span className="text-gray-400 w-4 text-center">☎</span>
              {contact.phone}
            </div>
          )}
          {contact.address && (
            <div className="flex items-center gap-2 text-gray-600">
              <span className="text-gray-400 w-4 text-center">⌂</span>
              {contact.address}
            </div>
          )}
          {contact.linkedin && (
            <a href={contact.linkedin} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-blue-600 hover:underline">
              <span className="text-gray-400 w-4 text-center font-bold text-xs">in</span>
              {contact.linkedin.replace("https://", "").replace("http://", "")}
            </a>
          )}
          {contact.github && (
            <a href={contact.github} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-gray-700 hover:text-gray-900">
              <span className="text-gray-400 w-4 text-center text-xs">gh</span>
              {contact.github.replace("https://", "").replace("http://", "")}
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
