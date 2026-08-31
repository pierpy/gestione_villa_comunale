import Link from "next/link";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import type { WeekDayOverview } from "@/lib/slots";

interface Props {
  slugPath: string;
  weekDays: WeekDayOverview[];
  selectedDate: string;
}

const STATUS_STYLES: Record<string, string> = {
  free: "bg-emerald-100 hover:bg-emerald-200",
  booked: "bg-red-200",
  past: "bg-slate-100",
};

export default function WeekOverview({ slugPath, weekDays, selectedDate }: Props) {
  if (weekDays.length === 0) return null;

  const hours = weekDays[0].cells.map((c) => c.hour);
  const weekStart = weekDays[0].date;
  const weekEnd = weekDays[weekDays.length - 1].date;

  const prevWeekDate = format(
    addDaysToIso(weekStart, -7),
    "yyyy-MM-dd"
  );
  const nextWeekDate = format(
    addDaysToIso(weekStart, 7),
    "yyyy-MM-dd"
  );

  return (
    <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Panoramica della settimana
          </h2>
          <p className="text-xs text-slate-500">
            Tocca un&apos;ora libera per aprire quel giorno e scegliere l&apos;orario preciso.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/campi/${slugPath}?date=${prevWeekDate}`}
            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs hover:bg-slate-100"
          >
            ← Sett. prec.
          </Link>
          <Link
            href={`/campi/${slugPath}?date=${nextWeekDate}`}
            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs hover:bg-slate-100"
          >
            Sett. succ. →
          </Link>
        </div>
      </div>

      <div className="mt-3 overflow-x-auto scroll-touch">
        <table className="min-w-full border-separate" style={{ borderSpacing: "2px" }}>
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-white px-1 text-right text-[10px] font-normal text-slate-400">
                {weekStart === weekEnd ? "" : ""}
              </th>
              {weekDays.map((day) => {
                const isSelected = day.date === selectedDate;
                const parsed = parseISO(day.date);
                return (
                  <th key={day.date} className="px-0.5 pb-1 text-center">
                    <Link
                      href={`/campi/${slugPath}?date=${day.date}`}
                      className={`block rounded-md px-1.5 py-1 text-[11px] font-medium ${
                        isSelected
                          ? "bg-emerald-600 text-white"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <span className="block capitalize">
                        {format(parsed, "EEE", { locale: it })}
                      </span>
                      <span className="block">{format(parsed, "d/M")}</span>
                    </Link>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {hours.map((hour) => (
              <tr key={hour}>
                <td className="sticky left-0 z-10 bg-white px-1 text-right text-[10px] text-slate-400">
                  {String(hour).padStart(2, "0")}:00
                </td>
                {weekDays.map((day) => {
                  const cell = day.cells.find((c) => c.hour === hour);
                  const status = cell?.status ?? "past";
                  const content = (
                    <div
                      className={`h-4 w-full rounded-sm sm:h-5 ${STATUS_STYLES[status]}`}
                    />
                  );
                  return (
                    <td key={day.date + hour} className="p-0">
                      {status === "free" ? (
                        <Link
                          href={`/campi/${slugPath}?date=${day.date}`}
                          aria-label={`${day.date} ore ${hour}:00 libero`}
                          className="block"
                        >
                          {content}
                        </Link>
                      ) : (
                        content
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-slate-500">
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-sm bg-emerald-100" /> Libero
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-sm bg-red-200" /> Occupato
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-sm bg-slate-100" /> Passato
        </span>
      </div>
    </div>
  );
}

function addDaysToIso(dateIso: string, days: number) {
  const date = parseISO(dateIso);
  date.setDate(date.getDate() + days);
  return date;
}
