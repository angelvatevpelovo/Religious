"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type SearchResult = {
  id: string;
  chapter_id: string;
  verse_number: number;
  content: string;
  chapters: {
    id: string;
    title: string;
    chapter_number: number;
    holy_books: {
      title: string;
    } | null;
  } | null;
};

type RawSearchResult = Omit<SearchResult, "chapters"> & {
  chapters: SearchResult["chapters"] | SearchResult["chapters"][];
};

function cleanSearchTerm(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeSearchResults(data: unknown): SearchResult[] {
  if (!Array.isArray(data)) return [];

  return (data as RawSearchResult[]).map((verse) => ({
    ...verse,
    chapters: Array.isArray(verse.chapters)
      ? verse.chapters[0] ?? null
      : verse.chapters,
  }));
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const searchTerm = cleanSearchTerm(query);

    if (!searchTerm) {
      return;
    }

    let isActive = true;

    async function searchVerses() {
      setLoading(true);
      setError("");

      const { data, error: searchError } = await supabase
        .from("verses")
        .select(`
          id,
          chapter_id,
          verse_number,
          content,
          chapters (
            id,
            title,
            chapter_number,
            holy_books (
              title
            )
          )
        `)
        .ilike("content", `%${searchTerm}%`)
        .limit(50);

      if (!isActive) return;

      if (searchError) {
        setResults([]);
        setError("Search is temporarily unavailable.");
      } else {
        setResults(normalizeSearchResults(data));
      }

      setSearched(true);
      setLoading(false);
    }

    const timer = window.setTimeout(searchVerses, 350);

    return () => {
      isActive = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  function handleQueryChange(value: string) {
    setQuery(value);

    if (!cleanSearchTerm(value)) {
      setResults([]);
      setLoading(false);
      setSearched(false);
      setError("");
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#071A2F] px-4 pb-32 pt-6 text-white sm:px-8 lg:px-10">
      <div className="cosmic-grid pointer-events-none absolute inset-0 opacity-60" />
      <div className="pointer-events-none absolute left-[-10rem] top-12 h-96 w-96 rounded-full bg-[#D4AF37]/18 blur-3xl" />
      <div className="pointer-events-none absolute right-[-8rem] top-56 h-96 w-96 rounded-full bg-sky-400/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-12rem] left-1/3 h-96 w-96 rounded-full bg-[#D4AF37]/10 blur-3xl" />

      <section className="relative mx-auto max-w-6xl">
        <Link
          href="/"
          className="inline-flex items-center rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-[#F5D76E] backdrop-blur transition hover:border-[#D4AF37]/60 hover:bg-white/10"
        >
          Back
        </Link>

        <div className="gold-aura mt-8 overflow-hidden rounded-[2.5rem] border border-white/15 bg-[#071A2F]/72 p-6 shadow-2xl shadow-black/35 backdrop-blur-2xl sm:p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#F5D76E]">
                Sacred Text Search
              </p>
              <h1 className="mt-4 max-w-3xl text-5xl font-black tracking-normal text-[#F8FAFC] sm:text-6xl">
                Search holy books with clarity.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-[#CBD5E1]">
                Enter a word or phrase and open any result directly in its
                chapter context.
              </p>
            </div>

            <div className="premium-glass rounded-[2rem] p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between gap-3 text-xs font-bold uppercase tracking-[0.18em] text-[#F5D76E]">
                <span>Sacred text query</span>
                <span className="rounded-full border border-[#D4AF37]/35 bg-[#D4AF37]/10 px-3 py-1 text-[#F5D76E]">
                  Holy Books
                </span>
              </div>
            <label htmlFor="bible-search" className="sr-only">
              Search sacred text passages
            </label>
            <input
              id="bible-search"
              value={query}
              onChange={(event) => handleQueryChange(event.target.value)}
              placeholder="Search passages by word or phrase..."
                className="w-full rounded-[1.4rem] border border-white/12 bg-white/[0.08] px-5 py-4 text-lg text-white shadow-inner shadow-black/20 outline-none transition placeholder:text-white/40 focus:border-[#D4AF37]/80 focus:bg-white/[0.12] focus:shadow-[#D4AF37]/10"
            />
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[#CBD5E1]">
                <span className="rounded-full border border-white/12 bg-white/[0.05] px-3 py-1">
                  Debounced search
                </span>
                <span className="rounded-full border border-white/12 bg-white/[0.05] px-3 py-1">
                  Up to 50 results
                </span>
              </div>
            </div>
          </div>
        </div>

        <section className="mt-8" aria-live="polite">
          {loading && (
            <p className="premium-glass rounded-[1.75rem] p-5 text-[#CBD5E1]">
              Searching...
            </p>
          )}

          {!loading && error && (
            <p className="rounded-[1.75rem] border border-red-300/30 bg-red-500/10 p-5 text-red-100 shadow-2xl shadow-black/20 backdrop-blur-xl">
              {error}
            </p>
          )}

          {!loading && !error && searched && results.length === 0 && (
            <p className="premium-glass rounded-[1.75rem] p-5 text-[#CBD5E1]">
              No passages found.
            </p>
          )}

          {!loading && !error && results.length > 0 && (
            <div className="grid gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-white/12 bg-white/[0.05] px-5 py-4 backdrop-blur-xl">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#F5D76E]">
                  Results
                </p>
                <p className="text-sm text-[#CBD5E1]">
                  Showing {results.length} matching passages
                </p>
              </div>

              {results.map((verse) => (
                <Link
                  key={verse.id}
                  href={`/chapter/${verse.chapter_id}`}
                  className="premium-glass group rounded-[1.75rem] p-5 transition hover:-translate-y-0.5 hover:border-[#D4AF37]/60 hover:bg-white/[0.1]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-lg font-bold text-[#F5D76E]">
                      {verse.chapters?.title ?? "Sacred text"}{" "}
                      {verse.chapters?.chapter_number ?? "?"}:
                      {verse.verse_number}
                    </p>
                    {verse.chapters?.holy_books?.title && (
                      <span className="rounded-full border border-[#D4AF37]/35 bg-[#D4AF37]/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[#F5D76E]">
                        {verse.chapters.holy_books.title}
                      </span>
                    )}
                  </div>

                  <p className="mt-4 text-base leading-8 text-[#E2E8F0]">
                    {verse.content}
                  </p>
                  <p className="mt-4 text-sm font-semibold text-[#D4AF37] opacity-80 transition group-hover:opacity-100">
                    Open chapter
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
