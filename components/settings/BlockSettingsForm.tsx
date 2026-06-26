"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

// ─── Types ────────────────────────────────────────────────────────────────────
export type HeaderOptions = {
  showPhoto: boolean
  showLogo: boolean
  showHeadline: boolean
  layout: "photo-left" | "photo-right"
}

export type SectionBlock = {
  color: string        // hex WITH #
  font: string
  bgColor: string      // hex WITH # — background du titre
  titleSize: number    // pt * 2 (half-points pour docx)
}

export type BlockSettings = {
  header: HeaderOptions
  sections: Record<string, Partial<SectionBlock>>
}

const FONTS = ["Arial", "Calibri", "Georgia", "Times New Roman", "Helvetica", "Roboto", "Open Sans", "Lato"]

const SECTION_LABELS: Record<string, string> = {
  profile: "Profil",
  experiences: "Expériences professionnelles",
  skills: "Compétences techniques",
  methodologies: "Méthodes & outils",
  soft_skills: "Soft skills",
  education: "Formation",
  languages: "Langues",
  certifications: "Certifications",
}

const DEFAULT_SECTION_BLOCK: SectionBlock = {
  color: "#3b5bdb",
  font: "Arial",
  bgColor: "#ffffff",
  titleSize: 22,
}

function buildDefault(primaryColor: string, fontFamily: string): BlockSettings {
  return {
    header: { showPhoto: true, showLogo: true, showHeadline: true, layout: "photo-left" },
    sections: Object.fromEntries(
      Object.keys(SECTION_LABELS).map((id) => [id, { color: primaryColor, font: fontFamily, bgColor: "#ffffff", titleSize: 22 }])
    ),
  }
}

function merge(saved: BlockSettings | null, primaryColor: string, fontFamily: string): BlockSettings {
  const def = buildDefault(primaryColor, fontFamily)
  if (!saved) return def
  return {
    header: { ...def.header, ...(saved.header ?? {}) },
    sections: Object.fromEntries(
      Object.keys(SECTION_LABELS).map((id) => [id, { ...def.sections[id], ...(saved.sections?.[id] ?? {}) }])
    ),
  }
}

// ─── Sous-composants ──────────────────────────────────────────────────────────
function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border border-gray-200" />
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
          className="w-24 px-2 py-1 text-xs border border-gray-300 rounded-lg font-mono" />
      </div>
    </div>
  )
}

function FontSelect({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
        {FONTS.map((f) => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
      </select>
    </div>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <div onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${checked ? "bg-brand-600" : "bg-gray-300"}`}>
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
      </div>
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  )
}

function AccordionSection({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden mb-2">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left">
        <span className="text-sm font-semibold text-gray-800">{title}</span>
        <span className="text-gray-400 text-xs">{open ? "▲" : "▼"}</span>
      </button>
      {open && <div className="px-4 py-4 bg-white">{children}</div>}
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────
export function BlockSettingsForm({
  initial,
  primaryColor,
  fontFamily,
}: {
  initial: BlockSettings | null
  primaryColor: string
  fontFamily: string
}) {
  const router = useRouter()
  const [settings, setSettings] = useState<BlockSettings>(() => merge(initial, primaryColor, fontFamily))
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const setHeader = (patch: Partial<HeaderOptions>) =>
    setSettings((s) => ({ ...s, header: { ...s.header, ...patch } }))

  const setSection = (id: string, patch: Partial<SectionBlock>) =>
    setSettings((s) => ({
      ...s,
      sections: { ...s.sections, [id]: { ...s.sections[id], ...patch } },
    }))

  const save = async () => {
    setLoading(true)
    setSaved(false)
    await fetch("/api/settings/blocks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blockSettings: settings }),
    })
    setLoading(false)
    setSaved(true)
    router.refresh()
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Configuration des blocs CV</h2>
          <p className="text-xs text-gray-500 mt-0.5">Personnalisez l'apparence de chaque bloc dans les CVs générés</p>
        </div>
        <button onClick={save} disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50">
          {loading ? "Enregistrement…" : saved ? "✓ Enregistré" : "Enregistrer"}
        </button>
      </div>

      {/* ── En-tête ──────────────────────────────────────────────────────── */}
      <AccordionSection title="🖼 En-tête (Photo · Logo · Nom · Titre)" defaultOpen>
        <div className="space-y-3">
          <Toggle label="Afficher la photo de l'employé" checked={settings.header.showPhoto} onChange={(v) => setHeader({ showPhoto: v })} />
          <Toggle label="Afficher le logo de l'entreprise" checked={settings.header.showLogo} onChange={(v) => setHeader({ showLogo: v })} />
          <Toggle label="Afficher le titre du poste (headline)" checked={settings.header.showHeadline} onChange={(v) => setHeader({ showHeadline: v })} />
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Position de la photo</label>
            <div className="flex gap-3">
              {(["photo-left", "photo-right"] as const).map((opt) => (
                <label key={opt} className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" name="layout" value={opt} checked={settings.header.layout === opt}
                    onChange={() => setHeader({ layout: opt })}
                    className="text-brand-600" />
                  <span className="text-sm text-gray-700">{opt === "photo-left" ? "Photo à gauche" : "Photo à droite"}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </AccordionSection>

      {/* ── Sections de contenu ───────────────────────────────────────────── */}
      {Object.entries(SECTION_LABELS).map(([id, label]) => {
        const s = settings.sections[id] ?? {}
        const color = s.color ?? primaryColor
        const font = s.font ?? fontFamily
        const bgColor = s.bgColor ?? "#ffffff"
        return (
          <AccordionSection key={id} title={`📄 ${label}`}>
            <div className="grid grid-cols-2 gap-4">
              <ColorInput label="Couleur du titre" value={color} onChange={(v) => setSection(id, { color: v })} />
              <ColorInput label="Fond du titre" value={bgColor} onChange={(v) => setSection(id, { bgColor: v })} />
              <div className="col-span-2">
                <FontSelect label="Police de caractères" value={font} onChange={(v) => setSection(id, { font: v })} />
              </div>
            </div>
            <div className="mt-3 p-2 rounded-lg border border-dashed border-gray-200">
              <p className="text-xs text-gray-400 mb-1">Aperçu titre :</p>
              <p style={{ color, fontFamily: font, backgroundColor: bgColor !== "#ffffff" ? bgColor : "transparent" }}
                className="font-bold text-sm px-1">{label.toUpperCase()}</p>
            </div>
          </AccordionSection>
        )
      })}
    </div>
  )
}
