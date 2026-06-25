"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { StatusBadge } from "@/components/cv/StatusBadge"
import { CvStatus } from "@prisma/client"

interface CvRow {
  id: string
  originalFileName: string
  status: CvStatus
  templateId: number | null
  createdAt: Date
  contact?: { firstName: string; lastName: string } | null
}

function IconEye() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  )
}

function IconPencil() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2a2 2 0 01.586-1.414z" />
    </svg>
  )
}

function IconTrash() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}

function IconDownload() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  )
}

function RenameInput({ initial, onSave, onCancel }: { initial: string; onSave: (name: string) => void; onCancel: () => void }) {
  const [value, setValue] = useState(initial)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => { ref.current?.focus(); ref.current?.select() }, [])

  const submit = () => {
    const trimmed = value.trim()
    if (trimmed && trimmed !== initial) onSave(trimmed)
    else onCancel()
  }

  return (
    <input
      ref={ref}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={submit}
      onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") onCancel() }}
      className="w-full px-2 py-0.5 text-sm border border-brand-400 rounded focus:outline-none focus:ring-2 focus:ring-brand-500"
    />
  )
}

export function CvTable({ cvs }: { cvs: CvRow[] }) {
  const router = useRouter()
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const handleRename = async (id: string, name: string) => {
    setRenamingId(null)
    await fetch(`/api/cv/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ originalFileName: name }),
    })
    router.refresh()
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Supprimer « ${name} » ? Cette action est irréversible.`)) return
    setDeletingId(id)
    await fetch(`/api/cv/${id}`, { method: "DELETE" })
    setDeletingId(null)
    router.refresh()
  }

  const handleDownload = async (cv: CvRow) => {
    setDownloadingId(cv.id)
    const res = await fetch(`/api/cv/${cv.id}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId: cv.templateId ?? 1 }),
    })
    if (res.ok) {
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ?? "cv.docx"
      a.click()
      URL.revokeObjectURL(url)
    }
    setDownloadingId(null)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Candidat</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fichier</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Statut</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
            <th className="px-4 py-3 w-36" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {cvs.map((cv) => {
            const candidateName = [cv.contact?.firstName, cv.contact?.lastName].filter(Boolean).join(" ")
            const isGenerated = cv.status === "GENERATED"

            return (
              <tr
                key={cv.id}
                className={`hover:bg-gray-50 transition-colors ${deletingId === cv.id ? "opacity-40" : ""}`}
              >
                <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                  {candidateName || <span className="text-gray-300 italic text-xs">Non parsé</span>}
                </td>

                <td className="px-4 py-3 text-gray-500 max-w-xs">
                  {renamingId === cv.id ? (
                    <RenameInput
                      initial={cv.originalFileName}
                      onSave={(name) => handleRename(cv.id, name)}
                      onCancel={() => setRenamingId(null)}
                    />
                  ) : (
                    <span className="truncate block text-xs" title={cv.originalFileName}>
                      {cv.originalFileName}
                    </span>
                  )}
                </td>

                <td className="px-4 py-3">
                  <StatusBadge status={cv.status} />
                </td>

                <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                  {new Date(cv.createdAt).toLocaleDateString("fr-FR")}
                </td>

                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {isGenerated && (
                      <button
                        onClick={() => handleDownload(cv)}
                        disabled={downloadingId === cv.id}
                        className="p-1.5 rounded text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                        title="Télécharger le .docx"
                      >
                        {downloadingId === cv.id ? (
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        ) : (
                          <IconDownload />
                        )}
                      </button>
                    )}
                    <Link
                      href={`/cv/${cv.id}`}
                      className="p-1.5 rounded text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                      title="Ouvrir"
                    >
                      <IconEye />
                    </Link>
                    <button
                      onClick={() => setRenamingId(cv.id)}
                      disabled={!!deletingId}
                      className="p-1.5 rounded text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                      title="Renommer"
                    >
                      <IconPencil />
                    </button>
                    <button
                      onClick={() => handleDelete(cv.id, cv.originalFileName)}
                      disabled={deletingId === cv.id}
                      className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="Supprimer"
                    >
                      <IconTrash />
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
