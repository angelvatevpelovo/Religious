import Link from "next/link";
import { BackLink, GlassCard, HeroPanel, PageShell } from "../../components/DesignSystem";

export default function RemindersPage() {
  return (
    <PageShell>
      <BackLink>Back Home</BackLink>

      <HeroPanel
        className="mt-10"
        eyebrow="Coming Soon"
        title="Reminders"
        description="Personal prayer, reflection and sacred event reminders are planned for version 2. For the first MVP, this page is intentionally paused so the launch stays stable."
      />

      <GlassCard className="mt-8 p-6 sm:p-8">
        <h2 className="text-2xl font-bold text-[#D4AF37]">
          Reminders are deferred to V2
        </h2>
        <p className="mt-3 max-w-3xl leading-7 text-[#CBD5E1]">
          The first MVP focuses on sacred texts, search, temples, favorites and the AI
          Assistant. Reminder scheduling will return after the database and notification
          flow are finalized.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/ai"
            className="rounded-2xl bg-[#D4AF37] px-5 py-3 text-sm font-bold text-[#071A2F] transition hover:bg-[#F5D76E]"
          >
            Open AI Assistant
          </Link>
          <Link
            href="/temples"
            className="rounded-2xl border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-5 py-3 text-sm font-bold text-[#F5D76E] transition hover:bg-[#D4AF37]/20"
          >
            Explore Temples
          </Link>
        </div>
      </GlassCard>
    </PageShell>
  );
}
