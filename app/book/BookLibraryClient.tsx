"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type SacredBook = {
  id: string;
  title: string | null;
  description: string | null;
  religion: string | null;
  tradition: string | null;
  language: string | null;
  translator: string | null;
  public_domain: boolean | null;
  text_type: string | null;
  source_url: string | null;
  created_at: string | null;
};

type GroupedBooks = {
  religion: string;
  books: SacredBook[];
};

const selectionSignals = [
  "selection",
  "selected",
  "selections",
  "passage",
  "passages",
  "excerpt",
  "extract",
];

function normalize(value: string | null | undefined) {
  return value?.trim() || "";
}

function displayReligion(book: SacredBook) {
  return normalize(book.religion) || "Other / Unclassified";
}

function isSelection(book: SacredBook) {
  const haystack = [
    book.title,
    book.description,
    book.text_type,
  ]
    .map((value) => normalize(value).toLowerCase())
    .join(" ");

  return selectionSignals.some((signal) => haystack.includes(signal));
}

function labelFromTextType(value: string | null) {
  const label = normalize(value)
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!label) return null;

  return label.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function groupHeadingId(religion: string) {
  return `group-${religion
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")}`;
}

function matchesBook(book: SacredBook, search: string) {
  if (!search) return true;

  const haystack = [
    book.title,
    book.description,
    book.religion,
    book.tradition,
    book.translator,
  ]
    .map((value) => normalize(value).toLowerCase())
    .join(" ");

  return haystack.includes(search.toLowerCase());
}

