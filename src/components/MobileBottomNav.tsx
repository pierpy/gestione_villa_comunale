"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import type { ReactNode } from "react";

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9a1 1 0 0 0 1 1h3v-6h4v6h3a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

function BallIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8.2 15.2 10.6 14 14.4h-4l-1.2-3.8Z" />
      <path d="M12 8.2V5.2M15.2 10.6l2.9-1M14 14.4l1.2 2.8M10 14.4l-1.2 2.8M8.8 10.6l-2.9-1" />
    </svg>
  );
}

function PaddleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="5.5" y="3" width="11" height="12" rx="5.5" fill="currentColor" stroke="none" />
      <path d="M11 15v4.3M8.3 21h5.4" />
    </svg>
  );
}

function RacquetIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="8" r="6" />
      <path d="M11 3v10M6.2 8h9.6" />
      <path d="M11 14v4.3M8.3 21h5.4" />
    </svg>
  );
}

function TicketIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1.2a1.6 1.6 0 0 0 0 3.1V13.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-1.2a1.6 1.6 0 0 0 0-3.1Z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3.5 19 6v5.5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function LoginIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h5" />
      <path d="M15 8l4 4-4 4M9 12h10" />
    </svg>
  );
}

interface Tab {
  href: string;
  label: string;
  icon: ReactNode;
  match: (path: string) => boolean;
}

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const lastTab: Tab =
    session?.user.role === "ADMIN"
      ? {
          href: "/admin",
          label: "Admin",
          icon: <ShieldIcon />,
          match: (p) => p.startsWith("/admin"),
        }
      : session
      ? {
          href: "/dashboard",
          label: "Prenotazioni",
          icon: <TicketIcon />,
          match: (p) => p.startsWith("/dashboard"),
        }
      : {
          href: "/login",
          label: "Accedi",
          icon: <LoginIcon />,
          match: (p) => p === "/login" || p === "/register",
        };

  const tabs: Tab[] = [
    { href: "/", label: "Home", icon: <HomeIcon />, match: (p) => p === "/" },
    {
      href: "/campi/calcetto",
      label: "Calcetto",
      icon: <BallIcon />,
      match: (p) => p === "/campi/calcetto",
    },
    {
      href: "/campi/padel",
      label: "Padel",
      icon: <PaddleIcon />,
      match: (p) => p === "/campi/padel",
    },
    {
      href: "/campi/tennis",
      label: "Tennis",
      icon: <RacquetIcon />,
      match: (p) => p === "/campi/tennis",
    },
    lastTab,
  ];

  return (
    <nav className="md:hidden fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-safe backdrop-blur">
      <div className="mx-auto flex max-w-6xl">
        {tabs.map((tab) => {
          const active = tab.match(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px]"
            >
              <span
                className={`flex h-6 w-6 items-center justify-center ${
                  active ? "text-emerald-600" : "text-slate-400"
                }`}
              >
                {tab.icon}
              </span>
              <span className={active ? "font-medium text-emerald-700" : "text-slate-500"}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
