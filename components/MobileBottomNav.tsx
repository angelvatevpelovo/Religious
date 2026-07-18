"use client";

import Link from "next/link";
import { useState } from "react";
import LanguageSwitcher from "./LanguageSwitcher";
import { useLocale } from "../lib/useLocale";

export default function MobileBottomNav() {
  const { dictionary } = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const primaryItems = [
    { href: "/", label: dictionary.nav.home, short: dictionary.nav.home },
    { href: "/book", label: dictionary.nav.books, short: dictionary.nav.books },
    { href: "/search", label: dictionary.nav.search, short: dictionary.nav.search },
  ];
  const secondaryItems = [
    { href: "/temples", label: dictionary.nav.temples },
    { href: "/ai", label: dictionary.nav.assistant, short: dictionary.nav.ai },
    { href: "/favorites", label: "Favorites" },
    { href: "/ai-history", label: "AI History" },
    { href: "/reminders", label: dictionary.nav.reminders },
    { href: "/profile", label: dictionary.nav.profile, short: dictionary.nav.profile },
    { href: "/about", label: "About" },
    { href: "/privacy", label: "Privacy" },
    { href: "/terms", label: "Terms" },
  ];

  return (
    <nav className="fixed inset-x-3 bottom-3 z-[1000] md:hidden">
      {isOpen && (
        <div className="mb-3 rounded-[1.5rem] border border-white/12 bg-[#071A2F]/95 p-3 shadow-2xl shadow-black/40 backdrop-blur-2xl">
          <div className="grid grid-cols-2 gap-1">
            {secondaryItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                aria-label={item.label}
                className="rounded-2xl px-3 py-2.5 text-sm font-semibold text-[#CBD5E1] transition hover:bg-white/[0.07] hover:text-[#F5D76E]"
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="mt-3 flex justify-center border-t border-white/10 pt-3">
            <LanguageSwitcher />
          </div>
        </div>
      )}

      <div className="rounded-[1.75rem] border border-white/12 bg-[#071A2F]/92 px-2 py-2 shadow-2xl shadow-black/35 backdrop-blur-xl">
        <div className="grid grid-cols-4 gap-1">
        {primaryItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setIsOpen(false)}
            aria-label={item.label}
            className="rounded-2xl px-1.5 py-2.5 text-center text-[11px] font-bold text-[#CBD5E1] transition hover:bg-white/10 hover:text-[#F5D76E]"
          >
            {item.short}
          </Link>
        ))}
          <button
            type="button"
            onClick={() => setIsOpen((value) => !value)}
            aria-expanded={isOpen}
            className="rounded-2xl px-1.5 py-2.5 text-center text-[11px] font-bold text-[#F5D76E] transition hover:bg-white/10"
          >
            Menu
          </button>
        </div>
      </div>
    </nav>
  );
}
