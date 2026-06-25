"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"

export function RegisterForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const password = formData.get("password") as string
    const confirm = formData.get("confirm") as string

    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas")
      setLoading(false)
      return
    }

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        email: formData.get("email"),
        password,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? "Erreur lors de la création du compte")
      setLoading(false)
      return
    }

    router.push("/login?registered=1")
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        name="name"
        type="text"
        label="Nom de l'entreprise"
        placeholder="ACME Corp"
        required
        minLength={2}
      />
      <Input
        name="email"
        type="email"
        label="Email"
        placeholder="contact@entreprise.com"
        required
        autoComplete="email"
      />
      <Input
        name="password"
        type="password"
        label="Mot de passe"
        placeholder="••••••••"
        required
        minLength={8}
        autoComplete="new-password"
      />
      <Input
        name="confirm"
        type="password"
        label="Confirmer le mot de passe"
        placeholder="••••••••"
        required
        autoComplete="new-password"
      />
      {error && (
        <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}
      <Button type="submit" loading={loading} className="w-full">
        Créer le compte
      </Button>
    </form>
  )
}
