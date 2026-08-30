import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { roundToCents } from "@/lib/pricing";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { id } = await params;
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) {
    return NextResponse.json({ error: "Prenotazione non trovata" }, { status: 404 });
  }

  if (booking.status === "CANCELLED" || booking.status === "COMPLETED") {
    return NextResponse.json(
      { error: "Non è possibile registrare un pagamento su questa prenotazione" },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const type = body.type as "ACCONTO" | "SALDO" | "INTERO" | undefined;

  let amount: number;
  if (booking.amountPaid <= 0 && type === "INTERO") {
    amount = roundToCents(booking.totalPrice - booking.amountPaid);
  } else if (booking.amountPaid <= 0 && type === "ACCONTO") {
    amount = roundToCents(booking.depositAmount - booking.amountPaid);
  } else if (
    booking.amountPaid > 0 &&
    booking.amountPaid < booking.totalPrice &&
    type === "SALDO"
  ) {
    amount = roundToCents(booking.totalPrice - booking.amountPaid);
  } else {
    return NextResponse.json({ error: "Tipo di pagamento non valido" }, { status: 400 });
  }

  if (amount <= 0) {
    return NextResponse.json({ error: "Nessun importo da pagare" }, { status: 400 });
  }

  await prisma.payment.create({
    data: {
      bookingId: booking.id,
      amount,
      type,
      status: "PAID",
      paidAt: new Date(),
    },
  });

  const newAmountPaid = roundToCents(booking.amountPaid + amount);
  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      amountPaid: newAmountPaid,
      status: newAmountPaid >= booking.depositAmount ? "CONFIRMED" : booking.status,
    },
  });

  return NextResponse.json(updated);
}
