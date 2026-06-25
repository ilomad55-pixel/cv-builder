import { RegisterForm } from "@/components/forms/RegisterForm"
import Link from "next/link"

export default function RegisterPage() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Créer un compte entreprise</h2>
      <RegisterForm />
      <p className="mt-4 text-center text-sm text-gray-500">
        Déjà un compte ?{" "}
        <Link href="/login" className="text-brand-600 hover:underline font-medium">
          Se connecter
        </Link>
      </p>
    </div>
  )
}
