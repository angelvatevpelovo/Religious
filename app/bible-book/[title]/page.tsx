import Link from "next/link";
import { BackLink, GlassCard, PageShell } from "../../../components/DesignSystem";

export default async function BibleBookPage({
  params,
}: {
  params: Promise<{ title: string }>;
}) {
  const { title } = await params;
  const bookTitle = decodeURIComponent(title);

  return (
    <PageShell className="user-page-shell">
      <BackLink href="/book">Back to Sacred Texts Library</BackLink>

      <section className="mx-auto mt-12 max-w-3xl">
        <GlassCard className="user-glass-panel p-6 sm:p-8">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#F5D76E]">
            Legacy Bible Link
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-normal text-[#F8FAFC] sm:text-5xl">
            {bookTitle}
          </h1>
          <p className="mt-5 leading-8 text-[#CBD5E1]">
            This older Bible-only page has been replaced by the expanded Sacred
            Texts Library. Open the library to browse the Bible and other sacred
            texts with the new reader experience.
          </p>
          <Link
            href="/book"
            className="mt-7 inline-flex rounded-2xl bg-[#D4AF37] px-5 py-3 text-sm font-bold text-[#071A2F] transition hover:bg-[#F5D76E]"
          >
            Open Sacred Texts Library
          </Link>
        </GlassCard>
      </section>
    </PageShell>
  );
}
