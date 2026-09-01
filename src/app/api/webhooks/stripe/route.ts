import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { confirmStripePayment } from "@/lib/bookings";

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
      await confirmStripePayment(paymentId, bookingId);
    }
  }

  return NextResponse.json({ received: true });
}
