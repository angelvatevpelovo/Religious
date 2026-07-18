"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import LanguageSwitcher from "./LanguageSwitcher";
import { useLocale } from "../lib/useLocale";

type NavItem = {
  href: string;
  label: string;
  short?: string;
};

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function bottomItemClass(active: boolean) {
  return `rounded-2xl px-1.5 py-2.5 text-center text-[11px] font-bold transition ${
    active
      ? "bg-[#D4AF37]/10 text-[#F5D76E]"
      : "text-[#CBD5E1] hover:bg-white/10 hover:text-[#F5D76E]"
  }`;
}

function menuLinkClass(active: boolean) {
  return `rounded-2xl px-3 py-2.5 text-sm font-semibold transition ${
    active
      ? "bg-[#D4AF37]/10 text-[#F5D76E]"
      : "text-[#CBD5E1] hover:bg-white/[0.07] hover:text-[#F5D76E]"
  }`;
}

export default function MobileBottomNav() {
  const { dictionary } = useLocale();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const primaryItems: NavItem[] = [
    { href: "/", label: dictionary.nav.home, short: dictionary.nav.home },
    { href: "/book", label: dictionary.nav.books, short: dictionary.nav.books },
    { href: "/search", label: dictionary.nav.search, short: dictionary.nav.search },
  ];

  const menuGroups: Array<{ title: string; links: NavItem[] }> = [
    {
      title: "Main",
      links: [
        { href: "/temples", label: dictionary.nav.temples },
        { href: "/ai", label: dictionary.nav.assistant },
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
    <nav className="fixed inset-x-3 bottom-3 z-[1000] md:hidden" ref={menuRef}>
      {isOpen && (
        <div className="mb-3 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-[1.5rem] border border-[#D4AF37]/20 bg-[#071A2F]/96 p-3 shadow-2xl shadow-black/45 backdrop-blur-2xl">
          <div className="grid gap-4">
            {menuGroups.map((group) => (
              <div key={group.title}>
                <p className="px-3 text-[11px] font-black uppercase tracking-[0.2em] text-[#F5D76E]/80">
                  {group.title}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-1">
                  {group.links.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      aria-label={item.label}
                      className={menuLinkClass(isActivePath(pathname, item.href))}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
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
              className={bottomItemClass(isActivePath(pathname, item.href))}
            >
              {item.short}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => setIsOpen((value) => !value)}
            aria-expanded={isOpen}
            className={`rounded-2xl px-1.5 py-2.5 text-center text-[11px] font-bold transition ${
              isOpen
                ? "bg-[#D4AF37]/10 text-[#F5D76E]"
                : "text-[#F5D76E] hover:bg-white/10"
            }`}
          >
            Menu
          </button>
        </div>
      </div>
    </nav>
  );
}
