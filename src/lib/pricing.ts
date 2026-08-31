export function computeTotalPrice(pricePerHour: number, durationHours: number) {
  return roundToCents(pricePerHour * durationHours);
}

export function computeDeposit(totalPrice: number, depositPercent: number) {
  return roundToCents((totalPrice * depositPercent) / 100);
}

export function roundToCents(amount: number) {
  return Math.round(amount * 100) / 100;
}

export function formatEuro(amount: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

export function addMinutesToTime(time: string, minutes: number) {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + Math.round(minutes);
  const hh = Math.floor(total / 60)
    .toString()
    .padStart(2, "0");
  const mm = (total % 60).toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

export function timeToMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function formatDuration(hours: number) {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

export type PaymentTypeOption = "ACCONTO" | "SALDO" | "INTERO";

interface PayableBooking {
  amountPaid: number;
  totalPrice: number;
  depositAmount: number;
}

/**
 * Determina l'importo da incassare per il tipo di pagamento richiesto,
 * in base a quanto è già stato pagato sulla prenotazione. Ritorna null
 * se il tipo non è valido nello stato attuale (es. SALDO prima di aver
 * versato l'acconto).
 */
export function computePaymentAmountForType(
  booking: PayableBooking,
  type: PaymentTypeOption | undefined
): number | null {
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
    return null;
  }

  return amount > 0 ? amount : null;
}