export default function BookLibraryClient({ books }: { books: SacredBook[] }) {
  const [search, setSearch] = useState("");
  const [religionFilter, setReligionFilter] = useState("All");
  const [traditionFilter, setTraditionFilter] = useState("All");

  const religions = useMemo(() => {
    return Array.from(new Set(books.map(displayReligion))).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [books]);

  const traditions = useMemo(() => {
    const source =
      religionFilter === "All"
        ? books
        : books.filter((book) => displayReligion(book) === religionFilter);

    return Array.from(
      new Set(source.map((book) => normalize(book.tradition)).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
  }, [books, religionFilter]);

  const filteredBooks = useMemo(() => {
    const trimmedSearch = search.trim();

    return books.filter((book) => {
      const religionMatches =
        religionFilter === "All" || displayReligion(book) === religionFilter;
      const traditionMatches =
        traditionFilter === "All" ||
        normalize(book.tradition) === traditionFilter;

      return (
        religionMatches &&
        traditionMatches &&
        matchesBook(book, trimmedSearch)
      );
    });
  }, [books, religionFilter, search, traditionFilter]);

  const groupedBooks = useMemo<GroupedBooks[]>(() => {
    const groups = new Map<string, SacredBook[]>();

    for (const book of filteredBooks) {
      const religion = displayReligion(book);
      groups.set(religion, [...(groups.get(religion) ?? []), book]);
    }

    return Array.from(groups.entries())
      .map(([religion, groupBooks]) => ({
        religion,
        books: groupBooks.sort((a, b) =>
          normalize(a.title).localeCompare(normalize(b.title))
        ),
      }))
      .sort((a, b) => a.religion.localeCompare(b.religion));
  }, [filteredBooks]);

  const resetFilters = () => {
    setSearch("");
    setReligionFilter("All");
    setTraditionFilter("All");
  };

  return (
    <section className="mt-8">
      <div className="rounded-[1.5rem] border border-white/12 bg-white/[0.045] p-4 shadow-2xl shadow-black/20 backdrop-blur-2xl sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr_0.85fr_auto] lg:items-end">
          <div>
            <label
              htmlFor="book-search"
              className="text-xs font-bold uppercase tracking-[0.18em] text-[#F5D76E]"
            >
              Search texts
            </label>
            <input
              id="book-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by title, tradition or translator"
              className="mt-2 w-full rounded-2xl border border-white/12 bg-[#030817]/70 px-4 py-3 text-sm text-[#F8FAFC] outline-none transition placeholder:text-[#7890AA] focus:border-[#D4AF37]/60"
            />
          </div>

          <div>
            <label
              htmlFor="religion-filter"
              className="text-xs font-bold uppercase tracking-[0.18em] text-[#F5D76E]"
            >
              Religion
            </label>
            <select
              id="religion-filter"
              value={religionFilter}
              onChange={(event) => {
                setReligionFilter(event.target.value);
                setTraditionFilter("All");
              }}
              className="mt-2 w-full rounded-2xl border border-white/12 bg-[#030817]/70 px-4 py-3 text-sm text-[#F8FAFC] outline-none transition focus:border-[#D4AF37]/60"
            >
              <option value="All">All traditions</option>
              {religions.map((religion) => (
                <option key={religion} value={religion}>
                  {religion}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="tradition-filter"
              className="text-xs font-bold uppercase tracking-[0.18em] text-[#F5D76E]"
            >
              Tradition
            </label>
            <select
              id="tradition-filter"
              value={traditionFilter}
              onChange={(event) => setTraditionFilter(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/12 bg-[#030817]/70 px-4 py-3 text-sm text-[#F8FAFC] outline-none transition focus:border-[#D4AF37]/60"
            >
              <option value="All">All</option>
              {traditions.map((tradition) => (
                <option key={tradition} value={tradition}>
                  {tradition}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={resetFilters}
            className="rounded-2xl border border-[#D4AF37]/35 bg-[#D4AF37]/10 px-4 py-3 text-sm font-bold text-[#F5D76E] transition hover:bg-[#D4AF37]/18"
          >
            Reset filters
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#AFC0D4]">
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
            {books.length} total texts
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
            {filteredBooks.length} showing
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
            {groupedBooks.length} groups
          </span>
        </div>
      </div>

      {groupedBooks.length === 0 ? (
        <div className="mt-8 rounded-[1.75rem] border border-white/12 bg-white/[0.045] p-8 text-center shadow-2xl shadow-black/20 backdrop-blur-2xl">
          <h2 className="text-2xl font-bold text-[#F8FAFC]">
            No sacred texts match your filters.
          </h2>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-5 rounded-2xl bg-[#D4AF37] px-5 py-3 text-sm font-black text-[#071A2F] transition hover:bg-[#F5D76E]"
          >
            Reset filters
          </button>
        </div>
      ) : (
        <div className="mt-10 space-y-12">
          {groupedBooks.map((group) => (
            <section key={group.religion} aria-labelledby={groupHeadingId(group.religion)}>
              <div className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#F5D76E]">
                    Tradition group
                  </p>
                  <h2
                    id={groupHeadingId(group.religion)}
                    className="mt-2 text-3xl font-black text-[#F8FAFC] sm:text-4xl"
                  >
                    {group.religion}
                  </h2>
                </div>
                <p className="w-fit rounded-full border border-white/12 bg-white/[0.05] px-4 py-2 text-sm font-semibold text-[#CBD5E1]">
                  {group.books.length}{" "}
                  {group.books.length === 1 ? "text" : "texts"}
                </p>
              </div>

              <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {group.books.map((book) => (
                  <BookCard key={book.id} book={book} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}

function BookCard({ book }: { book: SacredBook }) {
  const textTypeLabel = labelFromTextType(book.text_type);
  const selection = isSelection(book);

  return (
    <Link
      href={`/book/${book.id}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-white/12 bg-[#061326]/54 p-5 shadow-2xl shadow-black/24 backdrop-blur-2xl transition hover:-translate-y-1 hover:border-[#D4AF37]/50 hover:bg-[#08182D]/62 sm:p-6"
    >
      <div className="pointer-events-none absolute right-[-4rem] top-[-4rem] h-36 w-36 rounded-full bg-[#D4AF37]/10 blur-3xl transition group-hover:bg-[#D4AF37]/18" />

      <div className="relative flex flex-1 flex-col">
        <div className="flex flex-wrap gap-2">
          {book.public_domain && (
            <span className="rounded-full border border-[#D4AF37]/35 bg-[#D4AF37]/10 px-3 py-1 text-xs font-bold text-[#F5D76E]">
              Public domain
            </span>
          )}
          {selection && (
            <span className="rounded-full border border-white/12 bg-white/[0.06] px-3 py-1 text-xs font-bold text-[#CBD5E1]">
              Selection
            </span>
          )}
          {textTypeLabel && !selection && (
            <span className="rounded-full border border-white/12 bg-white/[0.06] px-3 py-1 text-xs font-bold text-[#CBD5E1]">
              {textTypeLabel}
            </span>
          )}
        </div>

        <h3 className="mt-5 text-2xl font-black leading-tight text-[#F8FAFC]">
          {normalize(book.title) || "Untitled sacred text"}
        </h3>

        {book.description && (
          <p className="mt-4 line-clamp-4 leading-7 text-[#CBD5E1]">
            {book.description}
          </p>
        )}

        <dl className="mt-5 grid gap-3 text-sm text-[#AFC0D4]">
          <MetadataItem label="Religion" value={book.religion} />
          <MetadataItem label="Tradition" value={book.tradition} />
          <MetadataItem label="Language" value={book.language} />
          <MetadataItem label="Translator" value={book.translator} />
        </dl>

        <span className="mt-6 inline-flex text-sm font-bold text-[#F5D76E] transition group-hover:text-[#FFF3B0]">
          Open text
        </span>
      </div>
    </Link>
  );
}

function MetadataItem({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  const displayValue = normalize(value);

  if (!displayValue) return null;

  return (
    <div>
      <dt className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7890AA]">
        {label}
      </dt>
      <dd className="mt-1 text-[#DCE7F4]">{displayValue}</dd>
    </div>
  );
}
