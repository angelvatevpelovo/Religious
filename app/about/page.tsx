import type { Metadata } from "next";
import {
  FeatureCard,
  GlassCard,
  HeroPanel,
  PageShell,
  SectionHeader,
} from "../../components/DesignSystem";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn about RELIGIOUS, a respectful multi-faith resource for Bible search, prayers, temples and reflective AI guidance.",
  alternates: {
    canonical: "/about",
  },
};

export default function AboutPage() {
  return (
    <PageShell>
      <HeroPanel
        eyebrow="About RELIGIOUS"
        title="A respectful place to explore faith, prayer and sacred text"
        description="RELIGIOUS brings together scripture search, prayers, sacred places and reflective AI guidance in one calm multi-faith resource."
      />

      <section className="mt-16">
        <SectionHeader
          eyebrow="Launch mission"
          title="Built for careful spiritual exploration"
          description="The first version focuses on simple, useful tools that help people read, search, reflect and discover without replacing real communities or trusted spiritual leaders."
        />

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <FeatureCard
            eyebrow="Sacred text"
            title="Bible search"
            description="Search and read biblical passages with a quiet interface designed for focused study."
          />
          <FeatureCard
            eyebrow="Prayer"
            title="Prayers"
            description="Browse prayer resources and return to meaningful reflections when you need them."
          />
          <FeatureCard
            eyebrow="Places"
            title="Temples map"
            description="Explore temples and sacred places with cards, filters and an interactive map."
          />
          <FeatureCard
            eyebrow="Reflection"
            title="AI assistant"
            description="Ask religious or spiritual questions and receive informational, reflective guidance."
          />
        </div>
      </section>

      <section className="mt-16">
        <GlassCard className="p-6 sm:p-8">
          <h2 className="text-3xl font-bold text-[#F8FAFC]">
            A multi-faith resource
          </h2>
          <p className="mt-4 max-w-4xl leading-8 text-[#CBD5E1]">
            RELIGIOUS is designed to treat religious traditions with respect and
            care. It can support study and reflection across traditions, but it
            should be used alongside trusted texts, communities, clergy and
            spiritual leaders.
          </p>
        </GlassCard>
      </section>
    </PageShell>
  );
}
