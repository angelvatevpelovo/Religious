import { cookies } from "next/headers";
import { defaultLocale, normalizeLocale } from "./i18n";

export async function getServerLocale() {
  const cookieStore = await cookies();
  return normalizeLocale(cookieStore.get("religious_locale")?.value ?? defaultLocale);
}
