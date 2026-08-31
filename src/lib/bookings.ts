import { prisma } from "@/lib/prisma";
import type { BookingDetailData } from "@/components/BookingDetail";

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

export async function getBookingDetailPayload(
  id: string
): Promise<{ booking: BookingDetailData; userId: string } | null> {
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
