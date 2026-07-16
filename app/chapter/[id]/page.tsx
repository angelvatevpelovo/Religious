import FavoriteVerseButton from "../../../components/FavoriteVerseButton";
import {
  BackLink,
  EmptyState,
  GlassCard,
  HeroPanel,
  PageShell,
} from "../../../components/DesignSystem";
import { supabase } from "../../../lib/supabase";

type ChapterRow = {
  title: string | null;
  chapter_number: number | null;
  section_label?: string | null;
  display_title?: string | null;
};

type VerseRow = {
  id: string;
  verse_number: number | null;
  content: string | null;
  verse_label?: string | null;
  sort_order?: number | null;
};

function formatChapterTitle(chapter: ChapterRow | null) {
  if (!chapter) return "Section";

  if (chapter.display_title?.trim()) {
    return chapter.display_title;
  }

  return `${chapter.title ?? "Section"} ${chapter.chapter_number ?? ""}`.trim();
}

function formatVerseMarker(verse: VerseRow) {
  const label = verse.verse_label || "Verse";

  if (verse.verse_number === null || verse.verse_number === undefined) {
    return label;
  }

  return `${label} ${verse.verse_number}`;
}

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: chapter } = await supabase
    .from("chapters")
    .select("*")
    .eq("id", id)
    .single();

  const { data: versesData } = await supabase
    .from("verses")
    .select("*")
    .eq("chapter_id", id)
    .order("verse_number", { ascending: true });
  const verses = ((versesData ?? []) as VerseRow[]).sort((first, second) => {
    const firstOrder = first.sort_order ?? first.verse_number ?? 0;
    const secondOrder = second.sort_order ?? second.verse_number ?? 0;

    return firstOrder - secondOrder;
  });

  return (
    <PageShell>
      <BackLink>Back Home</BackLink>

      <HeroPanel
        className="mt-10"
        eyebrow={chapter?.section_label || "Section"}
        title={formatChapterTitle(chapter as ChapterRow | null)}
        description="Read slowly, one passage at a time."
      />

      <div className="mt-10 space-y-4">
        {verses.length === 0 ? (
          <EmptyState title="No passages found" />
        ) : (
          verses.map((verse) => (
            <GlassCard key={verse.id} className="p-5 sm:p-6">
              <p className="text-lg leading-8 text-[#F8FAFC] sm:text-xl">
                <span className="mr-3 text-sm font-bold uppercase tracking-[0.14em] text-[#F5D76E]">
                  {formatVerseMarker(verse)}
                </span>
                {verse.content}
              </p>

              <div className="mt-4">
                <FavoriteVerseButton verseId={verse.id} />
              </div>
            </GlassCard>
          ))
        )}
      </div>
    </PageShell>
  );
}
