import Link from "next/link";
import FavoriteButton from "../../../components/FavoriteButton";
import { BackLink, GlassCard, PageShell } from "../../../components/DesignSystem";
import { supabase } from "../../../lib/supabase";

export default async function PrayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: prayer, error } = await supabase
    .from("prayers")
    .select("*, religions(*)")
    .eq("id", id)
    .single();

  if (error || !prayer) {
    return (
      <PageShell className="user-page-shell">
        <BackLink>Back Home</BackLink>

        <GlassCard className="user-glass-panel mt-10 p-6 sm:p-8">
          <h1 className="text-4xl font-bold text-[#D4AF37]">
            Prayer not found
          </h1>
          <p className="mt-4 leading-7 text-[#CBD5E1]">
            This prayer is not available in the current collection.
          </p>
          <Link
            href="/book"
            className="mt-6 inline-flex rounded-2xl bg-[#D4AF37] px-5 py-3 text-sm font-bold text-[#071A2F] transition hover:bg-[#F5D76E]"
          >
            Explore Sacred Texts
          </Link>
        </GlassCard>
      </PageShell>
    );
  }

  return (
    <PageShell className="user-page-shell">
      <BackLink href={`/prayers/${prayer.religion_id}`}>Back to Prayers</BackLink>

      <section className="mx-auto mt-10 max-w-4xl">
        <GlassCard className="user-glass-panel p-6 sm:p-8">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#F5D76E]">
            {prayer.religions?.name || "Prayer"}
          </p>

          <h1 className="mt-4 text-4xl font-black tracking-normal text-[#F8FAFC] sm:text-5xl">
            {prayer.title}
          </h1>

          {prayer.category && (
            <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-[#F5D76E]">
              {prayer.category}
            </p>
          )}

          <div className="user-gold-divider mt-8" />

          <p className="mt-8 whitespace-pre-line text-lg leading-9 text-[#E2E8F0]">
            {prayer.content}
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <FavoriteButton prayerId={prayer.id} />
          </div>
        </GlassCard>
      </section>
    </PageShell>
  );
}
