import { prisma } from "@/lib/prisma";
import type { BookingDetailData } from "@/components/BookingDetail";

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
        status: p.status,
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
