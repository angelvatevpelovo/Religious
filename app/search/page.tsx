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
    <main className="min-h-screen bg-[#0F2744] px-5 py-8 text-white sm:px-10">
      <section className="mx-auto max-w-5xl">
        <Link href="/" className="font-bold text-[#D4AF37] hover:underline">
          Back
        </Link>

        <div className="mt-10">
          <h1 className="text-4xl font-bold text-[#D4AF37] sm:text-5xl">
            Search KJV Bible
          </h1>

          <div className="mt-8">
            <label htmlFor="bible-search" className="sr-only">
              Search Bible verses
            </label>
            <input
              id="bible-search"
              value={query}
              onChange={(event) => handleQueryChange(event.target.value)}
              placeholder="Search verses by word or phrase..."
              className="w-full rounded-2xl border border-[#D4AF37]/40 bg-white/10 px-5 py-4 text-lg text-white outline-none transition placeholder:text-white/45 focus:border-[#D4AF37] focus:bg-white/15"
            />
          </div>
        </div>

        <section className="mt-8" aria-live="polite">
          {loading && (
            <p className="rounded-2xl border border-white/15 bg-white/10 p-5 text-white/75">
              Searching...
            </p>
          )}

          {!loading && error && (
            <p className="rounded-2xl border border-red-300/30 bg-red-500/10 p-5 text-red-100">
              {error}
            </p>
          )}

          {!loading && !error && searched && results.length === 0 && (
            <p className="rounded-2xl border border-white/15 bg-white/10 p-5 text-white/75">
              No verses found.
            </p>
          )}

          {!loading && !error && results.length > 0 && (
            <div className="grid gap-4">
              {results.map((verse) => (
                <Link
                  key={verse.id}
                  href={`/chapter/${verse.chapter_id}`}
                  className="rounded-2xl border border-white/15 bg-white/10 p-5 transition hover:border-[#D4AF37]/60 hover:bg-white/15"
                >
                  <p className="text-lg font-bold text-[#D4AF37]">
                    {verse.chapters?.title ?? "Bible"}{" "}
                    {verse.chapters?.chapter_number ?? "?"}:
                    {verse.verse_number}
                  </p>

                  <p className="mt-3 text-base leading-relaxed text-white/90">
                    {verse.content}
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
