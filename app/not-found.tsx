import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <p className="text-6xl font-bold text-brand-600 mb-4">404</p>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Page introuvable</h1>
        <p className="text-sm text-gray-500 mb-6">Cette page n&apos;existe pas ou a été déplacée.</p>
        <Link
          href="/dashboard"
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors"
        >
          Retour au dashboard
        </Link>
      </div>
    </div>
  )
}
