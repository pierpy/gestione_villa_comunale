import { notFound } from "next/navigation";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { slugToFieldType } from "@/lib/fields";
import { generateDaySlots } from "@/lib/slots";
import { formatEuro } from "@/lib/pricing";
import FieldCalendar from "@/components/FieldCalendar";

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

  const bookings = await prisma.booking.findMany({
    where: { fieldId: field.id, date },
    include: { user: { select: { id: true, name: true } } },
  });

  const slots = generateDaySlots(
    field,
    date,
    bookings.map((b) => ({
      id: b.id,
      startTime: b.startTime,
      endTime: b.endTime,
      status: b.status,
      userId: b.userId,
      userName: b.user.name,
    })),
    session?.user.id,
    new Date().toISOString()
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{field.name}</h1>
        {field.description && (
          <p className="mt-1 text-slate-600">{field.description}</p>
        )}
        <p className="mt-2 text-sm text-slate-500">
          {formatEuro(field.pricePerHour)} / ora · acconto {field.depositPercent}% ·
          orario {field.openingHour}:00 - {field.closingHour}:00
        </p>
      </div>

      <FieldCalendar
        field={field}
        slugPath={type}
        date={date}
        slots={slots}
        isLoggedIn={!!session}
        isAdmin={session?.user.role === "ADMIN"}
      />
    </div>
  );
}
