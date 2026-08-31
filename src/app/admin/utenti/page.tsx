import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import UserRoleToggle from "@/components/UserRoleToggle";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session) return null;

  const users = await prisma.user.findMany({
    orderBy: [{ role: "desc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true,
    },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/admin" className="text-sm text-emerald-700 hover:underline">
        ← Torna al pannello admin
      </Link>

      <div className="mt-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Utenti</h1>
          <p className="mt-1 text-sm text-slate-500">
            Rendi amministratore chi deve gestire prenotazioni e pagamenti.
          </p>
        </div>
      </div>

      {users.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-400">
          Nessun utente registrato.
        </div>
      ) : (
        <>
          {/* Schede: vista mobile */}
          <ul className="mt-6 space-y-3 sm:hidden">
            {users.map((u) => (
              <li key={u.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {u.name}
                      {u.id === session.user.id && (
                        <span className="ml-2 text-xs font-normal text-slate-400">(tu)</span>
                      )}
                    </p>
                    <p className="text-sm text-slate-500">{u.email}</p>
                    {u.phone && <p className="text-xs text-slate-400">{u.phone}</p>}
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                      u.role === "ADMIN"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {u.role === "ADMIN" ? "Amministratore" : "Utente"}
                  </span>
                </div>
                {u.id !== session.user.id && (
                  <div className="mt-3 flex justify-end border-t border-slate-100 pt-3">
                    <UserRoleToggle userId={u.id} role={u.role} />
                  </div>
                )}
              </li>
            ))}
          </ul>

          {/* Tabella: vista desktop */}
          <div className="mt-6 hidden overflow-x-auto rounded-xl border border-slate-200 bg-white sm:block">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Contatti</th>
                  <th className="px-4 py-3">Ruolo</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {u.name}
                      {u.id === session.user.id && (
                        <span className="ml-2 text-xs font-normal text-slate-400">(tu)</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div>{u.email}</div>
                      {u.phone && <div className="text-xs text-slate-400">{u.phone}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          u.role === "ADMIN"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {u.role === "ADMIN" ? "Amministratore" : "Utente"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {u.id !== session.user.id && (
                        <UserRoleToggle userId={u.id} role={u.role} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
