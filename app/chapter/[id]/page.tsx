import Link from "next/link";
import FavoriteVerseButton from "../../../components/FavoriteVerseButton";
import { BackLink, EmptyState, PageShell } from "../../../components/DesignSystem";
import { supabase } from "../../../lib/supabase";

type BookRow = {
  id: string;
  title: string | null;
  religion: string | null;
  tradition: string | null;
  language: string | null;
  translator: string | null;
  public_domain: boolean | null;
  text_type: string | null;
};

type ChapterRow = {
  id: string;
  book_id: string | null;
  title: string | null;
  chapter_number: number | null;
  section_label: string | null;
  display_title: string | null;
  sort_order: number | null;
};

type VerseRow = {
  id: string;
  verse_number: number | null;
  verse_label: string | null;
  sort_order: number | null;
  content: string | null;
  original_text: string | null;
  transliteration: string | null;
};

function normalize(value: string | null | undefined) {
  return value?.trim() || "";
}

function formatChapterTitle(chapter: ChapterRow | null) {
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

function formatVerseMarker(verse: VerseRow, index: number) {
  const label = verse.verse_label || "Passage";
  const number = verse.verse_number ?? verse.sort_order ?? index + 1;

  return `${label} ${number}`;
}

function sortChapter(first: ChapterRow, second: ChapterRow) {
  const firstOrder = first.sort_order ?? Number.MAX_SAFE_INTEGER;
  const secondOrder = second.sort_order ?? Number.MAX_SAFE_INTEGER;

  if (firstOrder !== secondOrder) {
    return firstOrder - secondOrder;
  }

  return (first.chapter_number ?? 0) - (second.chapter_number ?? 0);
}

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: chapterData } = await supabase
    .from("chapters")
    .select("id, book_id, title, chapter_number, section_label, display_title, sort_order")
    .eq("id", id)
    .maybeSingle();

  const chapter = chapterData as ChapterRow | null;

  const [{ data: bookData }, { data: versesData }, { data: siblingChaptersData }] =
    await Promise.all([
      chapter?.book_id
        ? supabase
            .from("holy_books")
            .select(
              "id, title, religion, tradition, language, translator, public_domain, text_type"
            )
            .eq("id", chapter.book_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("verses")
        .select(
          "id, verse_number, verse_label, sort_order, content, original_text, transliteration"
        )
        .eq("chapter_id", id)
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("verse_number", { ascending: true }),
      chapter?.book_id
        ? supabase
            .from("chapters")
            .select("id, title, chapter_number, section_label, display_title, sort_order")
            .eq("book_id", chapter.book_id)
            .order("sort_order", { ascending: true, nullsFirst: false })
            .order("chapter_number", { ascending: true })
        : Promise.resolve({ data: [] }),
    ]);

  const book = bookData as BookRow | null;
  const verses = ((versesData ?? []) as VerseRow[]).sort((first, second) => {
    const firstOrder = first.sort_order ?? Number.MAX_SAFE_INTEGER;
    const secondOrder = second.sort_order ?? Number.MAX_SAFE_INTEGER;

    if (firstOrder !== secondOrder) {
      return firstOrder - secondOrder;
    }

    return (first.verse_number ?? 0) - (second.verse_number ?? 0);
  });
  const siblingChapters = ((siblingChaptersData ?? []) as ChapterRow[]).sort(
    sortChapter
  );
  const currentIndex = siblingChapters.findIndex((item) => item.id === id);
  const previousChapter = currentIndex > 0 ? siblingChapters[currentIndex - 1] : null;
  const nextChapter =
    currentIndex >= 0 && currentIndex < siblingChapters.length - 1
      ? siblingChapters[currentIndex + 1]
      : null;

  const chapterTitle = formatChapterTitle(chapter);
  const sectionLabel = chapter?.section_label || "Section";

  return (
    <PageShell className="reader-shell relative overflow-hidden">
      <div className="reader-atmosphere pointer-events-none absolute inset-0" aria-hidden="true" />

      <div className="relative">
        <BackLink href={book?.id ? `/book/${book.id}` : "/book"}>
          Back to book
        </BackLink>

        <section className="reader-hero mt-10 rounded-[2rem] border border-white/12 bg-[#061326]/74 p-6 shadow-2xl shadow-black/30 backdrop-blur-2xl sm:p-8 lg:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#F5D76E]">
            {sectionLabel}
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight text-[#F8FAFC] sm:text-5xl lg:text-6xl">
            {chapterTitle}
          </h1>
          <div className="mt-5 flex flex-wrap gap-2 text-sm font-semibold text-[#CBD5E1]">
            {book?.title && (
              <span className="rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5">
                {book.title}
              </span>
            )}
            {book?.religion && (
              <span className="rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5">
                {book.religion}
              </span>
            )}
            {book?.tradition && (
              <span className="rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5">
                {book.tradition}
              </span>
            )}
            {book?.translator && (
              <span className="rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-3 py-1.5 text-[#F5D76E]">
                {book.translator}
              </span>
            )}
          </div>
        </section>

        <nav
          className="mt-5 grid gap-3 sm:grid-cols-2"
          aria-label="Section navigation"
        >
          {previousChapter ? (
            <ReaderNavLink
              href={`/chapter/${previousChapter.id}`}
              eyebrow="Previous section"
              title={formatChapterTitle(previousChapter)}
            />
          ) : (
            <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.025] p-4 text-sm font-semibold text-[#7890AA]">
              First section
            </div>
          )}

          {nextChapter ? (
            <ReaderNavLink
              href={`/chapter/${nextChapter.id}`}
              eyebrow="Next section"
              title={formatChapterTitle(nextChapter)}
              alignRight
            />
          ) : (
            <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.025] p-4 text-sm font-semibold text-[#7890AA] sm:text-right">
              Final section
            </div>
          )}
        </nav>

        <section className="mx-auto mt-8 max-w-4xl">
          {verses.length === 0 ? (
            <EmptyState title="No passages are available for this section yet." />
          ) : (
            <article className="reader-panel rounded-[2rem] border border-white/12 bg-[#050E1F]/72 p-5 shadow-2xl shadow-black/35 backdrop-blur-2xl sm:p-8 lg:p-10">
              <div className="space-y-8">
                {verses.map((verse, index) => (
                  <section
                    key={verse.id}
                    className="reader-passage border-b border-white/8 pb-8 last:border-b-0 last:pb-0"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                      <p className="shrink-0 text-xs font-bold uppercase tracking-[0.16em] text-[#D4AF37]/80">
                        {formatVerseMarker(verse, index)}
                      </p>
                      <div className="min-w-0 flex-1">
                        {verse.content && (
                          <p className="text-xl leading-9 text-[#F8FAFC] sm:text-2xl sm:leading-10">
                            {verse.content}
                          </p>
                        )}
                        {verse.original_text && (
                          <p className="mt-5 border-l border-[#D4AF37]/30 pl-4 text-lg leading-8 text-[#DCE7F4]">
                            {verse.original_text}
                          </p>
                        )}
                        {verse.transliteration && (
                          <p className="mt-3 border-l border-white/12 pl-4 text-base italic leading-7 text-[#AFC0D4]">
                            {verse.transliteration}
                          </p>
                        )}
                        <div className="mt-5">
                          <FavoriteVerseButton verseId={verse.id} />
                        </div>
                      </div>
                    </div>
                  </section>
                ))}
              </div>
            </article>
          )}
        </section>

        <nav
          className="mx-auto mt-8 grid max-w-4xl gap-3 sm:grid-cols-2"
          aria-label="Bottom section navigation"
        >
          {previousChapter && (
            <ReaderNavLink
              href={`/chapter/${previousChapter.id}`}
              eyebrow="Previous section"
              title={formatChapterTitle(previousChapter)}
            />
          )}
          {nextChapter && (
            <ReaderNavLink
              href={`/chapter/${nextChapter.id}`}
              eyebrow="Next section"
              title={formatChapterTitle(nextChapter)}
              alignRight
            />
          )}
        </nav>
      </div>
    </PageShell>
  );
}

function ReaderNavLink({
  href,
  eyebrow,
  title,
  alignRight = false,
}: {
  href: string;
  eyebrow: string;
  title: string;
  alignRight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-[1.25rem] border border-white/12 bg-white/[0.045] p-4 shadow-xl shadow-black/18 backdrop-blur-xl transition hover:border-[#D4AF37]/45 hover:bg-white/[0.07] ${
        alignRight ? "sm:text-right" : ""
      }`}
    >
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#F5D76E]">
        {eyebrow}
      </p>
      <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-[#DCE7F4]">
        {title}
      </p>
    </Link>
  );
}
