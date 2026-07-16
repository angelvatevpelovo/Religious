import {
  BackLink,
  EmptyState,
  FeatureCard,
  HeroPanel,
  PageShell,
} from "../../../components/DesignSystem";
import { supabase } from "../../../lib/supabase";

type ChapterRow = {
  id: string;
  title: string | null;
  chapter_number: number | null;
  section_label?: string | null;
  display_title?: string | null;
  sort_order?: number | null;
};

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

export default async function BookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: book } = await supabase
    .from("holy_books")
    .select("*")
    .eq("id", id)
    .single();

  const { data: chaptersData } = await supabase
    .from("chapters")
    .select("*")
    .eq("book_id", id)
    .order("chapter_number", { ascending: true });

  const chapters = ((chaptersData ?? []) as ChapterRow[]).sort((first, second) => {
    const firstOrder = first.sort_order ?? first.chapter_number ?? 0;
    const secondOrder = second.sort_order ?? second.chapter_number ?? 0;

    return firstOrder - secondOrder;
  });
  const sectionLabel = chapters[0]?.section_label || "Section";

  return (
    <PageShell>
      <BackLink href="/book">Back to Books</BackLink>

      <HeroPanel
        className="mt-10"
        eyebrow="Sacred Text"
        title={book?.title ?? "Holy Book"}
        description={book?.description ?? "Choose a book to continue reading."}
      />

      <section className="mt-12">
        <h2 className="text-2xl font-bold text-[#F5D76E]">Sections</h2>
        <p className="mt-3 max-w-2xl text-[#CBD5E1]">
          Open a {sectionLabel.toLowerCase()} to continue reading this sacred
          text.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {chapters.length === 0 ? (
            <div className="sm:col-span-2 lg:col-span-3 xl:col-span-4">
              <EmptyState title="No sections found" />
            </div>
          ) : (
            chapters.map((chapter) => (
              <FeatureCard
                key={chapter.id}
                href={`/chapter/${chapter.id}`}
                eyebrow={chapter.section_label || "Section"}
                title={formatSectionTitle(chapter)}
                className="p-5"
              />
            ))
          )}
        </div>
      </section>
    </PageShell>
  );
}
