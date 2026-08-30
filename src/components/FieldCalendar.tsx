"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format, addDays, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import type { SlotInfo } from "@/lib/slots";
import { formatEuro } from "@/lib/pricing";

interface FieldSummary {
  id: string;
  name: string;
  pricePerHour: number;
  depositPercent: number;
  slotMinutes: number;
}

interface Props {
  field: FieldSummary;
  slugPath: string;
  date: string;
  slots: SlotInfo[];
  isLoggedIn: boolean;
  isAdmin: boolean;
}

export default function FieldCalendar({
  field,
  slugPath,
  date,
  slots,
  isLoggedIn,
  isAdmin,
}: Props) {
  const router = useRouter();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [durationHours, setDurationHours] = useState(1);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const slotsPerHour = 60 / field.slotMinutes;

  const maxDurationForSelected = useMemo(() => {
    if (selectedIndex === null) return 0;
    let count = 0;
    for (let i = selectedIndex; i < slots.length; i++) {
      if (slots[i].status !== "free") break;
      count++;
    }
    return count / slotsPerHour;
  }, [selectedIndex, slots, slotsPerHour]);

  function goToDate(newDate: string) {
    router.push(`/campi/${slugPath}?date=${newDate}`);
  }

  function selectSlot(index: number) {
    setError(null);
    setSelectedIndex(index);
    setDurationHours(1);
  }

  async function submitBooking() {
    if (selectedIndex === null) return;
    setError(null);
    setLoading(true);

    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fieldId: field.id,
        date,
        startTime: slots[selectedIndex].start,
        durationHours,
        notes,
      }),
    });

    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Errore durante la prenotazione");
      router.refresh();
      return;
    }

    router.push(`/dashboard/prenotazioni/${data.id}`);
  }

  const totalPrice = field.pricePerHour * durationHours;
  const deposit = (totalPrice * field.depositPercent) / 100;

  const displayDate = format(parseISO(date), "EEEE d MMMM yyyy", { locale: it });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 capitalize">
            {displayDate}
          </h2>
          <p className="text-sm text-slate-500">
            Orari mostrati con slot da {field.slotMinutes} minuti
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => goToDate(format(addDays(parseISO(date), -1), "yyyy-MM-dd"))}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100"
          >
            ← Giorno prec.
          </button>
          <button
            onClick={() => goToDate(format(new Date(), "yyyy-MM-dd"))}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100"
          >
            Oggi
          </button>
          <button
            onClick={() => goToDate(format(addDays(parseISO(date), 1), "yyyy-MM-dd"))}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100"
          >
            Giorno succ. →
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {slots.map((slot, index) => {
          const isSelected = selectedIndex === index;
          const base =
            "rounded-lg border px-3 py-3 text-sm text-left transition focus:outline-none";

          if (slot.status === "past") {
            return (
              <div
                key={slot.start}
                className={`${base} border-slate-100 bg-slate-50 text-slate-300`}
              >
                {slot.start} - {slot.end}
                <div className="text-xs">Passato</div>
              </div>
            );
          }

          if (slot.status === "booked") {
            return (
              <div
                key={slot.start}
                className={`${base} border-red-100 bg-red-50 text-red-700`}
                title={isAdmin ? slot.ownerName : undefined}
              >
                {slot.start} - {slot.end}
                <div className="text-xs">
                  {slot.isMine
                    ? "La tua prenotazione"
                    : isAdmin
                    ? slot.ownerName
                    : "Occupato"}
                </div>
              </div>
            );
          }

          return (
            <button
              key={slot.start}
              onClick={() => selectSlot(index)}
              className={`${base} ${
                isSelected
                  ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500"
                  : "border-emerald-200 bg-white hover:border-emerald-400 hover:bg-emerald-50"
              }`}
            >
              {slot.start} - {slot.end}
              <div className="text-xs text-emerald-700">Libero</div>
            </button>
          );
        })}
      </div>

      {selectedIndex !== null && (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50/60 p-5">
          <h3 className="font-semibold text-slate-900">
            Prenota dalle {slots[selectedIndex].start}
          </h3>

          {!isLoggedIn ? (
            <p className="mt-2 text-sm text-slate-600">
              Devi{" "}
              <a href="/login" className="font-medium text-emerald-700 underline">
                accedere
              </a>{" "}
              o{" "}
              <a href="/register" className="font-medium text-emerald-700 underline">
                registrarti
              </a>{" "}
              per completare la prenotazione.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700">Durata</label>
                <select
                  value={durationHours}
                  onChange={(e) => setDurationHours(Number(e.target.value))}
                  className="mt-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
                >
                  {Array.from(
                    { length: Math.max(1, Math.floor(maxDurationForSelected)) },
                    (_, i) => i + 1
                  ).map((h) => (
                    <option key={h} value={h}>
                      {h} {h === 1 ? "ora" : "ore"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Note <span className="text-slate-400">(facoltativo)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Es. numero di giocatori, richieste particolari..."
                />
              </div>

              <div className="rounded-md bg-white p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Totale campo</span>
                  <span className="font-medium">{formatEuro(totalPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">
                    Acconto richiesto ({field.depositPercent}%)
                  </span>
                  <span className="font-medium">{formatEuro(deposit)}</span>
                </div>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex gap-2">
                <button
                  onClick={submitBooking}
                  disabled={loading}
                  className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {loading ? "Prenotazione..." : "Conferma prenotazione"}
                </button>
                <button
                  onClick={() => setSelectedIndex(null)}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                >
                  Annulla
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
