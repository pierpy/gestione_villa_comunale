"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatEuro } from "@/lib/pricing";
import { STATUS_LABELS, STATUS_STYLES, FIELD_TYPE_LABELS } from "@/lib/status";

export interface BookingDetailData {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  totalPrice: number;
  depositAmount: number;
  amountPaid: number;
  status: string;
  notes: string | null;
  field: { name: string; type: string };
  user: { id: string; name: string; email: string; phone: string | null };
  payments: {
    id: string;
    amount: number;
    type: string;
    status: string;
    createdAt: string;
  }[];
  messages: {
    id: string;
    body: string;
    createdAt: string;
    fromAdmin: boolean;
    sender: { id: string; name: string; role: string };
  }[];
}

const ADMIN_STATUS_OPTIONS = [
  "PENDING_PAYMENT",
  "CONFIRMED",
  "CANCELLED",
  "COMPLETED",
];

export default function BookingDetail({
  booking,
  viewAs,
}: {
  booking: BookingDetailData;
  viewAs: "user" | "admin";
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [payLoading, setPayLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [messageLoading, setMessageLoading] = useState(false);

  const remaining = Math.max(0, booking.totalPrice - booking.amountPaid);
  const isFullyPaid = booking.amountPaid >= booking.totalPrice;
  const canAct = booking.status !== "CANCELLED" && booking.status !== "COMPLETED";

  async function pay(type: "ACCONTO" | "SALDO" | "INTERO") {
    setError(null);
    setPayLoading(true);
    const res = await fetch(`/api/bookings/${booking.id}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    });
    const data = await res.json().catch(() => ({}));
    setPayLoading(false);

    if (!res.ok) {
      setError(data.error || "Errore durante il pagamento");
      return;
    }

    if (data.checkoutUrl) {
      window.location.href = data.checkoutUrl;
      return;
    }

    router.refresh();
  }

  async function markPaidCash(type: "ACCONTO" | "SALDO" | "INTERO") {
    setError(null);
    setPayLoading(true);
    const res = await fetch(`/api/bookings/${booking.id}/mark-paid`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    });
    const data = await res.json().catch(() => ({}));
    setPayLoading(false);
    if (!res.ok) {
      setError(data.error || "Errore");
      return;
    }
    router.refresh();
  }

  async function cancelBooking() {
    if (!confirm("Confermi l'annullamento di questa prenotazione?")) return;
    setError(null);
    const res = await fetch(`/api/bookings/${booking.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Errore durante l'annullamento");
      return;
    }
    router.refresh();
  }

  async function changeStatus(status: string) {
    setStatusLoading(true);
    setError(null);
    const res = await fetch(`/api/bookings/${booking.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json().catch(() => ({}));
    setStatusLoading(false);
    if (!res.ok) {
      setError(data.error || "Errore durante l'aggiornamento");
      return;
    }
    router.refresh();
  }

  async function sendMessage() {
    if (!messageText.trim()) return;
    setMessageLoading(true);
    setError(null);
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId: booking.id, body: messageText }),
    });
    const data = await res.json().catch(() => ({}));
    setMessageLoading(false);
    if (!res.ok) {
      setError(data.error || "Errore durante l'invio del messaggio");
      return;
    }
    setMessageText("");
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                {FIELD_TYPE_LABELS[booking.field.type]} — {booking.date}
              </h1>
              <p className="text-slate-600">
                {booking.startTime} - {booking.endTime} ({booking.durationHours}h)
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[booking.status]}`}
            >
              {STATUS_LABELS[booking.status]}
            </span>
          </div>

          {booking.notes && (
            <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm text-slate-600">
              <span className="font-medium">Note: </span>
              {booking.notes}
            </p>
          )}

          {viewAs === "admin" && (
            <div className="mt-4 rounded-md border border-slate-200 p-3 text-sm">
              <p className="font-medium text-slate-700">Cliente</p>
              <p>{booking.user.name}</p>
              <p className="text-slate-500">{booking.user.email}</p>
              {booking.user.phone && <p className="text-slate-500">{booking.user.phone}</p>}
            </div>
          )}

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <div className="mt-5 flex flex-wrap gap-2">
            {canAct && (
              <button
                onClick={cancelBooking}
                className="rounded-md border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50"
              >
                Annulla prenotazione
              </button>
            )}
          </div>

          {viewAs === "admin" && (
            <div className="mt-4 flex items-center gap-2">
              <label className="text-sm font-medium text-slate-700">Stato:</label>
              <select
                defaultValue={booking.status}
                disabled={statusLoading}
                onChange={(e) => changeStatus(e.target.value)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
              >
                {ADMIN_STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="font-semibold text-slate-900">Messaggi</h2>
          <p className="text-xs text-slate-500 mb-3">
            {viewAs === "admin"
              ? "Comunica con il cliente riguardo a questa prenotazione."
              : "Scrivi agli amministratori per qualsiasi richiesta su questa prenotazione."}
          </p>

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {booking.messages.length === 0 && (
              <p className="text-sm text-slate-400">Nessun messaggio.</p>
            )}
            {booking.messages.map((m) => (
              <div
                key={m.id}
                className={`rounded-lg p-3 text-sm ${
                  m.fromAdmin
                    ? "bg-emerald-50 text-emerald-900"
                    : "bg-slate-100 text-slate-800"
                }`}
              >
                <p className="text-xs font-medium opacity-70">
                  {m.fromAdmin ? `Staff · ${m.sender.name}` : m.sender.name} ·{" "}
                  {new Date(m.createdAt).toLocaleString("it-IT")}
                </p>
                <p className="mt-0.5">{m.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 flex gap-2">
            <input
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Scrivi un messaggio..."
              className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button
              onClick={sendMessage}
              disabled={messageLoading}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              Invia
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="font-semibold text-slate-900">Pagamento</h2>
          <div className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Totale</span>
              <span>{formatEuro(booking.totalPrice)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Acconto minimo</span>
              <span>{formatEuro(booking.depositAmount)}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Pagato</span>
              <span>{formatEuro(booking.amountPaid)}</span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>Da pagare</span>
              <span>{formatEuro(remaining)}</span>
            </div>
          </div>

          {canAct && !isFullyPaid && viewAs === "user" && (
            <div className="mt-4 space-y-2">
              {booking.amountPaid <= 0 && (
                <>
                  <button
                    onClick={() => pay("ACCONTO")}
                    disabled={payLoading}
                    className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    Paga acconto ({formatEuro(booking.depositAmount)})
                  </button>
                  <button
                    onClick={() => pay("INTERO")}
                    disabled={payLoading}
                    className="w-full rounded-md border border-emerald-600 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                  >
                    Paga intero importo ({formatEuro(booking.totalPrice)})
                  </button>
                </>
              )}
              {booking.amountPaid > 0 && (
                <button
                  onClick={() => pay("SALDO")}
                  disabled={payLoading}
                  className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  Paga saldo rimanente ({formatEuro(remaining)})
                </button>
              )}
            </div>
          )}

          {canAct && !isFullyPaid && viewAs === "admin" && (
            <div className="mt-4 space-y-2">
              <p className="text-xs text-slate-500">
                Registra un pagamento ricevuto manualmente (es. in contanti sul posto).
              </p>
              {booking.amountPaid <= 0 && (
                <>
                  <button
                    onClick={() => markPaidCash("ACCONTO")}
                    disabled={payLoading}
                    className="w-full rounded-md border border-emerald-600 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                  >
                    Segna acconto ricevuto ({formatEuro(booking.depositAmount)})
                  </button>
                  <button
                    onClick={() => markPaidCash("INTERO")}
                    disabled={payLoading}
                    className="w-full rounded-md border border-emerald-600 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                  >
                    Segna intero importo ricevuto ({formatEuro(booking.totalPrice)})
                  </button>
                </>
              )}
              {booking.amountPaid > 0 && (
                <button
                  onClick={() => markPaidCash("SALDO")}
                  disabled={payLoading}
                  className="w-full rounded-md border border-emerald-600 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                >
                  Segna saldo ricevuto ({formatEuro(remaining)})
                </button>
              )}
            </div>
          )}

          {isFullyPaid && (
            <p className="mt-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">
              Pagamento completato.
            </p>
          )}
        </div>

        {booking.payments.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="font-semibold text-slate-900">Storico pagamenti</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {booking.payments.map((p) => (
                <li key={p.id} className="flex justify-between border-b border-slate-100 pb-2">
                  <span>
                    {p.type} ·{" "}
                    <span
                      className={
                        p.status === "PAID" ? "text-emerald-600" : "text-slate-400"
                      }
                    >
                      {p.status}
                    </span>
                  </span>
                  <span className="font-medium">{formatEuro(p.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
