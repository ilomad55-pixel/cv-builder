"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"

const FONTS = ["Arial", "Calibri", "Times New Roman", "Georgia"] as const
const PRESET_COLORS = [
  "#3b5bdb", "#1971c2", "#0ca678", "#2f9e44",
  "#e67700", "#c2255c", "#862e9c", "#343a40",
]

interface Props {
  initial: {
    name: string
    primaryColor: string
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
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Couleur principale */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Couleur principale</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => setForm((f) => ({ ...f, primaryColor: color }))}
              className={`w-8 h-8 rounded-full border-2 transition-all ${
                form.primaryColor === color ? "border-gray-900 scale-110" : "border-transparent"
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={form.primaryColor}
            onChange={(e) => setForm((f) => ({ ...f, primaryColor: e.target.value }))}
            className="h-9 w-16 rounded border border-gray-300 cursor-pointer p-0.5"
          />
          <span className="text-sm text-gray-600 font-mono">{form.primaryColor}</span>
          <span
            className="text-sm px-3 py-1 rounded-full text-white font-medium"
            style={{ backgroundColor: form.primaryColor }}
          >
            Aperçu
          </span>
        </div>
      </div>

      {/* Police */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Police de caractères</h2>
        <div className="grid grid-cols-2 gap-3">
          {FONTS.map((font) => (
            <button
              key={font}
              onClick={() => setForm((f) => ({ ...f, fontFamily: font }))}
              className={`px-4 py-3 rounded-lg border text-sm text-left transition-all ${
                form.fontFamily === font
                  ? "border-brand-400 bg-brand-50 text-brand-700"
                  : "border-gray-200 hover:border-gray-300 text-gray-700"
              }`}
              style={{ fontFamily: font }}
            >
              <span className="block text-base">{font}</span>
              <span className="block text-xs text-gray-400 mt-0.5" style={{ fontFamily: font }}>
                Aa Bb Cc — Lorem ipsum
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Aperçu template */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Aperçu dans les CVs</h2>
        <div className="border border-gray-100 rounded-lg p-4 bg-gray-50">
          <p
            className="text-xl font-bold mb-1"
            style={{ color: form.primaryColor, fontFamily: form.fontFamily }}
          >
            Jean Dupont
          </p>
          <p className="text-xs text-gray-500 mb-3" style={{ fontFamily: form.fontFamily }}>
            jean.dupont@email.com  |  +33 6 12 34 56 78  |  Paris
          </p>
          <div
            className="h-0.5 mb-3"
            style={{ backgroundColor: form.primaryColor }}
          />
          <p
            className="text-xs font-bold mb-1"
            style={{ color: form.primaryColor, fontFamily: form.fontFamily }}
          >
            PROFIL
          </p>
          <p className="text-xs text-gray-600" style={{ fontFamily: form.fontFamily }}>
            Développeur passionné avec 5 ans d&apos;expérience en développement web...
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={save} loading={loading}>
          Sauvegarder
        </Button>
        {saved && <span className="text-sm text-green-600 font-medium">Modifications enregistrées ✓</span>}
      </div>
    </div>
  )
}
