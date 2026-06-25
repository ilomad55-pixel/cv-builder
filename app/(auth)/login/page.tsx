import { LoginForm } from "@/components/forms/LoginForm"
import Link from "next/link"

export default function LoginPage() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Connexion</h2>
      <LoginForm />
      <p className="mt-4 text-center text-sm text-gray-500">
        Pas encore de compte ?{" "}
        <Link href="/register" className="text-brand-600 hover:underline font-medium">
          Créer un compte
        </Link>
      </p>
    </div>
  )
}
