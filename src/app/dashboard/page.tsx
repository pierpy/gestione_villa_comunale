import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatEuro } from "@/lib/pricing";
import { STATUS_LABELS, STATUS_STYLES, FIELD_TYPE_LABELS } from "@/lib/status";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) return null;

  const bookings = await prisma.booking.findMany({
    where: { userId: session.user.id },
    include: { field: true },
    orderBy: [{ date: "desc" }, { startTime: "desc" }],
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Le mie prenotazioni</h1>
        <Link
          href="/campi/calcetto"
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          + Nuova prenotazione
        </Link>
      </div>

      {bookings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          Non hai ancora nessuna prenotazione.
        </div>
      ) : (
        <ul className="space-y-3">
          {bookings.map((b) => (
            <li key={b.id}>
              <Link
                href={`/dashboard/prenotazioni/${b.id}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-4 hover:border-emerald-300 hover:shadow-sm"
              >
                <div>
                  <p className="font-medium text-slate-900">
                    {FIELD_TYPE_LABELS[b.field.type]} — {b.date} {b.startTime}-{b.endTime}
                  </p>
                  <p className="text-sm text-slate-500">
                    {formatEuro(b.amountPaid)} pagati di {formatEuro(b.totalPrice)}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[b.status]}`}
                >
                  {STATUS_LABELS[b.status]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
