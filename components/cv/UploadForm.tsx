"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"

const ACCEPTED = ".pdf,.doc,.docx"
const ACCEPTED_MIME = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]

export function UploadForm() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setError(null)
    setLoading(true)

    for (const file of Array.from(files)) {
      if (!ACCEPTED_MIME.includes(file.type)) {
        setError(`"${file.name}" : format non supporté (PDF ou Word uniquement)`)
        setLoading(false)
        return
      }

      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("/api/cv/upload", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Erreur lors de l'upload")
        setLoading(false)
        return
      }
    }

    setLoading(false)
    router.refresh()
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    handleFiles(e.target.files)
    // Reset input pour permettre le re-upload du même fichier
    e.target.value = ""
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        multiple
        onChange={handleChange}
        className="hidden"
      />

      <Button onClick={() => inputRef.current?.click()} loading={loading}>
        + Importer un CV
      </Button>

      {/* Zone drop invisible sur toute la page — alternative UX */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="hidden"
        aria-hidden
      />

      {error && (
        <p className="text-xs text-red-500 max-w-xs text-right">{error}</p>
      )}
    </div>
  )
}
