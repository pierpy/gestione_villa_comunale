import { addMinutesToTime, timeToMinutes } from "@/lib/pricing";

export type SlotStatus = "free" | "booked" | "past";

export interface SlotInfo {
  start: string;
  end: string;
  status: SlotStatus;
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

export function generateDaySlots(
  field: FieldForSlots,
  date: string,
  bookings: BookingForSlots[],
  currentUserId: string | undefined,
  nowIso: string
): SlotInfo[] {
  const slots: SlotInfo[] = [];
  const activeBookings = bookings.filter((b) => b.status !== "CANCELLED");

  const startMinutes = field.openingHour * 60;
  const endMinutes = field.closingHour * 60;

  for (
    let minutes = startMinutes;
    minutes < endMinutes;
    minutes += field.slotMinutes
  ) {
    const start = minutesToTime(minutes);
    const end = minutesToTime(minutes + field.slotMinutes);

    const overlapping = activeBookings.find(
      (b) =>
        timeToMinutes(b.startTime) < minutes + field.slotMinutes &&
        timeToMinutes(b.endTime) > minutes
    );

    const slotDateTime = new Date(`${date}T${start}:00`);
    const isPast = slotDateTime.getTime() < new Date(nowIso).getTime();

    if (overlapping) {
      slots.push({
        start,
        end,
        status: "booked",
        bookingId: overlapping.id,
        ownerName: overlapping.userName,
        isMine: overlapping.userId === currentUserId,
      });
    } else {
      slots.push({
        start,
        end,
        status: isPast ? "past" : "free",
      });
    }
  }

  return slots;
}

function minutesToTime(minutes: number) {
  return addMinutesToTime("00:00", minutes);
}
