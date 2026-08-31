import { PrismaClient, FieldType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const fields: Array<{
    type: FieldType;
    name: string;
    description: string;
    pricePerHour: number;
    depositPercent: number;
    slotMinutes: number;
  }> = [
    {
      type: "CALCETTO",
      name: "Campo di Calcetto",
      description: "Campo a 5 in erba sintetica, illuminazione notturna.",
      pricePerHour: 30,
      depositPercent: 30,
      slotMinutes: 15,
    },
    {
      type: "PADEL",
      name: "Campo di Padel",
      description: "Campo da padel coperto con pareti in vetro.",
      pricePerHour: 20,
      depositPercent: 30,
      slotMinutes: 15,
    },
    {
      type: "TENNIS",
      name: "Campo di Tennis",
      description: "Campo da tennis in terra rossa.",
      pricePerHour: 15,
      depositPercent: 30,
      slotMinutes: 15,
    },
  ];

  for (const field of fields) {
    await prisma.field.upsert({
      where: { type: field.type },
      // Solo slotMinutes viene risincronizzato sui campi già esistenti:
      // gli altri valori (prezzo, descrizione...) restano quelli attuali
      // nel database, così eventuali modifiche manuali non vengono perse.
      update: { slotMinutes: field.slotMinutes },
      create: field,
    });
  }

  const adminEmail = process.env.ADMIN_EMAIL || "admin@villacomunale.it";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin1234";

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: "Amministratore",
      email: adminEmail,
      passwordHash,
      role: "ADMIN",
    },
  });

  console.log("Seed completato.");
  console.log(`Admin: ${adminEmail} / ${adminPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
