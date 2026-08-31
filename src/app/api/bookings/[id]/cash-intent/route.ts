import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computePaymentAmountForType } from "@/lib/pricing";

export async function POST(
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

  if (booking.userId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  if (booking.status === "CANCELLED" || booking.status === "COMPLETED") {
    return NextResponse.json(
      { error: "Non è possibile pagare una prenotazione annullata o conclusa" },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const type = body.type as "ACCONTO" | "SALDO" | "INTERO" | undefined;

  // L'acconto (o l'intero importo) che sblocca la prenotazione deve sempre
  // arrivare da un pagamento reale online (carta o bonifico): i contanti
  // possono coprire solo il saldo rimanente su una prenotazione già
  // confermata da un acconto, altrimenti chiunque potrebbe bloccare uno
  // slot senza alcun impegno economico.
  if (type !== "SALDO") {
    return NextResponse.json(
      {
        error:
          "L'acconto va pagato con carta o bonifico per confermare la prenotazione. I contanti si possono usare solo per il saldo rimanente.",
      },
      { status: 400 }
    );
  }

  const amount = computePaymentAmountForType(booking, type);
  if (amount === null) {
    return NextResponse.json({ error: "Tipo di pagamento non valido" }, { status: 400 });
  }

  const existingPending = await prisma.payment.findFirst({
    where: { bookingId: booking.id, method: "CONTANTI", type, status: "PENDING" },
  });

  const payment =
    existingPending ??
    (await prisma.payment.create({
      data: {
        bookingId: booking.id,
        amount,
        type,
        method: "CONTANTI",
        status: "PENDING",
      },
    }));

  return NextResponse.json({
    payment: { id: payment.id, amount: payment.amount },
  });
}
