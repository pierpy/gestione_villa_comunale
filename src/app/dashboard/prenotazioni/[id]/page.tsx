import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getBookingDetailPayload } from "@/lib/bookings";
import BookingDetail from "@/components/BookingDetail";

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;
  const result = await getBookingDetailPayload(id);
  if (!result) notFound();

  const isOwner = result.userId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  if (!isOwner && !isAdmin) notFound();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <BookingDetail
        booking={result.booking}
        viewAs={isAdmin && !isOwner ? "admin" : "user"}
      />
    </div>
  );
}
