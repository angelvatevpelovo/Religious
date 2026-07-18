import Link from "next/link";
import { BackLink, GlassCard, PageShell } from "../../../components/DesignSystem";
import { supabase } from "../../../lib/supabase";

export default async function ReligionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: religion } = await supabase
    .from("religions")
    .select("*")
    .eq("id", id)
    .single();

  return (
    <PageShell className="user-page-shell">
      <BackLink>Back Home</BackLink>

      <section className="mt-12 max-w-4xl">
        <GlassCard className="user-glass-panel p-6 sm:p-8">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#F5D76E]">
            Tradition
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-normal text-[#F8FAFC] sm:text-5xl">
            {religion?.name || "Religion"}
          </h1>

          {religion?.description && (
            <p className="mt-5 max-w-3xl text-lg leading-8 text-[#CBD5E1]">
              {religion.description}
            </p>
          )}
        </GlassCard>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <LegacyLink href={`/prayers/${id}`} title="Prayers" />
          <LegacyLink href="/ai" title="AI Guide" />
          <LegacyLink href="/book" title="Sacred Texts" />
          <LegacyLink href="/search" title="Search Library" />
        </div>
      </section>
    </PageShell>
  );
}

function LegacyLink({ href, title }: { href: string; title: string }) {
  return (
    <Link
      href={href}
      className="rounded-[1.5rem] border border-white/12 bg-white/[0.055] p-6 text-xl font-bold text-[#F8FAFC] shadow-2xl shadow-black/20 backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-[#D4AF37]/50 hover:bg-white/[0.08]"
    >
      {title}
    </Link>
  );
}
