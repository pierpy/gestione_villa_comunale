import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { roundToCents } from "@/lib/pricing";

export async function POST(request: Request) {
  if (!stripe) {
    return NextResponse.json({ error: "Stripe non configurato" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    if (webhookSecret && signature) {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } else {
      event = JSON.parse(rawBody) as Stripe.Event;
    }
  } catch {
    return NextResponse.json({ error: "Firma webhook non valida" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const checkoutSession = event.data.object as Stripe.Checkout.Session;
    const paymentId = checkoutSession.metadata?.paymentId;
    const bookingId = checkoutSession.metadata?.bookingId;

    if (paymentId && bookingId) {
      const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
      if (payment && payment.status !== "PAID") {
        await prisma.payment.update({
          where: { id: paymentId },
          data: { status: "PAID", paidAt: new Date() },
        });

        const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
        if (booking) {
          const newAmountPaid = roundToCents(booking.amountPaid + payment.amount);
          await prisma.booking.update({
            where: { id: bookingId },
            data: {
              amountPaid: newAmountPaid,
              status:
                newAmountPaid >= booking.depositAmount ? "CONFIRMED" : booking.status,
            },
          });
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
