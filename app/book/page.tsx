import type { Metadata } from "next";
import { BackLink, PageShell } from "../../components/DesignSystem";
import { supabase } from "../../lib/supabase";
import BookLibraryClient, { type SacredBook } from "./BookLibraryClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sacred Texts Library",
  description:
    "Explore holy books and sacred writings from religious traditions across humanity in RELIGIOUS.",
  alternates: {
    canonical: "/book",
  },
};

export default async function BooksPage() {
  const { data: books, error } = await supabase
    .from("holy_books")
    .select(
      "id, title, description, religion, tradition, language, translator, public_domain, text_type, source_url, created_at"
    )
    .order("religion", { ascending: true, nullsFirst: false })
    .order("title", { ascending: true });

  if (error) {
    console.log("Holy books error:", error);
  }

  return (
    <PageShell className="book-library-shell relative overflow-hidden">
      <div className="book-library-atmosphere pointer-events-none absolute inset-0" />

      <div className="relative">
        <BackLink>Back Home</BackLink>

        <section className="mt-10 overflow-hidden rounded-[2rem] border border-white/12 bg-[#061326]/72 p-6 shadow-2xl shadow-black/30 backdrop-blur-2xl sm:p-8 lg:p-10">
          <div className="max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#F5D76E]">
              Sacred Library
            </p>
            <h1 className="mt-4 text-5xl font-black leading-tight tracking-normal text-[#F8FAFC] sm:text-6xl">
              Sacred Texts Library
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-[#DCE7F4]">
              Explore holy books and sacred writings from religious traditions
              across humanity.
            </p>
            <p className="mt-4 max-w-3xl leading-7 text-[#AFC0D4]">
              Some texts are complete public-domain works, while others are
              selected passages or historically available translations. Each
              card shows the metadata we have so you can read with context.
            </p>
          </div>
        </section>

        <BookLibraryClient books={(books ?? []) as SacredBook[]} />
      </div>
    </PageShell>
  );
}
