import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { bookingSchema } from "@/lib/validation";
import { computeDeposit, computeTotalPrice, addMinutesToTime, timeToMinutes } from "@/lib/pricing";
import { expireStaleBookings } from "@/lib/bookings";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const isAdmin = session.user.role === "ADMIN";

  const where: Record<string, unknown> = {};
  if (!isAdmin) {
    where.userId = session.user.id;
  } else {
    const fieldType = searchParams.get("fieldType");
    const status = searchParams.get("status");
    const date = searchParams.get("date");
    if (fieldType) where.field = { type: fieldType };
    if (status) where.status = status;
    if (date) where.date = date;
  }

  const bookings = await prisma.booking.findMany({
    where,
    include: {
      field: true,
      user: { select: { id: true, name: true, email: true, phone: true } },
    },
    orderBy: [{ date: "desc" }, { startTime: "desc" }],
  });

  return NextResponse.json(bookings);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Devi accedere per prenotare" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 }
    );
  }

  const { fieldId, date, startTime, durationHours, notes } = parsed.data;

  const field = await prisma.field.findUnique({ where: { id: fieldId } });
  if (!field) {
    return NextResponse.json({ error: "Campo non trovato" }, { status: 404 });
  }

  const endTime = addMinutesToTime(startTime, durationHours * 60);

  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  if (
    startMinutes < field.openingHour * 60 ||
    endMinutes > field.closingHour * 60
  ) {
    return NextResponse.json(
      { error: "Orario fuori dagli orari di apertura del campo" },
      { status: 400 }
    );
  }

  // Margine di tolleranza: uno slot libero può iniziare "adesso" al momento
  // in cui la pagina viene caricata, ma l'utente impiega qualche minuto a
  // scegliere durata e note prima di inviare la richiesta.
  const BOOKING_GRACE_MS = 5 * 60 * 1000;
  const requestedStart = new Date(`${date}T${startTime}:00`);
  if (requestedStart.getTime() < Date.now() - BOOKING_GRACE_MS) {
    return NextResponse.json(
      { error: "Non puoi prenotare uno slot nel passato" },
      { status: 400 }
    );
  }

  await expireStaleBookings();

  const existing = await prisma.booking.findMany({
    where: {
      fieldId,
      date,
      status: { not: "CANCELLED" },
    },
  });

  const conflict = existing.some(
    (b) =>
      timeToMinutes(b.startTime) < endMinutes &&
      timeToMinutes(b.endTime) > startMinutes
  );

  if (conflict) {
    return NextResponse.json(
      { error: "Lo slot selezionato non è più disponibile" },
      { status: 409 }
    );
  }

  const totalPrice = computeTotalPrice(field.pricePerHour, durationHours);
  const depositAmount = computeDeposit(totalPrice, field.depositPercent);

  try {
    const booking = await prisma.booking.create({
      data: {
        fieldId,
        userId: session.user.id,
        date,
        startTime,
        endTime,
        durationHours,
        totalPrice,
        depositAmount,
        notes: notes || null,
      },
    });

    return NextResponse.json(booking, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Lo slot selezionato non è più disponibile" },
      { status: 409 }
    );
  }
}
