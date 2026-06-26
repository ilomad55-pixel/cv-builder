"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"

export function LogoUpload({ currentUrl }: { currentUrl: string | null }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(currentUrl)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const upload = async (file: File) => {
    setLoading(true)
    setError("")
    const form = new FormData()
    form.append("logo", file)

    const res = await fetch("/api/settings/logo", { method: "POST", body: form })
    const data = await res.json()

    setLoading(false)
    if (!res.ok) {
      setError(data.error ?? "Erreur lors de l'upload")
      return
    }

    setPreview(data.logoUrl)
    router.refresh()
  }

  const remove = async () => {
    setLoading(true)
    await fetch("/api/settings/logo", { method: "DELETE" })
    setPreview(null)
    setLoading(false)
    router.refresh()
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setPreview(reader.result as string)
    reader.readAsDataURL(file)
    upload(file)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <h2 className="text-sm font-semibold text-gray-700 mb-1">Logo entreprise</h2>
      <p className="text-xs text-gray-400 mb-4">Affiché dans l'en-tête des CVs générés. PNG, JPG, WEBP ou SVG · max 2 Mo.</p>

      <div className="flex items-center gap-4">
        {/* Zone aperçu */}
        <div
          onClick={() => !loading && inputRef.current?.click()}
          className={`relative w-36 h-16 border-2 border-dashed rounded-xl flex items-center justify-center overflow-hidden cursor-pointer transition-colors
            ${preview ? "border-gray-200 bg-gray-50" : "border-gray-300 bg-gray-50 hover:border-brand-400"}`}>
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70">
              <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {preview && !loading ? (
            <Image src={preview} alt="Logo" fill className="object-contain p-1" unoptimized />
          ) : !loading ? (
            <span className="text-xs text-gray-400">Cliquer pour choisir</span>
          ) : null}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            onClick={() => inputRef.current?.click()}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-medium text-brand-600 border border-brand-300 rounded-lg hover:bg-brand-50 transition-colors disabled:opacity-50">
            {preview ? "Changer le logo" : "Importer un logo"}
          </button>
          {preview && (
            <button
              onClick={remove}
              disabled={loading}
              className="px-3 py-1.5 text-xs font-medium text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50">
              Supprimer
            </button>
          )}
        </div>
      </div>

      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden" onChange={handleFile} />
    </div>
  )
}
