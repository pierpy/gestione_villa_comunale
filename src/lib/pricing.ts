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
  const total = h * 60 + m + minutes;
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
