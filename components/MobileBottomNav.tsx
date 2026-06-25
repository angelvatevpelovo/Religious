"use client";

import Link from "next/link";
import LanguageSwitcher from "./LanguageSwitcher";
import { useLocale } from "../lib/useLocale";


export default function MobileBottomNav() {
  const { dictionary } = useLocale();
  const navItems = [
    { href: "/", label: dictionary.nav.home, short: dictionary.nav.home },
    { href: "/book", label: dictionary.nav.books, short: dictionary.nav.books },
    { href: "/temples", label: dictionary.nav.temples, short: dictionary.nav.places },
    { href: "/calendar", label: dictionary.nav.calendar, short: dictionary.nav.days },
    { href: "/assistant", label: dictionary.nav.assistant, short: dictionary.nav.ai },
    { href: "/reminders", label: dictionary.nav.reminders, short: dictionary.nav.remind },
    { href: "/profile", label: dictionary.nav.profile, short: dictionary.nav.profile },
    { href: "/search", label: dictionary.nav.search, short: dictionary.nav.search },
  ];

  return (
    <nav className="fixed inset-x-3 bottom-3 z-[1000] rounded-[1.75rem] border border-white/12 bg-[#071A2F]/92 px-2 py-2 shadow-2xl shadow-black/35 backdrop-blur-xl md:hidden">
      <div className="mb-1 flex justify-center">
        <LanguageSwitcher />
      </div>
      <div className="grid grid-cols-4 gap-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-label={item.label}
            className="rounded-2xl px-1.5 py-2.5 text-center text-[11px] font-bold text-[#CBD5E1] transition hover:bg-white/10 hover:text-[#F5D76E]"
          >
            {item.short}
          </Link>
        ))}
      </div>
    </nav>
  );
}
