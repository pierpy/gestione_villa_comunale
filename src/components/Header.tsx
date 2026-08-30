"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

const navLink =
  "px-3 py-2 rounded-md text-sm font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-700";
const navLinkActive = "bg-emerald-100 text-emerald-800";

export default function Header() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href;

  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur sticky top-0 z-20">
      <div className="mx-auto max-w-6xl px-4 flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold text-slate-900">
          <span className="text-2xl">🌳</span>
          <span>
            Villa Comunale
            <span className="block text-xs font-normal text-slate-500 -mt-1">
              Torre de&apos; Passeri
            </span>
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          <Link href="/campi/calcetto" className={`${navLink} ${isActive("/campi/calcetto") ? navLinkActive : ""}`}>
            Calcetto
          </Link>
          <Link href="/campi/padel" className={`${navLink} ${isActive("/campi/padel") ? navLinkActive : ""}`}>
            Padel
          </Link>
          <Link href="/campi/tennis" className={`${navLink} ${isActive("/campi/tennis") ? navLinkActive : ""}`}>
            Tennis
          </Link>

          {status === "authenticated" && (
            <Link href="/dashboard" className={`${navLink} ${isActive("/dashboard") ? navLinkActive : ""}`}>
              Le mie prenotazioni
            </Link>
          )}

          {session?.user.role === "ADMIN" && (
            <Link href="/admin" className={`${navLink} ${isActive("/admin") ? navLinkActive : ""}`}>
              Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {status === "loading" ? null : session ? (
            <>
              <span className="hidden sm:inline text-sm text-slate-600">
                Ciao, {session.user.name?.split(" ")[0]}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
              >
                Esci
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
              >
                Accedi
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700"
              >
                Registrati
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
