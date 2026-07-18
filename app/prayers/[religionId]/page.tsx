import Link from "next/link";
import {
  BackLink,
  GlassCard,
  PageShell,
  SectionHeader,
} from "../../../components/DesignSystem";
import { supabase } from "../../../lib/supabase";

export default async function PrayersPage({
  params,
}: {
  params: Promise<{ religionId: string }>;
}) {
  const { religionId } = await params;

  const { data: religion } = await supabase
    .from("religions")
    .select("*")
    .eq("id", religionId)
    .single();

  const { data: prayers, error } = await supabase
    .from("prayers")
    .select("*")
    .eq("religion_id", religionId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Prayers error:", error);
  }

  return (
    <PageShell className="user-page-shell">
      <BackLink href={`/religion/${religionId}`}>Back to tradition</BackLink>

      <SectionHeader
        className="mt-10"
        eyebrow={religion?.name || "Prayers"}
        title="Prayers"
        description="A quiet collection of prayers connected to this tradition."
      />

      <div className="mt-10 grid gap-5">
        {!prayers || prayers.length === 0 ? (
          <GlassCard className="user-glass-panel p-6">
            <h2 className="text-2xl font-bold text-[#F8FAFC]">
              No prayers are available yet.
            </h2>
            <p className="mt-3 leading-7 text-[#CBD5E1]">
              This tradition does not have prayer entries in the current
              collection.
            </p>
          </GlassCard>
        ) : (
          prayers.map((prayer) => (
            <Link
              key={prayer.id}
              href={`/prayer/${prayer.id}`}
              className="group block rounded-[1.5rem] border border-white/12 bg-white/[0.055] p-6 shadow-2xl shadow-black/20 backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-[#D4AF37]/50 hover:bg-white/[0.08]"
            >
              <h2 className="text-2xl font-bold text-[#F8FAFC]">
                {prayer.title}
              </h2>

              {prayer.category && (
                <p className="mt-2 text-xs font-bold uppercase tracking-[0.18em] text-[#F5D76E]">
                  {prayer.category}
                </p>
              )}

              <p className="mt-4 line-clamp-4 leading-7 text-[#CBD5E1]">
                {prayer.content}
              </p>
              <p className="mt-5 text-sm font-bold text-[#F5D76E] transition group-hover:text-[#FFF3B0]">
                Open prayer
              </p>
            </Link>
          ))
        )}
      </div>
    </PageShell>
  );
}
