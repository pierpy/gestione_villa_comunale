export const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "In attesa di pagamento",
  CONFIRMED: "Confermata",
  CANCELLED: "Annullata",
  COMPLETED: "Conclusa",
};

export const STATUS_STYLES: Record<string, string> = {
  PENDING_PAYMENT: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-red-100 text-red-800",
  COMPLETED: "bg-slate-200 text-slate-700",
};

export const FIELD_TYPE_LABELS: Record<string, string> = {
  CALCETTO: "Calcetto",
  PADEL: "Padel",
  TENNIS: "Tennis",
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  STRIPE: "Carta (online)",
  BONIFICO: "Bonifico bancario",
  CONTANTI: "Contanti",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "In attesa",
  PAID: "Pagato",
  FAILED: "Rifiutato",
  REFUNDED: "Rimborsato",
};
