"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BackLink } from "../../components/DesignSystem";
import { supabase } from "../../lib/supabase";

export type SearchBookFilter = {
  id: string;
  title: string | null;
  religion: string | null;
  tradition: string | null;
  language: string | null;
  translator: string | null;
  text_type: string | null;
};

type ChapterContext = {
  id: string;
  title: string | null;
  chapter_number: number | null;
  section_label: string | null;
  display_title: string | null;
  holy_books: SearchBookFilter | SearchBookFilter[] | null;
};

type SearchResult = {
  id: string;
  chapter_id: string;
  verse_number: number | null;
  verse_label: string | null;
  content: string | null;
  chapters: ChapterContext | ChapterContext[] | null;
};

type NormalizedSearchResult = Omit<SearchResult, "chapters"> & {
  chapters: (Omit<ChapterContext, "holy_books"> & {
    holy_books: SearchBookFilter | null;
  }) | null;
};

function cleanSearchTerm(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalize(value: string | null | undefined) {
  return value?.trim() || "";
}

function normalizeSearchResults(data: unknown): NormalizedSearchResult[] {
  if (!Array.isArray(data)) return [];

  return (data as SearchResult[]).map((verse) => {
    const chapter = Array.isArray(verse.chapters)
      ? verse.chapters[0] ?? null
      : verse.chapters;
    const book = Array.isArray(chapter?.holy_books)
      ? chapter?.holy_books[0] ?? null
      : chapter?.holy_books ?? null;

    return {
      ...verse,
      chapters: chapter ? { ...chapter, holy_books: book } : null,
    };
  });
}

function displayReligion(book: SearchBookFilter) {
  return normalize(book.religion) || "Other / Unclassified";
}

function formatChapterTitle(chapter: NormalizedSearchResult["chapters"]) {
  if (!chapter) return "Section";

  if (chapter.display_title?.trim()) {
    return chapter.display_title;
  }

  const title = chapter.title?.trim();
  const number = chapter.chapter_number;

  if (title && number !== null && number !== undefined) {
    return `${title} ${number}`;
  }

  return title || `${chapter.section_label || "Section"} ${number ?? ""}`.trim();
}

function formatVerseMarker(result: NormalizedSearchResult) {
  const label = result.verse_label || "Passage";

  if (result.verse_number === null || result.verse_number === undefined) {
    return label;
  }

  return `${label} ${result.verse_number}`;
}

export default function SearchClient({ books }: { books: SearchBookFilter[] }) {
  const [query, setQuery] = useState("");
  const [religionFilter, setReligionFilter] = useState("All");
  const [bookFilter, setBookFilter] = useState("All");
  const [traditionFilter, setTraditionFilter] = useState("All");
  const [results, setResults] = useState<NormalizedSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  const religions = useMemo(() => {
    return Array.from(new Set(books.map(displayReligion))).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [books]);

  const visibleBooks = useMemo(() => {
    return books
      .filter(
        (book) => religionFilter === "All" || displayReligion(book) === religionFilter
      )
      .sort((a, b) => normalize(a.title).localeCompare(normalize(b.title)));
  }, [books, religionFilter]);

  const traditions = useMemo(() => {
    return Array.from(
      new Set(visibleBooks.map((book) => normalize(book.tradition)).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
  }, [visibleBooks]);

  const filtersActive =
    religionFilter !== "All" || bookFilter !== "All" || traditionFilter !== "All";

  useEffect(() => {
    const searchTerm = cleanSearchTerm(query);

    if (!searchTerm) {
      setResults([]);
      setLoading(false);
      setSearched(false);
      setError("");
      return;
    }

    let isActive = true;

    async function searchPassages() {
      setLoading(true);
      setError("");

      let request = supabase
        .from("verses")
        .select(`
          id,
          chapter_id,
          verse_number,
          verse_label,
          content,
          chapters (
            id,
            title,
            chapter_number,
            section_label,
            display_title,
            holy_books (
              id,
              title,
              religion,
              tradition,
              language,
              translator,
              text_type
            )
          )
        `)
        .ilike("content", `%${searchTerm}%`)
        .limit(50);

      if (bookFilter !== "All") {
        request = request.eq("chapters.book_id", bookFilter);
      }

      const { data, error: searchError } = await request;

      if (!isActive) return;

      if (searchError) {
        setResults([]);
        setError("Search is temporarily unavailable.");
      } else {
        const normalizedResults = normalizeSearchResults(data).filter((result) => {
          const book = result.chapters?.holy_books;

          if (!book) return false;

          const religionMatches =
            religionFilter === "All" || displayReligion(book) === religionFilter;
          const bookMatches = bookFilter === "All" || book.id === bookFilter;
          const traditionMatches =
            traditionFilter === "All" || normalize(book.tradition) === traditionFilter;

          return religionMatches && bookMatches && traditionMatches;
        });

        setResults(normalizedResults);
      }

      setSearched(true);
      setLoading(false);
    }

    const timer = window.setTimeout(searchPassages, 350);

    return () => {
      isActive = false;
      window.clearTimeout(timer);
    };
  }, [bookFilter, query, religionFilter, traditionFilter]);

  const resetFilters = () => {
    setReligionFilter("All");
    setBookFilter("All");
    setTraditionFilter("All");
  };

  const resetAll = () => {
    setQuery("");
    resetFilters();
    setResults([]);
    setSearched(false);
    setError("");
    setLoading(false);
  };

  return (
    <div className="relative">
      <BackLink>Back Home</BackLink>

      <section className="mt-8 overflow-hidden rounded-[2rem] border border-white/12 bg-[#061326]/72 p-6 shadow-2xl shadow-black/30 backdrop-blur-2xl sm:p-8 lg:p-10">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#F5D76E]">
              Sacred Texts Search
            </p>
            <h1 className="mt-4 max-w-3xl text-5xl font-black leading-tight tracking-normal text-[#F8FAFC] sm:text-6xl">
              Search across sacred texts.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#CBD5E1]">
              Find words and phrases across holy books, then open each result in
              its chapter or section context.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-white/12 bg-white/[0.045] p-4 shadow-2xl shadow-black/20 backdrop-blur-2xl sm:p-5">
            <label
              htmlFor="sacred-search"
              className="text-xs font-bold uppercase tracking-[0.18em] text-[#F5D76E]"
            >
              Search passages
            </label>
            <input
              id="sacred-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by word or phrase..."
              className="mt-2 w-full rounded-2xl border border-white/12 bg-[#030817]/72 px-5 py-4 text-base text-[#F8FAFC] outline-none transition placeholder:text-[#7890AA] focus:border-[#D4AF37]/70"
            />

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <FilterSelect
                id="religion-filter"
                label="Religion"
                value={religionFilter}
                onChange={(value) => {
                  setReligionFilter(value);
                  setBookFilter("All");
                  setTraditionFilter("All");
                }}
                options={religions}
                allLabel="All religions"
              />
              <FilterSelect
                id="book-filter"
                label="Book"
                value={bookFilter}
                onChange={setBookFilter}
                options={visibleBooks.map((book) => ({
                  value: book.id,
                  label: normalize(book.title) || "Untitled",
                }))}
                allLabel="All books"
              />
              <FilterSelect
                id="tradition-filter"
                label="Tradition"
                value={traditionFilter}
                onChange={setTraditionFilter}
                options={traditions}
                allLabel="All traditions"
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[#AFC0D4]">
                Up to 50 results
              </span>
              <button
                type="button"
                onClick={resetAll}
                className="rounded-full border border-[#D4AF37]/35 bg-[#D4AF37]/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[#F5D76E] transition hover:bg-[#D4AF37]/18"
              >
                Reset search
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8" aria-live="polite">
        {loading && (
          <StatusCard>Searching sacred texts...</StatusCard>
        )}

        {!loading && error && (
          <div className="rounded-[1.5rem] border border-red-300/30 bg-red-500/10 p-5 text-red-100 shadow-2xl shadow-black/20 backdrop-blur-xl">
            {error}
          </div>
        )}

        {!loading && !error && !searched && (
          <StatusCard>Search across sacred texts by word or phrase.</StatusCard>
        )}

        {!loading && !error && searched && results.length === 0 && (
          <div className="rounded-[1.5rem] border border-white/12 bg-white/[0.045] p-6 text-[#CBD5E1] shadow-2xl shadow-black/20 backdrop-blur-2xl">
            <h2 className="text-2xl font-bold text-[#F8FAFC]">
              No passages match your search and filters.
            </h2>
            {filtersActive && (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-5 rounded-2xl bg-[#D4AF37] px-5 py-3 text-sm font-black text-[#071A2F] transition hover:bg-[#F5D76E]"
              >
                Reset filters
              </button>
            )}
          </div>
        )}

        {!loading && !error && results.length > 0 && (
          <div className="grid gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-white/12 bg-white/[0.045] px-5 py-4 backdrop-blur-xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#F5D76E]">
                Results
              </p>
              <p className="text-sm text-[#CBD5E1]">
                Showing {results.length} matching passages
              </p>
            </div>

            {results.map((result) => (
              <ResultCard key={result.id} result={result} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function FilterSelect({
  id,
  label,
  value,
  onChange,
  options,
  allLabel,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[] | Array<{ value: string; label: string }>;
  allLabel: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="text-xs font-bold uppercase tracking-[0.16em] text-[#F5D76E]"
      >
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-white/12 bg-[#030817]/72 px-4 py-3 text-sm text-[#F8FAFC] outline-none transition focus:border-[#D4AF37]/70"
      >
        <option value="All">{allLabel}</option>
        {options.map((option) => {
          const normalizedOption =
            typeof option === "string" ? { value: option, label: option } : option;

          return (
            <option key={normalizedOption.value} value={normalizedOption.value}>
              {normalizedOption.label}
            </option>
          );
        })}
      </select>
    </div>
  );
}

function StatusCard({ children }: { children: string }) {
  return (
    <div className="rounded-[1.5rem] border border-white/12 bg-white/[0.045] p-5 text-[#CBD5E1] shadow-2xl shadow-black/20 backdrop-blur-2xl">
      {children}
    </div>
  );
}

function ResultCard({ result }: { result: NormalizedSearchResult }) {
  const chapter = result.chapters;
  const book = chapter?.holy_books;

  return (
    <Link
      href={`/chapter/${result.chapter_id}`}
      className="group rounded-[1.5rem] border border-white/12 bg-[#061326]/58 p-5 shadow-2xl shadow-black/24 backdrop-blur-2xl transition hover:-translate-y-0.5 hover:border-[#D4AF37]/50 hover:bg-[#08182D]/68"
    >
      <div className="flex flex-wrap gap-2">
        {book?.title && (
          <span className="rounded-full border border-[#D4AF37]/35 bg-[#D4AF37]/10 px-3 py-1 text-xs font-bold text-[#F5D76E]">
            {book.title}
          </span>
        )}
        {book?.religion && (
          <span className="rounded-full border border-white/12 bg-white/[0.06] px-3 py-1 text-xs font-bold text-[#CBD5E1]">
            {book.religion}
          </span>
        )}
        {book?.tradition && (
          <span className="rounded-full border border-white/12 bg-white/[0.06] px-3 py-1 text-xs font-bold text-[#CBD5E1]">
            {book.tradition}
          </span>
        )}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-start">
        <div>
          <h2 className="text-xl font-black leading-tight text-[#F8FAFC]">
            {formatChapterTitle(chapter)}
          </h2>
          <p className="mt-1 text-sm font-bold uppercase tracking-[0.14em] text-[#D4AF37]/85">
            {formatVerseMarker(result)}
          </p>
        </div>
        {book?.translator && (
          <p className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-[#AFC0D4]">
            {book.translator}
          </p>
        )}
      </div>

      <p className="mt-4 text-lg leading-8 text-[#E2E8F0]">
        {result.content}
      </p>
      <p className="mt-5 text-sm font-bold text-[#F5D76E] transition group-hover:text-[#FFF3B0]">
        Open section
      </p>
    </Link>
  );
}
