import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe, stripeEnabled } from "@/lib/stripe";
import { roundToCents } from "@/lib/pricing";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const { id } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { field: true },
  });

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

  const payment = await prisma.payment.create({
    data: {
      bookingId: booking.id,
      amount,
      type,
      status: "PENDING",
    },
  });

  if (stripeEnabled && stripe) {
    const origin = new URL(request.url).origin;
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: Math.round(amount * 100),
            product_data: {
              name: `${booking.field.name} - ${booking.date} ${booking.startTime}`,
              description: `Pagamento ${type.toLowerCase()} prenotazione`,
            },
          },
        },
      ],
      metadata: {
        bookingId: booking.id,
        paymentId: payment.id,
      },
      success_url: `${origin}/dashboard/prenotazioni/${booking.id}?payment=success`,
      cancel_url: `${origin}/dashboard/prenotazioni/${booking.id}?payment=cancelled`,
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: { stripeSessionId: checkoutSession.id },
    });

    return NextResponse.json({ checkoutUrl: checkoutSession.url });
  }

  const paidPayment = await prisma.payment.update({
    where: { id: payment.id },
    data: { status: "PAID", paidAt: new Date() },
  });

  const newAmountPaid = roundToCents(booking.amountPaid + paidPayment.amount);
  const updatedBooking = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      amountPaid: newAmountPaid,
      status: newAmountPaid >= booking.depositAmount ? "CONFIRMED" : booking.status,
    },
  });

  return NextResponse.json({ demo: true, booking: updatedBooking });
}
