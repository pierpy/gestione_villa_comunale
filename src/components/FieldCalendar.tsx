"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format, addDays, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import type { AvailabilityBlock } from "@/lib/slots";
import { formatEuro, formatDuration, timeToMinutes, addMinutesToTime } from "@/lib/pricing";

interface FieldSummary {
  id: string;
  name: string;
  pricePerHour: number;
  depositPercent: number;
  slotMinutes: number;
  openingHour: number;
}

interface Props {
  field: FieldSummary;
  slugPath: string;
  date: string;
  blocks: AvailabilityBlock[];
  isLoggedIn: boolean;
  isAdmin: boolean;
}

const MAX_BOOKING_HOURS = 6;

export default function FieldCalendar({
  field,
  slugPath,
  date,
  blocks,
  isLoggedIn,
  isAdmin,
}: Props) {
  const router = useRouter();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [startTime, setStartTime] = useState("");
  const [durationHours, setDurationHours] = useState(1);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedBlock = selectedIndex !== null ? blocks[selectedIndex] : null;

  const startTimeOptions = useMemo(() => {
    if (!selectedBlock) return [];
    const step = field.slotMinutes;
    const blockStart = timeToMinutes(selectedBlock.start);
    const blockEnd = timeToMinutes(selectedBlock.end);
    const gridStart = field.openingHour * 60;
    // Gli orari proposti devono essere allineati alla griglia dei quarti
    // d'ora a partire dall'apertura del campo (come richiesto dal server),
    // non semplicemente a partire dall'inizio della fascia libera: quella
    // fascia può iniziare "adesso" a un minuto qualsiasi se il blocco
    // precedente è appena scaduto.
    const firstAligned = Math.ceil((blockStart - gridStart) / step) * step + gridStart;
    const options: string[] = [];
    for (let minutes = firstAligned; minutes <= blockEnd - step; minutes += step) {
      if (minutes < blockStart) continue;
      options.push(addMinutesToTime("00:00", minutes));
    }
    return options;
  }, [selectedBlock, field.slotMinutes, field.openingHour]);

  const durationOptions = useMemo(() => {
    if (!selectedBlock || !startTime) return [];
    const remainingMinutes = timeToMinutes(selectedBlock.end) - timeToMinutes(startTime);
    const step = field.slotMinutes;
    const options: number[] = [];
    for (
      let minutes = step;
      minutes <= remainingMinutes && minutes <= MAX_BOOKING_HOURS * 60;
      minutes += step
    ) {
      options.push(minutes / 60);
    }
    return options;
  }, [selectedBlock, startTime, field.slotMinutes]);

  function goToDate(newDate: string) {
    router.push(`/campi/${slugPath}?date=${newDate}`);
  }

  function selectBlock(index: number) {
    setError(null);
    setSelectedIndex(index);
    const block = blocks[index];
    const step = field.slotMinutes;
    const gridStart = field.openingHour * 60;
    const blockStart = timeToMinutes(block.start);
    const firstAligned = Math.ceil((blockStart - gridStart) / step) * step + gridStart;
    setStartTime(addMinutesToTime("00:00", firstAligned));
    setDurationHours(field.slotMinutes / 60 >= 1 ? field.slotMinutes / 60 : 1);
  }

  function handleStartTimeChange(value: string) {
    setStartTime(value);
    if (!selectedBlock || !value) return;

    const blockEnd = timeToMinutes(selectedBlock.end);
    const remainingMinutes = blockEnd - timeToMinutes(value);
    const maxHours = Math.min(remainingMinutes / 60, MAX_BOOKING_HOURS);
    if (durationHours > maxHours) {
      setDurationHours(Math.max(field.slotMinutes / 60, Math.floor(maxHours * 4) / 4));
    }
  }

  async function submitBooking() {
    if (!selectedBlock || !startTime) return;
    setError(null);
    setLoading(true);

    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fieldId: field.id,
        date,
        startTime,
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
  const endTime = startTime ? addMinutesToTime(startTime, durationHours * 60) : "";

  const displayDate = format(parseISO(date), "EEEE d MMMM yyyy", { locale: it });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 capitalize">
            {displayDate}
          </h2>
          <p className="text-sm text-slate-500">
            Puoi scegliere l&apos;orario di inizio con incrementi di {field.slotMinutes} minuti
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

      <div className="mt-6 space-y-2">
        {blocks.map((block, index) => {
          const isSelected = selectedIndex === index;

          if (block.status === "past") {
            return (
              <div
                key={`${block.start}-${index}`}
                className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-300"
              >
                {block.start} - {block.end} · Passato
              </div>
            );
          }

          if (block.status === "booked") {
            return (
              <div
                key={`${block.start}-${index}`}
                className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
                title={isAdmin ? block.ownerName : undefined}
              >
                <span className="font-medium">{block.start} - {block.end}</span>
                {" · "}
                {block.isMine ? "La tua prenotazione" : isAdmin ? block.ownerName : "Occupato"}
              </div>
            );
          }

          return (
            <button
              key={`${block.start}-${index}`}
              onClick={() => selectBlock(index)}
              className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition ${
                isSelected
                  ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500"
                  : "border-emerald-200 bg-white hover:border-emerald-400 hover:bg-emerald-50"
              }`}
            >
              <span className="font-medium text-slate-900">{block.start} - {block.end}</span>
              <span className="ml-2 text-emerald-700">Libero</span>
            </button>
          );
        })}
        {blocks.length === 0 && (
          <p className="text-sm text-slate-400">Nessuno slot disponibile per questo giorno.</p>
        )}
      </div>

      {selectedBlock && (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50/60 p-5">
          <h3 className="font-semibold text-slate-900">
            Prenota nella fascia {selectedBlock.start} - {selectedBlock.end}
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
              <div className="flex flex-wrap gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Orario di inizio
                  </label>
                  <select
                    value={startTime}
                    onChange={(e) => handleStartTimeChange(e.target.value)}
                    className="mt-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
                  >
                    {startTimeOptions.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Durata</label>
                  <select
                    value={durationHours}
                    onChange={(e) => setDurationHours(Number(e.target.value))}
                    className="mt-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
                  >
                    {durationOptions.map((h) => (
                      <option key={h} value={h}>
                        {formatDuration(h)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {startTime && endTime && (
                <p className="text-sm text-slate-600">
                  Dalle <span className="font-medium">{startTime}</span> alle{" "}
                  <span className="font-medium">{endTime}</span>
                </p>
              )}

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
                  disabled={loading || durationOptions.length === 0}
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
