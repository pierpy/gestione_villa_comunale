import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { messageSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = messageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 }
    );
  }

  const { bookingId, body: text } = parsed.data;

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) {
    return NextResponse.json({ error: "Prenotazione non trovata" }, { status: 404 });
  }

  const isOwner = booking.userId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const message = await prisma.message.create({
    data: {
      bookingId,
      senderId: session.user.id,
      fromAdmin: isAdmin,
      body: text,
    },
    include: { sender: { select: { id: true, name: true, role: true } } },
  });

  return NextResponse.json(message, { status: 201 });
}
