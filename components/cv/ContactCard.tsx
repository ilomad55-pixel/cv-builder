"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Contact } from "@prisma/client"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"

interface ContactCardProps {
  contact: Contact
  cvId: string
}

type Form = {
  firstName: string
  lastName: string
  email: string
  phone: string
  address: string
  profileText: string
}

export function ContactCard({ contact, cvId }: ContactCardProps) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState<Form>({
    firstName: contact.firstName ?? "",
    lastName: contact.lastName ?? "",
    email: contact.email ?? "",
    phone: contact.phone ?? "",
    address: contact.address ?? "",
    profileText: contact.profileText ?? "",
  })

  const set = (field: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  const save = async () => {
    setLoading(true)
    setError("")
    const res = await fetch(`/api/cv/${cvId}/contact`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
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
          <h2 className="text-sm font-semibold text-gray-700">Contact</h2>
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
          <Input label="Email" type="email" value={form.email} onChange={set("email")} />
          <Input label="Téléphone" value={form.phone} onChange={set("phone")} />
          <div className="col-span-2">
            <Input label="Adresse" value={form.address} onChange={set("address")} />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Profil</label>
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
        <h2 className="text-sm font-semibold text-gray-700">Contact</h2>
        <button
          onClick={() => setEditing(true)}
          className="text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors"
        >
          Éditer
        </button>
      </div>

      <div className="space-y-3">
        {fullName && <p className="text-lg font-bold text-gray-900">{fullName}</p>}

        {contact.profileText && (
          <div className="pt-1 pb-2 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Profil</p>
            <p className="text-sm text-gray-700 leading-relaxed">{contact.profileText}</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-2 text-sm">
          {contact.email && (
            <div className="flex items-center gap-2 text-gray-600">
              <span className="text-gray-400">✉</span>
              <a href={`mailto:${contact.email}`} className="hover:text-brand-600 transition-colors">
                {contact.email}
              </a>
            </div>
          )}
          {contact.phone && (
            <div className="flex items-center gap-2 text-gray-600">
              <span className="text-gray-400">☎</span>
              <span>{contact.phone}</span>
            </div>
          )}
          {contact.address && (
            <div className="flex items-center gap-2 text-gray-600">
              <span className="text-gray-400">⌂</span>
              <span>{contact.address}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
