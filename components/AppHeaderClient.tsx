"use client";

import Link from "next/link";
import AuthButton from "./AuthButton";
import LanguageSwitcher from "./LanguageSwitcher";
import { useLocale } from "../lib/useLocale";

export default function AppHeaderClient() {
  const { dictionary } = useLocale();

  const navLinks = [
    { href: "/search", label: dictionary.nav.search },
    { href: "/book", label: dictionary.nav.books },
    { href: "/temples", label: dictionary.nav.temples },
    { href: "/calendar", label: dictionary.nav.calendar },
    { href: "/ai", label: dictionary.nav.assistant },
    { href: "/reminders", label: dictionary.nav.reminders },
    { href: "/profile", label: dictionary.nav.profile },
  ];

  return (
    <header className="sticky top-4 z-[900] mb-10 hidden rounded-[1.75rem] border border-white/12 bg-[#071A2F]/78 px-4 py-3 shadow-2xl shadow-black/20 backdrop-blur-xl md:block">
      <div className="flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#D4AF37]/40 bg-[#D4AF37]/10 text-sm font-black text-[#F5D76E]">
            R
          </span>
          <span className="text-lg font-bold tracking-normal text-[#F8FAFC]">
            RELIGIOUS
          </span>
        </Link>

        <nav className="flex flex-wrap items-center justify-end gap-2">
          {navLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-2xl border border-transparent px-3 py-2 text-sm font-semibold text-[#CBD5E1] transition hover:border-[#D4AF37]/50 hover:bg-white/[0.06] hover:text-[#F5D76E]"
            >
              {item.label}
            </Link>
          ))}
          <LanguageSwitcher />
          <AuthButton />
        </nav>
      </div>
    </header>
  );
}
