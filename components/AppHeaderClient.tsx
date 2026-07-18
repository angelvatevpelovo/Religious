"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import AuthButton from "./AuthButton";
import LanguageSwitcher from "./LanguageSwitcher";
import { useLocale } from "../lib/useLocale";

type MenuLink = {
  href: string;
  label: string;
};

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function navLinkClass(active: boolean) {
  return `hidden rounded-2xl border px-3 py-2 text-sm font-semibold transition sm:inline-flex ${
    active
      ? "border-[#D4AF37]/45 bg-[#D4AF37]/10 text-[#F5D76E] shadow-lg shadow-[#D4AF37]/10"
      : "border-transparent text-[#CBD5E1] hover:border-[#D4AF37]/50 hover:bg-white/[0.06] hover:text-[#F5D76E]"
  }`;
}

function menuLinkClass(active: boolean) {
  return `rounded-2xl px-3 py-2.5 text-sm font-semibold transition ${
    active
      ? "bg-[#D4AF37]/10 text-[#F5D76E]"
      : "text-[#CBD5E1] hover:bg-white/[0.07] hover:text-[#F5D76E]"
  }`;
}

export default function AppHeaderClient() {
  const { dictionary } = useLocale();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const menuGroups: Array<{ title: string; links: MenuLink[] }> = [
    {
      title: "Main",
      links: [
        { href: "/book", label: "Holy Books" },
        { href: "/search", label: dictionary.nav.search },
        { href: "/temples", label: dictionary.nav.temples },
        { href: "/ai", label: "AI Guide" },
      ],
    },
    {
      title: "Personal",
      links: [
        { href: "/favorites", label: "Favorites" },
        { href: "/ai-history", label: "AI History" },
        { href: "/profile", label: dictionary.nav.profile },
        { href: "/reminders", label: dictionary.nav.reminders },
      ],
    },
    {
      title: "Info",
      links: [
        { href: "/about", label: "About" },
        { href: "/privacy", label: "Privacy" },
        { href: "/terms", label: "Terms" },
      ],
    },
  ];

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

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
            className={navLinkClass(isActivePath(pathname, "/book"))}
          >
            Holy Books
          </Link>
          <Link
            href="/search"
            className={navLinkClass(isActivePath(pathname, "/search"))}
          >
            {dictionary.nav.search}
          </Link>

          <div className="hidden md:block">
            <AuthButton />
          </div>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsOpen((value) => !value)}
              className={`rounded-2xl border px-4 py-2 text-sm font-bold transition ${
                isOpen
                  ? "border-[#D4AF37]/45 bg-[#D4AF37]/10 text-[#F5D76E]"
                  : "border-white/12 bg-white/[0.06] text-[#F8FAFC] hover:border-[#D4AF37]/45 hover:bg-white/[0.1] hover:text-[#F5D76E]"
              }`}
              aria-expanded={isOpen}
              aria-controls="site-menu"
            >
              Menu
            </button>

            {isOpen && (
              <div
                id="site-menu"
                className="absolute right-0 mt-3 max-h-[calc(100vh-7rem)] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-[1.5rem] border border-[#D4AF37]/20 bg-[#071A2F]/96 p-3 shadow-2xl shadow-black/45 backdrop-blur-2xl"
              >
                <div className="grid gap-4">
                  {menuGroups.map((group) => (
                    <div key={group.title}>
                      <p className="px-3 text-[11px] font-black uppercase tracking-[0.2em] text-[#F5D76E]/80">
                        {group.title}
                      </p>
                      <div className="mt-2 grid gap-1">
                        {group.links.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setIsOpen(false)}
                            className={menuLinkClass(isActivePath(pathname, item.href))}
                          >
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 border-t border-white/10 pt-3">
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
