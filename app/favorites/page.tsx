import Link from "next/link";
import {
  BackLink,
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
      <PageShell className="user-page-shell">
        <BackLink>Back Home</BackLink>
        <GlassCard className="user-glass-panel mt-10 p-8">
          <SectionHeader
            eyebrow="Favorites"
            title="Login required"
            description="Sign in to see your saved prayers and sacred passages."
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
    <PageShell className="user-page-shell">
      <BackLink>Back Home</BackLink>

      <SectionHeader
        className="mt-10"
        eyebrow="Saved Space"
        title="Favorites"
        description="Your saved prayers and sacred passages."
      />

      <div className="mt-10 grid gap-5">
        {!favorites.length ? (
          <GlassCard className="user-glass-panel p-8 text-center">
            <div className="mx-auto h-14 w-14 rounded-full border border-[#D4AF37]/50 bg-[#D4AF37]/10 shadow-lg shadow-[#D4AF37]/10" />
            <h2 className="mt-5 text-2xl font-bold text-[#F8FAFC]">
              No favorites saved yet.
            </h2>
            <p className="mx-auto mt-3 max-w-xl leading-7 text-[#CBD5E1]">
              Open a sacred text and save passages you want to revisit.
            </p>
            <Link
              href="/book"
              className="mt-6 inline-flex rounded-2xl bg-[#D4AF37] px-5 py-3 text-sm font-bold text-[#071A2F] transition hover:bg-[#F5D76E]"
            >
              Explore Sacred Texts
            </Link>
          </GlassCard>
        ) : (
          favorites.map((item) => {
            const verse = firstValue(item.verses);
            const chapter = firstValue(verse?.chapters);
            const label = `${chapter?.title ?? "Bible"} ${
              chapter?.chapter_number ?? ""
            }:${verse?.verse_number ?? ""}`.trim();

            return (
              <Link
                key={item.id}
                href={chapter?.id ? `/chapter/${chapter.id}` : "/book"}
                className="group block rounded-[2rem] border border-white/12 bg-white/[0.055] p-6 shadow-2xl shadow-black/20 backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-[#D4AF37]/55 hover:bg-white/[0.08]"
              >
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#F5D76E]">
                  {label}
                </p>
                <h2 className="mt-4 text-xl font-semibold leading-8 text-[#F8FAFC]">
                  {verse?.content ?? "Saved verse"}
                </h2>
                <p className="mt-5 text-sm font-bold text-[#F5D76E] transition group-hover:text-[#F8FAFC]">
                  Open chapter
                </p>
              </Link>
            );
          })
        )}
      </div>
    </PageShell>
  );
}
