import type { Metadata } from "next";
import { PageShell } from "../../components/DesignSystem";
import { supabase } from "../../lib/supabase";
import SearchClient, { type SearchBookFilter } from "./SearchClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sacred Texts Search",
  description:
    "Search passages across sacred texts and holy books in the RELIGIOUS library.",
  alternates: {
    canonical: "/search",
  },
};

export default async function SearchPage() {
  const { data: booksData, error } = await supabase
    .from("holy_books")
    .select("id, title, religion, tradition, language, translator, text_type")
    .order("religion", { ascending: true, nullsFirst: false })
    .order("title", { ascending: true });

  if (error) {
    console.log("Search filter books error:", error);
  }

  return (
    <PageShell className="search-shell relative overflow-hidden">
      <div className="search-atmosphere pointer-events-none absolute inset-0" />
      <SearchClient books={(booksData ?? []) as SearchBookFilter[]} />
    </PageShell>
  );
}
