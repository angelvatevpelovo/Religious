import FavoriteVerseButton from "../../../components/FavoriteVerseButton";
import {
  BackLink,
  EmptyState,
  GlassCard,
  HeroPanel,
  PageShell,
} from "../../../components/DesignSystem";
import { supabase } from "../../../lib/supabase";

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

  const { data: verses } = await supabase
    .from("verses")
    .select("*")
    .eq("chapter_id", id)
    .order("verse_number", { ascending: true });

  return (
    <PageShell>
      <BackLink>Back Home</BackLink>

      <HeroPanel
        className="mt-10"
        eyebrow="Chapter"
        title={
          chapter
            ? `${chapter.title} ${chapter.chapter_number ?? ""}`.trim()
            : "Chapter"
        }
        description="Read slowly, one verse at a time."
      />

      <div className="mt-10 space-y-4">
        {!verses || verses.length === 0 ? (
          <EmptyState title="No verses found" />
        ) : (
          verses.map((verse) => (
            <GlassCard key={verse.id} className="p-5 sm:p-6">
              <p className="text-lg leading-8 text-[#F8FAFC] sm:text-xl">
                <span className="mr-3 font-bold text-[#F5D76E]">
                  {verse.verse_number}
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
