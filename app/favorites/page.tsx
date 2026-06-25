import Link from "next/link";
import {
  BackLink,
  EmptyState,
  FeatureCard,
  GlassCard,
  PageShell,
  SectionHeader,
} from "../../components/DesignSystem";
import { supabase } from "../../lib/supabase";

type MaybeArray<T> = T | T[] | null;

type FavoriteVerse = {
  id: string;
  created_at: string | null;
  verses: MaybeArray<{
    id: string;
    verse_number: number | null;
    content: string | null;
    chapters: MaybeArray<{
      id: string;
      title: string | null;
      chapter_number: number | null;
    }>;
  }>;
};

function firstValue<T>(value: MaybeArray<T> | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export default async function FavoritesPage() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <PageShell>
        <BackLink>Back Home</BackLink>
        <GlassCard className="mt-10 p-8">
          <SectionHeader
            eyebrow="Favorites"
            title="Login required"
            description="Please login to see your saved verses."
            action={
              <Link
                href="/auth"
                className="inline-flex rounded-2xl bg-[#D4AF37] px-5 py-3 text-sm font-bold text-[#071A2F] transition hover:bg-[#F5D76E]"
              >
                Go to Login
              </Link>
            }
          />
        </GlassCard>
      </PageShell>
    );
  }

  const { data: favoritesData } = await supabase
    .from("favorite_verses")
    .select(`
      id,
      created_at,
      verses (
        id,
        verse_number,
        content,
        chapters (
          id,
          title,
          chapter_number
        )
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const favorites = (favoritesData ?? []) as unknown as FavoriteVerse[];

  return (
    <PageShell>
      <BackLink>Back Home</BackLink>

      <SectionHeader
        className="mt-10"
        eyebrow="Saved Scripture"
        title="Favorite Verses"
        description="A quiet place for verses you want to return to."
      />

      <div className="mt-10 grid gap-5">
        {!favorites.length ? (
          <EmptyState
            title="No favorite verses yet"
            description="Favorite verses from a chapter page and they will appear here."
          />
        ) : (
          favorites.map((item) => {
            const verse = firstValue(item.verses);
            const chapter = firstValue(verse?.chapters);
            const label = `${chapter?.title ?? "Bible"} ${
              chapter?.chapter_number ?? ""
            }:${verse?.verse_number ?? ""}`.trim();

            return (
              <FeatureCard
                key={item.id}
                href={chapter?.id ? `/chapter/${chapter.id}` : "/book"}
                eyebrow={label}
                title={verse?.content ?? "Saved verse"}
                className="p-6"
              >
                <p className="mt-4 text-sm font-semibold text-[#F5D76E]">
                  Open chapter
                </p>
              </FeatureCard>
            );
          })
        )}
      </div>
    </PageShell>
  );
}
