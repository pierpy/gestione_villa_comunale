import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getBookingOr404(id: string) {
  return prisma.booking.findUnique({
    where: { id },
    include: {
      field: true,
      user: { select: { id: true, name: true, email: true, phone: true } },
      payments: { orderBy: { createdAt: "desc" } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: { sender: { select: { id: true, name: true, role: true } } },
      },
    },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const { id } = await params;
  const booking = await getBookingOr404(id);
  if (!booking) {
    return NextResponse.json({ error: "Prenotazione non trovata" }, { status: 404 });
  }

  const isOwner = booking.userId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  return NextResponse.json(booking);
}

const ADMIN_ALLOWED_STATUSES = ["CONFIRMED", "CANCELLED", "COMPLETED", "PENDING_PAYMENT"];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const { id } = await params;
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) {
    return NextResponse.json({ error: "Prenotazione non trovata" }, { status: 404 });
  }

  const isOwner = booking.userId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));

  if (isAdmin && typeof body.status === "string") {
    if (!ADMIN_ALLOWED_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Stato non valido" }, { status: 400 });
    }
    const updated = await prisma.booking.update({
      where: { id },
      data: { status: body.status },
    });
    return NextResponse.json(updated);
  }

  if (body.action === "cancel") {
    if (booking.status === "CANCELLED" || booking.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Questa prenotazione non può essere annullata" },
        { status: 400 }
      );
    }
    if (!isAdmin && booking.userId !== session.user.id) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }
    const updated = await prisma.booking.update({
      where: { id },
      data: { status: "CANCELLED" },
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Operazione non valida" }, { status: 400 });
}
