import Link from "next/link";
import { BackLink, EmptyState, PageShell } from "../../../components/DesignSystem";
import { supabase } from "../../../lib/supabase";

type BookRow = {
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

type ChapterRow = {
  id: string;
  title: string | null;
  chapter_number: number | null;
  section_label: string | null;
  display_title: string | null;
  sort_order: number | null;
  created_at: string | null;
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

function isSelection(book: BookRow | null) {
  if (!book) return false;

  const haystack = [book.title, book.description, book.text_type]
    .map((value) => normalize(value).toLowerCase())
    .join(" ");

  return selectionSignals.some((signal) => haystack.includes(signal));
}

function labelFromTextType(value: string | null | undefined) {
  const label = normalize(value)
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!label) return null;

  return label.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatSectionTitle(chapter: ChapterRow) {
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

function formatSectionNumber(chapter: ChapterRow, index: number) {
  return chapter.chapter_number ?? chapter.sort_order ?? index + 1;
}

export default async function BookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: bookData } = await supabase
    .from("holy_books")
    .select(
      "id, title, description, religion, tradition, language, translator, public_domain, text_type, source_url, created_at"
    )
    .eq("id", id)
    .maybeSingle();

  const { data: chaptersData } = await supabase
    .from("chapters")
    .select(
      "id, title, chapter_number, section_label, display_title, sort_order, created_at"
    )
    .eq("book_id", id)
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("chapter_number", { ascending: true });

  const book = bookData as BookRow | null;
  const chapters = ((chaptersData ?? []) as ChapterRow[]).sort((first, second) => {
    const firstOrder = first.sort_order ?? Number.MAX_SAFE_INTEGER;
    const secondOrder = second.sort_order ?? Number.MAX_SAFE_INTEGER;

    if (firstOrder !== secondOrder) {
      return firstOrder - secondOrder;
    }

    return (first.chapter_number ?? 0) - (second.chapter_number ?? 0);
  });
  const sectionLabel = chapters[0]?.section_label || "Section";
  const textTypeLabel = labelFromTextType(book?.text_type);
  const selection = isSelection(book);

  return (
    <PageShell className="book-library-shell relative overflow-hidden">
      <div className="book-library-atmosphere pointer-events-none absolute inset-0" />

      <div className="relative">
        <BackLink href="/book">Back to Sacred Texts Library</BackLink>

        <section className="mt-10 overflow-hidden rounded-[2rem] border border-white/12 bg-[#061326]/72 p-6 shadow-2xl shadow-black/30 backdrop-blur-2xl sm:p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#F5D76E]">
                Sacred Text
              </p>
              <h1 className="mt-4 text-4xl font-black leading-tight tracking-normal text-[#F8FAFC] sm:text-5xl lg:text-6xl">
                {normalize(book?.title) || "Holy Book"}
              </h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-[#CBD5E1]">
                {book?.description ||
                  "Open a section below to begin reading this sacred text."}
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {book?.public_domain && (
                  <span className="rounded-full border border-[#D4AF37]/35 bg-[#D4AF37]/10 px-3 py-1.5 text-xs font-bold text-[#F5D76E]">
                    Public domain
                  </span>
                )}
                {selection && (
                  <span className="rounded-full border border-white/12 bg-white/[0.06] px-3 py-1.5 text-xs font-bold text-[#CBD5E1]">
                    Selection
                  </span>
                )}
                {textTypeLabel && !selection && (
                  <span className="rounded-full border border-white/12 bg-white/[0.06] px-3 py-1.5 text-xs font-bold text-[#CBD5E1]">
                    {textTypeLabel}
                  </span>
                )}
              </div>

              {book?.source_url && (
                <a
                  href={book.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-6 inline-flex rounded-2xl border border-[#D4AF37]/35 bg-[#D4AF37]/10 px-4 py-2 text-sm font-bold text-[#F5D76E] transition hover:bg-[#D4AF37]/18"
                >
                  View source
                </a>
              )}
            </div>

            <div className="rounded-[1.5rem] border border-white/12 bg-white/[0.045] p-5 shadow-2xl shadow-black/20 backdrop-blur-2xl">
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-[#F5D76E]">
                Text details
              </h2>
              <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                <MetadataCard label="Religion" value={book?.religion} />
                <MetadataCard label="Tradition" value={book?.tradition} />
                <MetadataCard label="Language" value={book?.language} />
                <MetadataCard label="Translator" value={book?.translator} />
                <MetadataCard label="Text type" value={textTypeLabel} />
                <MetadataCard
                  label="Rights"
                  value={book?.public_domain ? "Public domain" : null}
                />
              </dl>
            </div>
          </div>
        </section>

        <section className="mt-10">
          <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#F5D76E]">
                Reader entry
              </p>
              <h2 className="mt-2 text-3xl font-black text-[#F8FAFC] sm:text-4xl">
                {sectionLabel === "Chapter" ? "Chapters" : "Sections"}
              </h2>
              <p className="mt-3 max-w-2xl leading-7 text-[#CBD5E1]">
                Open a {sectionLabel.toLowerCase()} to continue into the
                reading view.
              </p>
            </div>
            <p className="w-fit rounded-full border border-white/12 bg-white/[0.05] px-4 py-2 text-sm font-semibold text-[#CBD5E1] backdrop-blur-xl">
              {chapters.length} {chapters.length === 1 ? "section" : "sections"}
            </p>
          </div>

          {chapters.length === 0 ? (
            <div className="mt-6">
              <EmptyState title="No sections are available for this text yet." />
            </div>
          ) : (
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {chapters.map((chapter, index) => (
                <Link
                  key={chapter.id}
                  href={`/chapter/${chapter.id}`}
                  className="group rounded-[1.25rem] border border-white/12 bg-[#061326]/58 p-4 shadow-xl shadow-black/18 backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-[#D4AF37]/50 hover:bg-[#08182D]/68"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 min-w-10 items-center justify-center rounded-2xl border border-[#D4AF37]/35 bg-[#D4AF37]/10 text-sm font-black text-[#F5D76E]">
                      {formatSectionNumber(chapter, index)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7890AA]">
                        {chapter.section_label || sectionLabel}
                      </p>
                      <h3 className="mt-1 line-clamp-2 text-base font-bold leading-6 text-[#F8FAFC]">
                        {formatSectionTitle(chapter)}
                      </h3>
                      <span className="mt-3 inline-flex text-sm font-bold text-[#F5D76E] transition group-hover:text-[#FFF3B0]">
                        Read
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </PageShell>
  );
}

function MetadataCard({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  const displayValue = normalize(value);

  if (!displayValue) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <dt className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7890AA]">
        {label}
      </dt>
      <dd className="mt-2 text-sm font-semibold leading-6 text-[#DCE7F4]">
        {displayValue}
      </dd>
    </div>
  );
}
