export const bankTransferEnabled = Boolean(process.env.BANK_IBAN);

export interface BankDetails {
  iban: string;
  intestatario: string;
  istituto: string | null;
}

export function getBankDetails(): BankDetails | null {
  if (!bankTransferEnabled) return null;
  return {
    iban: process.env.BANK_IBAN as string,
    intestatario: process.env.BANK_INTESTATARIO || "Villa Comunale di Torre de' Passeri",
    istituto: process.env.BANK_ISTITUTO || null,
  };
}

export function generateTransferReference(paymentId: string) {
  return `VC-${paymentId.slice(-8).toUpperCase()}`;
}
