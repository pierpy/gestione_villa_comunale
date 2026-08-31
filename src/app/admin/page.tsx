import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatEuro } from "@/lib/pricing";
import { STATUS_LABELS, STATUS_STYLES, FIELD_TYPE_LABELS } from "@/lib/status";
import { expireStaleBookings } from "@/lib/bookings";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ fieldType?: string; status?: string; date?: string }>;
}) {
  const { fieldType, status, date } = await searchParams;

  await expireStaleBookings();

  const where: Record<string, unknown> = {};
  if (fieldType) where.field = { type: fieldType };
  if (status) where.status = status;
  if (date) where.date = date;

  const [bookings, fields, pendingBankTransfers] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: {
        field: true,
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
      orderBy: [{ date: "desc" }, { startTime: "desc" }],
      take: 100,
    }),
    prisma.field.findMany(),
    prisma.payment.count({ where: { method: "BONIFICO", status: "PENDING" } }),
  ]);

  const pendingCount = bookings.filter((b) => b.status === "PENDING_PAYMENT").length;
  const confirmedCount = bookings.filter((b) => b.status === "CONFIRMED").length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pannello amministratore</h1>
          <p className="mt-1 text-sm text-slate-500">
            Tutte le prenotazioni sui campi della Villa Comunale.
          </p>
        </div>
        <Link
          href="/admin/utenti"
          className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
        >
          Gestisci utenti →
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard label="Totale" value={bookings.length} />
        <StatCard label="In attesa" value={pendingCount} />
        <StatCard label="Confermate" value={confirmedCount} />
        <StatCard
          label="Incassato"
          value={formatEuro(bookings.reduce((sum, b) => sum + b.amountPaid, 0))}
        />
        <StatCard
          label="Bonifici da confermare"
          value={pendingBankTransfers}
          highlight={pendingBankTransfers > 0}
        />
      </div>

      <form className="mt-8 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div>
          <label className="block text-xs font-medium text-slate-500">Campo</label>
          <select
            name="fieldType"
            defaultValue={fieldType || ""}
            className="mt-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          >
            <option value="">Tutti</option>
            {fields.map((f) => (
              <option key={f.id} value={f.type}>
                {FIELD_TYPE_LABELS[f.type]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500">Stato</label>
          <select
            name="status"
            defaultValue={status || ""}
            className="mt-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          >
            <option value="">Tutti</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500">Data</label>
          <input
            type="date"
            name="date"
            defaultValue={date || ""}
            className="mt-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Filtra
        </button>
        <Link href="/admin" className="text-sm text-slate-500 hover:underline">
          Reimposta
        </Link>
      </form>

      {bookings.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-400">
          Nessuna prenotazione trovata.
        </div>
      ) : (
        <>
          {/* Schede: vista mobile */}
          <ul className="mt-6 space-y-3 sm:hidden">
            {bookings.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/admin/prenotazioni/${b.id}`}
                  className="block rounded-xl border border-slate-200 bg-white p-4 active:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {FIELD_TYPE_LABELS[b.field.type]}
                      </p>
                      <p className="text-sm text-slate-500">
                        {b.date} · {b.startTime}-{b.endTime}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[b.status]}`}
                    >
                      {STATUS_LABELS[b.status]}
                    </span>
                  </div>
                  <div className="mt-3 flex items-end justify-between border-t border-slate-100 pt-3">
                    <div>
                      <p className="text-sm text-slate-700">{b.user.name}</p>
                      <p className="text-xs text-slate-400">{b.user.email}</p>
                    </div>
                    <p className="text-sm font-medium text-slate-900">
                      {formatEuro(b.amountPaid)}
                      <span className="text-slate-400"> / {formatEuro(b.totalPrice)}</span>
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {/* Tabella: vista desktop */}
          <div className="mt-6 hidden overflow-x-auto rounded-xl border border-slate-200 bg-white sm:block">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Campo</th>
                  <th className="px-4 py-3">Data / Ora</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Pagato</th>
                  <th className="px-4 py-3">Stato</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/prenotazioni/${b.id}`}
                        className="font-medium text-emerald-700 hover:underline"
                      >
                        {FIELD_TYPE_LABELS[b.field.type]}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {b.date} · {b.startTime}-{b.endTime}
                    </td>
                    <td className="px-4 py-3">
                      <div>{b.user.name}</div>
                      <div className="text-xs text-slate-400">{b.user.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      {formatEuro(b.amountPaid)} / {formatEuro(b.totalPrice)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[b.status]}`}
                      >
                        {STATUS_LABELS[b.status]}
                      </span>
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

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlight ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"
      }`}
    >
      <p
        className={`text-xs font-medium uppercase ${
          highlight ? "text-amber-700" : "text-slate-400"
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-1 text-xl font-semibold ${
          highlight ? "text-amber-900" : "text-slate-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
