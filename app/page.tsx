import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "../components/DesignSystem";

export const metadata: Metadata = {
  title: "RELIGIOUS",
  description:
    "Explore sacred wisdom across religions through holy books, search, temples and calm reflective guidance.",
  alternates: {
    canonical: "/",
  },
};

const mainFeatures = [
  {
    title: "Holy Books",
    description: "Read sacred texts from many religious traditions.",
    cta: "Open Library",
    href: "/book",
  },
  {
    title: "Temples",
    description: "Explore sacred places and temples around the world.",
    cta: "Explore Temples",
    href: "/temples",
  },
  {
    title: "AI Guide",
    description: "Ask spiritual questions with calm guidance.",
    cta: "Ask AI Guide",
    href: "/ai",
  },
];

const secondaryLinks = [
  { href: "/about", label: "About" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/reminders", label: "Reminders" },
  { href: "/favorites", label: "Favorites" },
  { href: "/ai-history", label: "AI History" },
];

function SacredRings() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="sacred-depth-field absolute inset-0" />
      <div className="sacred-ring sacred-ring-one" />
      <div className="sacred-ring sacred-ring-two" />
      <div className="sacred-ring sacred-ring-three" />
      <div className="cosmic-grid absolute inset-0 opacity-35" />
    </div>
  );
}

export default function HomePage() {
  return (
    <PageShell className="relative overflow-hidden">
      <SacredRings />

      <div className="relative">
        <section className="relative flex min-h-[calc(100svh-9rem)] items-center py-10 sm:py-14 lg:py-20">
          <div className="mx-auto grid w-full gap-10 lg:grid-cols-[1.06fr_0.94fr] lg:items-center">
            <div className="max-w-4xl">
              <div className="inline-flex rounded-full border border-[#D4AF37]/35 bg-[#D4AF37]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-[#F5D76E] shadow-lg shadow-[#D4AF37]/10 backdrop-blur">
                Sacred wisdom across humanity
              </div>

              <h1 className="mt-7 max-w-5xl text-5xl font-black leading-[0.98] tracking-normal text-[#F8FAFC] sm:text-6xl lg:text-7xl">
                Explore Sacred Wisdom Across Religions
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-[#DCE7F4] sm:text-xl">
                Read holy books, discover spiritual traditions, explore
                temples, and search timeless wisdom in one calm sacred space.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/book"
                  className="inline-flex items-center justify-center rounded-2xl bg-[#D4AF37] px-6 py-3.5 text-sm font-black text-[#071A2F] shadow-2xl shadow-[#D4AF37]/20 transition hover:bg-[#F5D76E]"
                >
                  Explore Holy Books
                </Link>
                <Link
                  href="/search"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/14 bg-white/[0.07] px-6 py-3.5 text-sm font-bold text-[#F8FAFC] shadow-xl shadow-black/10 backdrop-blur transition hover:border-[#D4AF37]/45 hover:bg-white/[0.11] hover:text-[#F5D76E]"
                >
                  Search Texts
                </Link>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
              <div className="premium-glass sacred-orbit-panel relative min-h-[24rem] overflow-hidden rounded-[2rem] p-7 sm:p-8">
                <div className="absolute inset-8 rounded-full border border-[#D4AF37]/20" />
                <div className="absolute inset-16 rounded-full border border-white/10" />
                <div className="absolute left-1/2 top-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/10 shadow-[0_0_80px_rgba(212,175,55,0.22)]" />
                <div className="relative flex min-h-[20rem] flex-col justify-end">
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#F5D76E]">
                    Calm digital sanctuary
                  </p>
                  <p className="mt-4 max-w-sm text-2xl font-semibold leading-9 text-[#F8FAFC]">
                    A quieter way to study, reflect and return to what matters.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="pb-12">
          <div className="grid gap-4 md:grid-cols-3">
            {mainFeatures.map((feature) => (
              <Link
                key={feature.title}
                href={feature.href}
                className="premium-glass group rounded-[1.5rem] p-6 transition hover:-translate-y-1 hover:border-[#D4AF37]/45 hover:bg-white/[0.09]"
              >
                <h2 className="text-2xl font-bold text-[#F8FAFC]">
                  {feature.title}
                </h2>
                <p className="mt-3 min-h-16 leading-7 text-[#CBD5E1]">
                  {feature.description}
                </p>
                <span className="mt-5 inline-flex text-sm font-bold text-[#F5D76E] transition group-hover:text-[#FFF3B0]">
                  {feature.cta}
                </span>
              </Link>
            ))}
          </div>
        </section>

        <footer className="pb-28 pt-4 md:pb-12">
          <div className="flex flex-col gap-5 border-t border-white/10 pt-7 text-sm text-[#94A3B8] sm:flex-row sm:items-center sm:justify-between">
            <p>RELIGIOUS keeps sacred tools close, without crowding the path.</p>
            <nav className="flex flex-wrap gap-x-5 gap-y-3">
              {secondaryLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="transition hover:text-[#F5D76E]"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </footer>
      </div>
    </PageShell>
  );
}
