import { notFound } from "next/navigation";
import Link from "next/link";
import { getBookingDetailPayload } from "@/lib/bookings";
import BookingDetail from "@/components/BookingDetail";

export default async function AdminBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getBookingDetailPayload(id);
  if (!result) notFound();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Link href="/admin" className="text-sm text-emerald-700 hover:underline">
        ← Torna al pannello admin
      </Link>
      <div className="mt-4">
        <BookingDetail booking={result.booking} viewAs="admin" />
      </div>
    </div>
  );
}
