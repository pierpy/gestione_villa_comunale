import { addMinutesToTime, timeToMinutes } from "@/lib/pricing";

export type BlockStatus = "free" | "booked" | "past";

export interface AvailabilityBlock {
  start: string;
  end: string;
  status: BlockStatus;
  bookingId?: string;
  ownerName?: string;
  isMine?: boolean;
}

export interface FieldForSlots {
  openingHour: number;
  closingHour: number;
  slotMinutes: number;
}

export interface BookingForSlots {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  userId: string;
  userName: string;
}

/**
 * Calcola la disponibilità della giornata come sequenza di fasce (occupate
 * o libere), invece di uno slot fisso per ogni intervallo di slotMinutes.
 * Le fasce libere restano ampie (es. "13:00 - 17:00") e l'orario di inizio
 * preciso viene scelto dall'utente al momento della prenotazione, con
 * incrementi di field.slotMinutes.
 */
export function generateDayAvailability(
  field: FieldForSlots,
  date: string,
  bookings: BookingForSlots[],
  currentUserId: string | undefined,
  nowIso: string
): AvailabilityBlock[] {
  const openMinutes = field.openingHour * 60;
  const closeMinutes = field.closingHour * 60;

  const activeBookings = bookings
    .filter((b) => b.status !== "CANCELLED")
    .map((b) => ({
      start: timeToMinutes(b.startTime),
      end: timeToMinutes(b.endTime),
      id: b.id,
      ownerName: b.userName,
      isMine: b.userId === currentUserId,
    }))
    .sort((a, b) => a.start - b.start);

  const now = new Date(nowIso);
  const dayStart = new Date(`${date}T00:00:00`);
  const nowMinutes =
    now.toDateString() === dayStart.toDateString()
      ? now.getHours() * 60 + now.getMinutes()
      : now.getTime() < dayStart.getTime()
      ? -1
      : closeMinutes;

  const blocks: AvailabilityBlock[] = [];
  let cursor = openMinutes;

  function pushFree(from: number, to: number) {
    if (to <= from) return;
    if (to <= nowMinutes) {
      blocks.push({ start: minutesToTime(from), end: minutesToTime(to), status: "past" });
      return;
    }
    if (from < nowMinutes) {
      blocks.push({ start: minutesToTime(from), end: minutesToTime(nowMinutes), status: "past" });
      from = nowMinutes;
    }
    if (to > from) {
      blocks.push({ start: minutesToTime(from), end: minutesToTime(to), status: "free" });
    }
  }

  for (const booking of activeBookings) {
    const start = Math.max(booking.start, openMinutes);
    const end = Math.min(booking.end, closeMinutes);
    if (end <= openMinutes || start >= closeMinutes) continue;

    pushFree(cursor, start);
    blocks.push({
      start: minutesToTime(start),
      end: minutesToTime(end),
      status: "booked",
      bookingId: booking.id,
      ownerName: booking.ownerName,
      isMine: booking.isMine,
    });
    cursor = Math.max(cursor, end);
  }

  pushFree(cursor, closeMinutes);

  return blocks;
}

function minutesToTime(minutes: number) {
  return addMinutesToTime("00:00", minutes);
}

export type HourCellStatus = "free" | "booked" | "past";

export interface WeekDayOverview {
  date: string;
  cells: { hour: number; status: HourCellStatus }[];
}

/**
 * Vista d'insieme su più giorni: per ogni ora del giorno indica solo se è
 * libera, occupata o passata (senza dettaglio sulle singole prenotazioni),
 * utile per farsi un'idea rapida di quali giorni/orari sono più liberi
 * prima di scegliere la data su cui prenotare nel dettaglio.
 */
export function generateWeekOverview(
  field: FieldForSlots,
  weekDates: string[],
  bookingsByDate: Record<string, BookingForSlots[]>,
  nowIso: string
): WeekDayOverview[] {
  const now = new Date(nowIso).getTime();

  return weekDates.map((date) => {
    const activeBookings = (bookingsByDate[date] ?? []).filter(
      (b) => b.status !== "CANCELLED"
    );

    const cells: WeekDayOverview["cells"] = [];
    for (let hour = field.openingHour; hour < field.closingHour; hour++) {
      const cellStartMinutes = hour * 60;
      const cellEndMinutes = cellStartMinutes + 60;

      const cellEndDateTime = new Date(`${date}T${minutesToTime(cellEndMinutes)}:00`);
      const isPast = cellEndDateTime.getTime() <= now;

      const overlapping = activeBookings.some(
        (b) =>
          timeToMinutes(b.startTime) < cellEndMinutes &&
          timeToMinutes(b.endTime) > cellStartMinutes
      );

      cells.push({
        hour,
        status: isPast ? "past" : overlapping ? "booked" : "free",
      });
    }

    return { date, cells };
  });
}
