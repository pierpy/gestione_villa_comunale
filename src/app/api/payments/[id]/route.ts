import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { roundToCents } from "@/lib/pricing";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { id } = await params;
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: { booking: true },
  });

  if (!payment) {
    return NextResponse.json({ error: "Pagamento non trovato" }, { status: 404 });
  }

  if (payment.status !== "PENDING") {
    return NextResponse.json(
      { error: "Questo pagamento è già stato gestito" },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const action = body.action as "confirm" | "reject" | undefined;

  if (action === "reject") {
    const updated = await prisma.payment.update({
      where: { id },
      data: { status: "FAILED" },
    });
    return NextResponse.json({ payment: updated });
  }

  if (action === "confirm") {
    const updated = await prisma.payment.update({
      where: { id },
      data: { status: "PAID", paidAt: new Date() },
    });

    const newAmountPaid = roundToCents(payment.booking.amountPaid + payment.amount);
    const updatedBooking = await prisma.booking.update({
      where: { id: payment.bookingId },
      data: {
        amountPaid: newAmountPaid,
        status:
          newAmountPaid >= payment.booking.depositAmount
            ? "CONFIRMED"
            : payment.booking.status,
      },
    });

    return NextResponse.json({ payment: updated, booking: updatedBooking });
  }

  return NextResponse.json({ error: "Operazione non valida" }, { status: 400 });
}
