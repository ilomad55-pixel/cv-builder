"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"

const FONTS = ["Arial", "Calibri", "Times New Roman", "Georgia"] as const

const PRIMARY_COLORS = [
  "#1a2b4a", "#1c3d5a", "#0f4c75", "#1a5276",
  "#1e3a5f", "#2c3e50", "#343a40", "#3b5bdb",
]
const SECONDARY_COLORS = [
  "#e67700", "#f59f00", "#e64980", "#d63031",
  "#00b894", "#0ca678", "#1971c2", "#862e9c",
]

interface Props {
  initial: {
    name: string
    primaryColor: string
    secondaryColor: string
    fontFamily: string
  }
}

export function BrandingForm({ initial }: Props) {
  const router = useRouter()
  const [form, setForm] = useState(initial)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const save = async () => {
    setLoading(true)
    setSaved(false)
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    setLoading(false)
    setSaved(true)
    router.refresh()
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="space-y-6">
      {/* Nom entreprise */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Entreprise</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l&apos;entreprise</label>
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Couleurs */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-5">Couleurs du template ILOMAD</h2>

        {/* Couleur principale */}
        <div className="mb-5">
          <p className="text-xs font-medium text-gray-600 mb-1">Couleur principale — en-tête, structure</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {PRIMARY_COLORS.map((color) => (
              <button key={color} onClick={() => setForm((f) => ({ ...f, primaryColor: color }))}
                className={`w-8 h-8 rounded-full border-2 transition-all ${form.primaryColor === color ? "border-gray-900 scale-110" : "border-transparent"}`}
                style={{ backgroundColor: color }} title={color} />
            ))}
          </div>
          <div className="flex items-center gap-3">
            <input type="color" value={form.primaryColor} onChange={(e) => setForm((f) => ({ ...f, primaryColor: e.target.value }))}
              className="h-9 w-16 rounded border border-gray-300 cursor-pointer p-0.5" />
            <span className="text-sm text-gray-600 font-mono">{form.primaryColor}</span>
            <span className="text-sm px-3 py-1 rounded-full text-white font-medium" style={{ backgroundColor: form.primaryColor }}>En-tête</span>
          </div>
        </div>

        {/* Couleur secondaire */}
        <div>
          <p className="text-xs font-medium text-gray-600 mb-1">Couleur secondaire — titres de sections, dates, accents</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {SECONDARY_COLORS.map((color) => (
              <button key={color} onClick={() => setForm((f) => ({ ...f, secondaryColor: color }))}
                className={`w-8 h-8 rounded-full border-2 transition-all ${form.secondaryColor === color ? "border-gray-900 scale-110" : "border-transparent"}`}
                style={{ backgroundColor: color }} title={color} />
            ))}
          </div>
          <div className="flex items-center gap-3">
            <input type="color" value={form.secondaryColor} onChange={(e) => setForm((f) => ({ ...f, secondaryColor: e.target.value }))}
              className="h-9 w-16 rounded border border-gray-300 cursor-pointer p-0.5" />
            <span className="text-sm text-gray-600 font-mono">{form.secondaryColor}</span>
            <span className="text-sm px-3 py-1 rounded-full text-white font-medium" style={{ backgroundColor: form.secondaryColor }}>Sections</span>
          </div>
        </div>

        {/* Mini aperçu 2 couleurs */}
        <div className="mt-4 rounded-lg overflow-hidden border border-gray-100">
          <div className="px-4 py-3 text-white text-sm font-bold" style={{ backgroundColor: form.primaryColor }}>
            Prénom NOM — <span style={{ color: form.secondaryColor }}>Titre du poste</span>
          </div>
          <div className="px-4 py-2 bg-white">
            <p className="text-xs font-bold mb-1" style={{ color: form.secondaryColor }}>PROFIL</p>
            <p className="text-xs text-gray-500">Lorem ipsum dolor sit amet, consectetur adipiscing elit...</p>
            <p className="text-xs font-bold mt-2 mb-0.5" style={{ color: form.secondaryColor }}>EXPÉRIENCES</p>
            <p className="text-xs font-semibold text-gray-800">Titre de l&apos;expérience</p>
            <p className="text-xs" style={{ color: form.primaryColor }}>Entreprise — <span style={{ color: form.secondaryColor }}>Jan 2022 - Déc 2024</span></p>
          </div>
        </div>
      </div>

      {/* Police */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Police de caractères</h2>
        <div className="grid grid-cols-2 gap-3">
          {FONTS.map((font) => (
            <button key={font} onClick={() => setForm((f) => ({ ...f, fontFamily: font }))}
              className={`px-4 py-3 rounded-lg border text-sm text-left transition-all ${form.fontFamily === font ? "border-brand-400 bg-brand-50 text-brand-700" : "border-gray-200 hover:border-gray-300 text-gray-700"}`}
              style={{ fontFamily: font }}>
              <span className="block text-base">{font}</span>
              <span className="block text-xs text-gray-400 mt-0.5" style={{ fontFamily: font }}>Aa Bb Cc — Lorem ipsum</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={save} loading={loading}>Sauvegarder</Button>
        {saved && <span className="text-sm text-green-600 font-medium">Modifications enregistrées ✓</span>}
      </div>
    </div>
  )
}
