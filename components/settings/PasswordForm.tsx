"use client"

import { useState } from "react"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"

export function PasswordForm() {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const set = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const save = async () => {
    setMessage(null)
    if (form.newPassword !== form.confirmPassword) {
      setMessage({ type: "error", text: "Les mots de passe ne correspondent pas" })
      return
    }
    setLoading(true)
    const res = await fetch("/api/settings/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword }),
    })
    const data = await res.json()
    setLoading(false)
    if (res.ok) {
      setMessage({ type: "success", text: "Mot de passe modifié avec succès" })
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" })
    } else {
      setMessage({ type: "error", text: data.error ?? "Erreur lors de la modification" })
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">Changer le mot de passe</h2>
      <div className="space-y-3 max-w-sm">
        <Input
          label="Mot de passe actuel"
          type="password"
          value={form.currentPassword}
          onChange={set("currentPassword")}
          autoComplete="current-password"
        />
        <Input
          label="Nouveau mot de passe"
          type="password"
          value={form.newPassword}
          onChange={set("newPassword")}
          autoComplete="new-password"
        />
        <Input
          label="Confirmer le nouveau mot de passe"
          type="password"
          value={form.confirmPassword}
          onChange={set("confirmPassword")}
          autoComplete="new-password"
        />
      </div>

      {message && (
        <p className={`mt-3 text-sm font-medium ${message.type === "success" ? "text-green-600" : "text-red-500"}`}>
          {message.text}
        </p>
      )}

      <div className="mt-4">
        <Button onClick={save} loading={loading} variant="secondary">
          Modifier le mot de passe
        </Button>
      </div>
    </div>
  )
}
