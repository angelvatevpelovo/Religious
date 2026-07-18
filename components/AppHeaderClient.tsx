"use client";

import Link from "next/link";
import { useState } from "react";
import AuthButton from "./AuthButton";
import LanguageSwitcher from "./LanguageSwitcher";
import { useLocale } from "../lib/useLocale";

export default function AppHeaderClient() {
  const { dictionary } = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const secondaryLinks = [
    { href: "/temples", label: dictionary.nav.temples },
    { href: "/ai", label: "AI Guide" },
    { href: "/favorites", label: "Favorites" },
    { href: "/ai-history", label: "AI History" },
    { href: "/reminders", label: dictionary.nav.reminders },
    { href: "/about", label: "About" },
    { href: "/privacy", label: "Privacy" },
    { href: "/terms", label: "Terms" },
    { href: "/profile", label: dictionary.nav.profile },
  ];

  return (
    <header className="sticky top-3 z-[900] mb-8 rounded-[1.5rem] border border-white/12 bg-[#071A2F]/78 px-3 py-3 shadow-2xl shadow-black/20 backdrop-blur-xl sm:px-4">
      <div className="flex items-center justify-between gap-3">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#D4AF37]/40 bg-[#D4AF37]/10 text-sm font-black text-[#F5D76E] shadow-lg shadow-[#D4AF37]/10">
            R
          </span>
          <span className="truncate text-lg font-black tracking-normal text-[#F8FAFC]">
            RELIGIOUS
          </span>
        </Link>

        <nav className="flex items-center justify-end gap-2">
          <Link
            href="/book"
            className="hidden rounded-2xl border border-transparent px-3 py-2 text-sm font-semibold text-[#CBD5E1] transition hover:border-[#D4AF37]/50 hover:bg-white/[0.06] hover:text-[#F5D76E] sm:inline-flex"
          >
            Holy Books
          </Link>
          <Link
            href="/search"
            className="hidden rounded-2xl border border-transparent px-3 py-2 text-sm font-semibold text-[#CBD5E1] transition hover:border-[#D4AF37]/50 hover:bg-white/[0.06] hover:text-[#F5D76E] sm:inline-flex"
          >
            {dictionary.nav.search}
          </Link>

          <div className="hidden md:block">
            <AuthButton />
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setIsOpen((value) => !value)}
              className="rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-bold text-[#F8FAFC] transition hover:border-[#D4AF37]/45 hover:bg-white/[0.1] hover:text-[#F5D76E]"
              aria-expanded={isOpen}
              aria-controls="site-menu"
            >
              Menu
            </button>

            {isOpen && (
              <div
                id="site-menu"
                className="absolute right-0 mt-3 w-[min(20rem,calc(100vw-2rem))] rounded-[1.5rem] border border-white/12 bg-[#071A2F]/95 p-3 shadow-2xl shadow-black/40 backdrop-blur-2xl"
              >
                <div className="grid gap-1">
                  <Link
                    href="/book"
                    onClick={() => setIsOpen(false)}
                    className="rounded-2xl px-3 py-2.5 text-sm font-semibold text-[#CBD5E1] transition hover:bg-white/[0.07] hover:text-[#F5D76E] sm:hidden"
                  >
                    Holy Books
                  </Link>
                  <Link
                    href="/search"
                    onClick={() => setIsOpen(false)}
                    className="rounded-2xl px-3 py-2.5 text-sm font-semibold text-[#CBD5E1] transition hover:bg-white/[0.07] hover:text-[#F5D76E] sm:hidden"
                  >
                    {dictionary.nav.search}
                  </Link>
                  {secondaryLinks.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className="rounded-2xl px-3 py-2.5 text-sm font-semibold text-[#CBD5E1] transition hover:bg-white/[0.07] hover:text-[#F5D76E]"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
                <div className="mt-3 border-t border-white/10 pt-3">
                  <LanguageSwitcher />
                </div>
                <div className="mt-3 border-t border-white/10 pt-3 md:hidden">
                  <AuthButton />
                </div>
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
