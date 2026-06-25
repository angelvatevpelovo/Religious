"use client";

import { useRouter } from "next/navigation";
import { Locale } from "../lib/i18n";
import { setBrowserLocale, useLocale } from "../lib/useLocale";

export default function LanguageSwitcher() {
  const router = useRouter();
  const { locale, dictionary } = useLocale();

  function changeLanguage(nextLocale: Locale) {
    setBrowserLocale(nextLocale);
    router.refresh();
  }

  return (
    <div
      className="inline-flex items-center rounded-2xl border border-white/12 bg-white/[0.06] p-1"
      aria-label={dictionary.language.label}
    >
      {(["en", "bg"] as const).map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => changeLanguage(item)}
          className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
            locale === item
              ? "bg-[#D4AF37] text-[#071A2F]"
              : "text-[#CBD5E1] hover:bg-white/10 hover:text-[#F5D76E]"
          }`}
        >
          {item.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
