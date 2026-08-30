"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

const navLink =
  "block px-3 py-2 rounded-md text-sm font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-700";
const navLinkActive = "bg-emerald-100 text-emerald-800";

export default function Header() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string) => pathname === href;

  const navItems = [
    { href: "/campi/calcetto", label: "Calcetto" },
    { href: "/campi/padel", label: "Padel" },
    { href: "/campi/tennis", label: "Tennis" },
    ...(status === "authenticated"
      ? [{ href: "/dashboard", label: "Le mie prenotazioni" }]
      : []),
    ...(session?.user.role === "ADMIN" ? [{ href: "/admin", label: "Admin" }] : []),
  ];

  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur sticky top-0 z-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex h-16 items-center justify-between gap-2">
          <Link
            href="/"
            onClick={() => setMenuOpen(false)}
            className="flex min-w-0 items-center gap-2 font-semibold text-slate-900"
          >
            <span className="shrink-0 text-2xl">🌳</span>
            <span className="truncate">
              Villa Comunale
              <span className="block text-xs font-normal text-slate-500 -mt-1">
                Torre de&apos; Passeri
              </span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`${navLink} ${isActive(item.href) ? navLinkActive : ""}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            {status === "loading" ? null : session ? (
              <>
                <span className="text-sm text-slate-600">
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

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Chiudi menu" : "Apri menu"}
            className="md:hidden flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-300 text-slate-700"
          >
            {menuOpen ? (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6l-12 12" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            )}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-slate-200 py-3">
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`${navLink} ${isActive(item.href) ? navLinkActive : ""}`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3">
              {status === "loading" ? null : session ? (
                <>
                  <span className="px-3 text-sm text-slate-600">
                    Ciao, {session.user.name?.split(" ")[0]}
                  </span>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      signOut({ callbackUrl: "/" });
                    }}
                    className="mx-3 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
                  >
                    Esci
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMenuOpen(false)}
                    className="mx-3 rounded-md border border-slate-300 px-3 py-1.5 text-center text-sm text-slate-700 hover:bg-slate-100"
                  >
                    Accedi
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMenuOpen(false)}
                    className="mx-3 rounded-md bg-emerald-600 px-3 py-1.5 text-center text-sm text-white hover:bg-emerald-700"
                  >
                    Registrati
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
