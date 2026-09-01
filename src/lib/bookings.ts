import { prisma } from "@/lib/prisma";
import type { BookingDetailData } from "@/components/BookingDetail";
import { stripe, stripeEnabled } from "@/lib/stripe";
import { roundToCents } from "@/lib/pricing";

// Una prenotazione senza alcun pagamento reale viene annullata dopo questo
// tempo, liberando lo slot. Un bonifico dichiarato ha bisogno di più tempo
// per arrivare davvero sul conto, quindi ottiene una tolleranza molto più
// ampia prima di essere considerato abbandonato.
const UNPAID_BOOKING_GRACE_MINUTES = 30;
const PENDING_BONIFICO_GRACE_HOURS = 48;

/**
 * Annulla automaticamente le prenotazioni rimaste "in attesa di pagamento"
 * senza che sia mai arrivato un pagamento reale, liberando lo slot per
 * altri utenti. Non esiste un job pianificato nell'hosting gratuito, quindi
 * questa funzione viene invocata "a richiesta" (lazy) ogni volta che si
 * legge il calendario o l'elenco prenotazioni: è sufficiente perché in
 * pratica ogni pagina caricata da qualcuno la attiva.
 */
export async function expireStaleBookings() {
  const now = Date.now();
  const unpaidThreshold = new Date(now - UNPAID_BOOKING_GRACE_MINUTES * 60 * 1000);
  const bonificoThreshold = new Date(now - PENDING_BONIFICO_GRACE_HOURS * 60 * 60 * 1000);

  const candidates = await prisma.booking.findMany({
    where: {
      status: "PENDING_PAYMENT",
      amountPaid: 0,
      createdAt: { lt: unpaidThreshold },
    },
    select: {
      id: true,
      createdAt: true,
      payments: { where: { status: "PENDING" }, select: { method: true } },
    },
  });

  const idsToExpire = candidates
    .filter((booking) => {
      const hasPendingBonifico = booking.payments.some((p) => p.method === "BONIFICO");
      return !hasPendingBonifico || booking.createdAt < bonificoThreshold;
    })
    .map((booking) => booking.id);

  if (idsToExpire.length === 0) return;

  await prisma.$transaction([
    prisma.booking.updateMany({
      where: { id: { in: idsToExpire } },
      data: { status: "CANCELLED" },
    }),
    prisma.payment.updateMany({
      where: { bookingId: { in: idsToExpire }, status: "PENDING" },
      data: { status: "FAILED" },
    }),
  ]);
}

/**
 * Segna un pagamento Stripe come riuscito e aggiorna la prenotazione di
 * conseguenza (usata sia dal webhook sia dal controllo di riserva qui sotto,
 * così la stessa logica non è duplicata in due punti).
 */
export async function confirmStripePayment(paymentId: string, bookingId: string) {
  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId } });
    if (!payment || payment.status === "PAID") return;

    await tx.payment.update({
      where: { id: paymentId },
      data: { status: "PAID", paidAt: new Date() },
    });

    const booking = await tx.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return;

    const newAmountPaid = roundToCents(booking.amountPaid + payment.amount);
    await tx.booking.update({
      where: { id: bookingId },
      data: {
        amountPaid: newAmountPaid,
        status: newAmountPaid >= booking.depositAmount ? "CONFIRMED" : booking.status,
      },
    });
  });
}

/**
 * Se il webhook di Stripe non è configurato correttamente (endpoint mancante
 * o segreto errato su Vercel) oppure non è ancora arrivato, un pagamento può
 * risultare riuscito su Stripe ma la prenotazione resta "in attesa di
 * pagamento". Come rete di sicurezza, ogni volta che si apre il dettaglio di
 * una prenotazione controlliamo direttamente su Stripe lo stato delle
 * sessioni di pagamento ancora in sospeso.
 */
export async function reconcileStripePayments(bookingId: string) {
  if (!stripeEnabled || !stripe) return;

  const pendingPayments = await prisma.payment.findMany({
    where: {
      bookingId,
      method: "STRIPE",
      status: "PENDING",
      stripeSessionId: { not: null },
    },
  });

  for (const payment of pendingPayments) {
    try {
      const checkoutSession = await stripe.checkout.sessions.retrieve(
        payment.stripeSessionId as string
      );
      if (checkoutSession.payment_status === "paid") {
        await confirmStripePayment(payment.id, bookingId);
      }
    } catch {
      // Sessione non trovata o errore di rete verso Stripe: il pagamento
      // resta in sospeso, verrà ricontrollato al prossimo caricamento.
    }
  }
}

export async function getBookingDetailPayload(
  id: string
): Promise<{ booking: BookingDetailData; userId: string } | null> {
  await reconcileStripePayments(id);

  const booking = await prisma.booking.findUnique({
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

  if (!booking) return null;

  return {
    userId: booking.userId,
    booking: {
      id: booking.id,
      date: booking.date,
      startTime: booking.startTime,
      endTime: booking.endTime,
      durationHours: booking.durationHours,
      totalPrice: booking.totalPrice,
      depositAmount: booking.depositAmount,
      amountPaid: booking.amountPaid,
      status: booking.status,
      notes: booking.notes,
      field: { name: booking.field.name, type: booking.field.type },
      user: booking.user,
      payments: booking.payments.map((p) => ({
        id: p.id,
        amount: p.amount,
        type: p.type,
        method: p.method,
        status: p.status,
        reference: p.reference,
        createdAt: p.createdAt.toISOString(),
      })),
      messages: booking.messages.map((m) => ({
        id: m.id,
        body: m.body,
        createdAt: m.createdAt.toISOString(),
        fromAdmin: m.fromAdmin,
        sender: m.sender,
      })),
    },
  };
}
