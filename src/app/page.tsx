import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatEuro } from "@/lib/pricing";

export const dynamic = "force-dynamic";

const FIELD_META: Record<
  string,
  { emoji: string; href: string; blurb: string }
> = {
  CALCETTO: {
    emoji: "⚽",
    href: "/campi/calcetto",
    blurb: "Campo a 5 in erba sintetica con illuminazione notturna.",
  },
  PADEL: {
    emoji: "🎾",
    href: "/campi/padel",
    blurb: "Campo da padel coperto con pareti in vetro.",
  },
  TENNIS: {
    emoji: "🏸",
    href: "/campi/tennis",
    blurb: "Campo da tennis in terra rossa.",
  },
};

export default async function Home() {
  const fields = await prisma.field.findMany({ orderBy: { type: "asc" } });

  return (
    <div>
      <section className="bg-gradient-to-b from-emerald-50 to-slate-50 py-16">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Prenota i campi della Villa Comunale
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            Calcetto, padel e tennis a Torre de&apos; Passeri. Scegli lo
            slot libero, versa l&apos;acconto online e scendi in campo.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-6 sm:grid-cols-3">
          {fields.map((field) => {
            const meta = FIELD_META[field.type];
            return (
              <Link
                key={field.id}
                href={meta.href}
                className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="text-4xl">{meta.emoji}</div>
                <h2 className="mt-4 text-xl font-semibold text-slate-900">
                  {field.name}
                </h2>
                <p className="mt-2 text-sm text-slate-600">{meta.blurb}</p>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="font-medium text-emerald-700">
                    {formatEuro(field.pricePerHour)} / ora
                  </span>
                  <span className="text-slate-400 group-hover:text-emerald-600">
                    Vai al calendario →
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Acconto richiesto: {field.depositPercent}% del totale
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-16">
        <div className="rounded-2xl border border-slate-200 bg-white p-8">
          <h2 className="text-lg font-semibold text-slate-900">Come funziona</h2>
          <ol className="mt-4 space-y-2 text-sm text-slate-600 list-decimal list-inside">
            <li>Registrati o accedi con il tuo account.</li>
            <li>Scegli il campo e uno slot libero dal calendario.</li>
            <li>Versa l&apos;acconto (o l&apos;intero importo) online per confermare.</li>
            <li>
              Ricevi conferma e resta in contatto con gli amministratori
              direttamente dalla tua area prenotazioni.
            </li>
          </ol>
        </div>
      </section>
    </div>
  );
}
