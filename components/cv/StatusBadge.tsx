import { CvStatus } from "@prisma/client"

const CONFIG: Record<CvStatus, { label: string; color: string }> = {
  PENDING: { label: "En attente", color: "bg-yellow-100 text-yellow-700" },
  TEXT_EXTRACTED: { label: "Texte extrait", color: "bg-blue-100 text-blue-700" },
  PARSED: { label: "Parsé", color: "bg-indigo-100 text-indigo-700" },
  GENERATED: { label: "Généré", color: "bg-green-100 text-green-700" },
}

export function StatusBadge({ status }: { status: CvStatus }) {
  const { label, color } = CONFIG[status] ?? CONFIG.PENDING
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {label}
    </span>
  )
}
