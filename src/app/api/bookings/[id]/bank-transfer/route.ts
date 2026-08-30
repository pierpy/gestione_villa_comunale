import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computePaymentAmountForType } from "@/lib/pricing";
import { bankTransferEnabled, generateTransferReference, getBankDetails } from "@/lib/bankTransfer";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!bankTransferEnabled) {
    return NextResponse.json(
      { error: "Il pagamento con bonifico non è disponibile" },
      { status: 400 }
    );
  }

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

  const amount = computePaymentAmountForType(booking, type);
  if (amount === null || !type) {
    return NextResponse.json({ error: "Tipo di pagamento non valido" }, { status: 400 });
  }

  const existingPending = await prisma.payment.findFirst({
    where: { bookingId: booking.id, method: "BONIFICO", type, status: "PENDING" },
  });

  const payment =
    existingPending ??
    (await prisma.payment.create({
      data: {
        bookingId: booking.id,
        amount,
        type,
        method: "BONIFICO",
        status: "PENDING",
      },
    }));

  if (!existingPending) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { reference: generateTransferReference(payment.id) },
    });
  }

  const bankDetails = getBankDetails();

  return NextResponse.json({
    payment: {
      id: payment.id,
      amount: payment.amount,
      reference: payment.reference ?? generateTransferReference(payment.id),
    },
    bankDetails,
  });
}
