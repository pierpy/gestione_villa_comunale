"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UserRoleToggle({
  userId,
  role,
}: {
  userId: string;
  role: "USER" | "ADMIN";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleRole() {
    const nextRole = role === "ADMIN" ? "USER" : "ADMIN";
    const label =
      nextRole === "ADMIN"
        ? "Vuoi rendere questo utente amministratore?"
        : "Vuoi togliere i permessi di amministratore a questo utente?";
    if (!confirm(label)) return;

    setError(null);
    setLoading(true);
    const res = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: nextRole }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Errore durante l'aggiornamento");
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={toggleRole}
        disabled={loading}
        className={
          role === "ADMIN"
            ? "rounded-md border border-red-300 px-3 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-60"
            : "rounded-md border border-emerald-600 px-3 py-1 text-xs text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
        }
      >
        {role === "ADMIN" ? "Rimuovi da admin" : "Rendi amministratore"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
