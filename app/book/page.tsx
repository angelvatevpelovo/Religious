import type { Metadata } from "next";
import Link from "next/link";
import {
  BackLink,
  EmptyState,
  GlassCard,
  PageShell,
} from "../../components/DesignSystem";
import { supabase } from "../../lib/supabase";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Holy Books",
  description:
    "Browse sacred texts and holy books for reading, study and reflection in RELIGIOUS.",
  alternates: {
    canonical: "/book",
  },
};

export default async function BooksPage() {
  const { data: books, error } = await supabase
    .from("holy_books")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.log("Holy books error:", error);
  }

  return (
    <PageShell className="relative overflow-hidden">
      <div className="cosmic-grid pointer-events-none absolute inset-0 opacity-60" />
      <div className="pointer-events-none absolute left-[-10rem] top-16 h-96 w-96 rounded-full bg-[#D4AF37]/18 blur-3xl" />
      <div className="pointer-events-none absolute right-[-9rem] top-48 h-96 w-96 rounded-full bg-sky-400/10 blur-3xl" />

      <div className="relative">
        <BackLink>Back Home</BackLink>

        <section className="gold-aura mt-10 overflow-hidden rounded-[2.5rem] border border-white/15 bg-[#071A2F]/72 p-6 shadow-2xl shadow-black/35 backdrop-blur-2xl sm:p-8 lg:p-12">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.82fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#F5D76E]">
                Sacred Library
              </p>
              <h1 className="mt-4 max-w-4xl text-5xl font-black tracking-normal text-[#F8FAFC] sm:text-6xl">
                Holy books for focused reading and reflection.
              </h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-[#CBD5E1]">
                Begin with the available sacred texts, open a book, and move
                into chapters with a quiet reading flow designed for study.
              </p>
            </div>

            <GlassCard className="premium-glass relative overflow-hidden p-6 sm:p-8">
              <div className="absolute right-[-4rem] top-[-4rem] h-48 w-48 rounded-full bg-[#D4AF37]/20 blur-3xl" />
              <div className="relative">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#F5D76E]">
                  Version 1.1
                </p>
                <h2 className="mt-4 text-3xl font-bold text-[#F8FAFC]">
                  More sacred texts are coming
                </h2>
                <p className="mt-4 leading-7 text-[#CBD5E1]">
                  RELIGIOUS will expand carefully in future versions with more
                  traditions and texts, while keeping the experience respectful,
                  readable and grounded.
                </p>
              </div>
            </GlassCard>
          </div>
        </section>

        <section className="mt-12">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#F5D76E]">
                Available now
              </p>
              <h2 className="mt-2 text-4xl font-bold text-[#F8FAFC]">
                Choose a text
              </h2>
            </div>
            {books && books.length > 0 && (
              <p className="rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-[#CBD5E1] backdrop-blur-xl">
                {books.length} {books.length === 1 ? "book" : "books"}
              </p>
            )}
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {!books || books.length === 0 ? (
              <div className="md:col-span-2 xl:col-span-3">
                <EmptyState
                  title="No holy books yet"
                  description="When sacred texts are added, they will appear here."
                />
              </div>
            ) : (
              books.map((book) => (
                <Link
                  key={book.id}
                  href={`/book/${book.id}`}
                  className="premium-glass group relative overflow-hidden rounded-[1.85rem] p-6 transition hover:-translate-y-1 hover:border-[#D4AF37]/60 hover:bg-white/[0.1]"
                >
                  <div className="pointer-events-none absolute right-[-3rem] top-[-3rem] h-32 w-32 rounded-full bg-[#D4AF37]/12 blur-2xl transition group-hover:bg-[#D4AF37]/20" />
                  <div className="relative">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#F5D76E]">
                      Sacred Text
                    </p>
                    <h3 className="mt-4 text-3xl font-bold text-[#F8FAFC]">
                      {book.title}
                    </h3>
                    {book.description && (
                      <p className="mt-4 leading-7 text-[#CBD5E1]">
                        {book.description}
                      </p>
                    )}
                    <p className="mt-6 text-sm font-semibold text-[#D4AF37] opacity-80 transition group-hover:opacity-100">
                      Open book
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
