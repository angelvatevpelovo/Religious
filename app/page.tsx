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

const sacredSymbols = [
  { symbol: "\u271d", className: "sacred-symbol-one" },
  { symbol: "\u262a", className: "sacred-symbol-two" },
  { symbol: "\u2721", className: "sacred-symbol-three" },
  { symbol: "\u2638", className: "sacred-symbol-four" },
  { symbol: "\u0950", className: "sacred-symbol-five" },
  { symbol: "\u262f", className: "sacred-symbol-six" },
  { symbol: "\u262c", className: "sacred-symbol-seven" },
  { symbol: "\u2625", className: "sacred-symbol-eight" },
];

function HeroAtmosphere() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="sacred-symbol-field absolute inset-0">
        {sacredSymbols.map((item) => (
          <span key={item.className} className={`sacred-symbol ${item.className}`}>
            {item.symbol}
          </span>
        ))}
      </div>
      <div className="hero-image-stardust absolute inset-0" />
      <div className="hero-portal-glow absolute" />
      <div className="hero-bottom-vignette absolute inset-x-0 bottom-0" />
    </div>
  );
}

export default function HomePage() {
  return (
    <PageShell className="home-page-shell relative overflow-hidden">
      <div className="relative">
        <section className="home-hero-image relative left-1/2 -mt-28 flex min-h-screen w-screen -translate-x-1/2 items-center overflow-hidden px-4 pb-14 pt-36 sm:px-8 sm:pb-16 sm:pt-40 lg:px-10 lg:pb-20 lg:pt-44">
          <HeroAtmosphere />

          <div className="relative z-10 mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
            <div className="relative max-w-4xl lg:pr-10">
              <div className="hero-readability-field absolute -inset-x-8 -inset-y-10 -z-10 rounded-[3rem]" />
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

            <div className="hero-image-focus min-h-[16rem] sm:min-h-[24rem] lg:min-h-[34rem]" aria-hidden="true" />
          </div>
        </section>

        <section className="home-cards-section relative z-10 pb-12 pt-12">
          <div className="grid gap-4 md:grid-cols-3">
            {mainFeatures.map((feature) => (
              <Link
                key={feature.title}
                href={feature.href}
                className="home-feature-card premium-glass group rounded-[1.5rem] p-6 transition hover:-translate-y-1 hover:border-[#D4AF37]/45"
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
