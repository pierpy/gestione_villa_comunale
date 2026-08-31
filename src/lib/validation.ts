import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Il nome deve avere almeno 2 caratteri"),
  email: z.string().trim().toLowerCase().email("Email non valida"),
  phone: z
    .string()
    .trim()
    .min(6, "Numero di telefono non valido")
    .optional()
    .or(z.literal("")),
  password: z.string().min(6, "La password deve avere almeno 6 caratteri"),
});

export const bookingSchema = z.object({
  fieldId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data non valida"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Orario non valido"),
  durationHours: z.number().min(0.1).max(6),
  notes: z.string().max(500).optional().or(z.literal("")),
});

export const messageSchema = z.object({
  bookingId: z.string().min(1),
  body: z.string().trim().min(1, "Il messaggio non può essere vuoto").max(2000),
});
