"use client";

import { useEffect, useState } from "react";
import { defaultLocale, dictionaries, Locale, normalizeLocale } from "./i18n";

const localeEventName = "religious-locale-change";

function readLocale() {
  if (typeof document === "undefined") return defaultLocale;

  const cookieValue = document.cookie
    .split("; ")
    .find((item) => item.startsWith("religious_locale="))
    ?.split("=")[1];

  return normalizeLocale(cookieValue);
}

export function setBrowserLocale(locale: Locale) {
  document.cookie = `religious_locale=${locale}; path=/; max-age=31536000; SameSite=Lax`;
  window.dispatchEvent(new Event(localeEventName));
}

export function useLocale() {
  const [locale, setLocale] = useState<Locale>(defaultLocale);

  useEffect(() => {
    function updateLocale() {
      setLocale(readLocale());
    }

    updateLocale();
    window.addEventListener(localeEventName, updateLocale);

    return () => {
      window.removeEventListener(localeEventName, updateLocale);
    };
  }, []);

  return {
    locale,
    dictionary: dictionaries[locale],
  };
}
