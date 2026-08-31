import { notFound } from "next/navigation";
import Link from "next/link";
import { format, addDays, parseISO } from "date-fns";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { slugToFieldType, FIELD_TYPE_TO_SLUG } from "@/lib/fields";
import { generateDayAvailability, generateWeekOverview, type BookingForSlots } from "@/lib/slots";
import { formatEuro } from "@/lib/pricing";
import { expireStaleBookings } from "@/lib/bookings";
import FieldCalendar from "@/components/FieldCalendar";
import WeekOverview from "@/components/WeekOverview";

const FIELD_EMOJI: Record<string, string> = {
  CALCETTO: "⚽",
  PADEL: "🎾",
  TENNIS: "🏸",
};

export default async function FieldPage({
  params,
  searchParams,
}: {
  params: Promise<{ type: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { type } = await params;
  const { date: dateParam } = await searchParams;

  const fieldType = slugToFieldType(type);
  if (!fieldType) notFound();

  const field = await prisma.field.findUnique({ where: { type: fieldType } });
  if (!field) notFound();

  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
    ? dateParam
    : format(new Date(), "yyyy-MM-dd");

  const session = await auth();
  const allFields = await prisma.field.findMany({ orderBy: { type: "asc" } });

  await expireStaleBookings();

  const weekDates = Array.from({ length: 7 }, (_, i) =>
    format(addDays(parseISO(date), i), "yyyy-MM-dd")
  );

  const weekBookings = await prisma.booking.findMany({
    where: { fieldId: field.id, date: { in: weekDates } },
    include: { user: { select: { id: true, name: true } } },
  });

  const bookingsByDate: Record<string, BookingForSlots[]> = {};
  for (const d of weekDates) bookingsByDate[d] = [];
  for (const b of weekBookings) {
    bookingsByDate[b.date]?.push({
      id: b.id,
      startTime: b.startTime,
      endTime: b.endTime,
      status: b.status,
      userId: b.userId,
      userName: b.user.name,
    });
  }

  const nowIso = new Date().toISOString();

  const blocks = generateDayAvailability(
    field,
    date,
    bookingsByDate[date] ?? [],
    session?.user.id,
    nowIso
  );

  const weekOverview = generateWeekOverview(field, weekDates, bookingsByDate, nowIso);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
      <div className="mb-5 flex gap-1.5 overflow-x-auto sm:hidden">
        {allFields.map((f) => {
          const isActive = f.type === fieldType;
          const slug = FIELD_TYPE_TO_SLUG[f.type];
          return (
            <Link
              key={f.id}
              href={`/campi/${slug}`}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium ${
                isActive
                  ? "bg-emerald-600 text-white"
                  : "bg-white text-slate-600 border border-slate-200"
              }`}
            >
              {FIELD_EMOJI[f.type]} {FIELD_TYPE_TO_SLUG[f.type][0].toUpperCase() + FIELD_TYPE_TO_SLUG[f.type].slice(1)}
            </Link>
          );
        })}
      </div>

      <div className="mb-6 flex items-start gap-3">
        <span className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-2xl">
          {FIELD_EMOJI[field.type]}
        </span>
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{field.name}</h1>
          {field.description && (
            <p className="mt-1 text-sm text-slate-600 sm:text-base">{field.description}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
              {formatEuro(field.pricePerHour)} / ora
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
              Acconto {field.depositPercent}%
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
              {field.openingHour}:00 - {field.closingHour}:00
            </span>
          </div>
        </div>
      </div>

      <WeekOverview slugPath={type} weekDays={weekOverview} selectedDate={date} />

      <FieldCalendar
        field={field}
        slugPath={type}
        date={date}
        blocks={blocks}
        isLoggedIn={!!session}
        isAdmin={session?.user.role === "ADMIN"}
      />
    </div>
  );
}
