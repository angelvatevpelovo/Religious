import type { Metadata } from "next";
import {
  GlassCard,
  HeroPanel,
  PageShell,
  SectionHeader,
} from "../../components/DesignSystem";

export const metadata: Metadata = {
  title: "Terms",
  description:
    "Terms and usage notes for RELIGIOUS, including informational content, AI guidance and public temple data.",
  alternates: {
    canonical: "/terms",
  },
};

const terms = [
  {
    title: "Informational content",
    body: "RELIGIOUS provides religious, spiritual and location content for informational and reflective purposes.",
  },
  {
    title: "AI assistant limits",
    body: "The AI assistant is not clergy, legal, medical, mental health or professional advice.",
  },
  {
    title: "Verify guidance",
    body: "Users should verify religious guidance with trusted spiritual leaders, communities and primary sources.",
  },
  {
    title: "Temple and location data",
    body: "Temple and sacred-place data may come from public sources and may contain inaccuracies, missing details or outdated information.",
  },
  {
    title: "User discretion",
    body: "Users choose how to use RELIGIOUS and should use the site at their own discretion.",
  },
];

export default function TermsPage() {
  return (
    <PageShell className="user-page-shell">
      <HeroPanel
        className="user-glass-panel"
        eyebrow="Terms"
        title="Use RELIGIOUS with care and discernment"
        description="These basic terms describe how to understand the information, AI responses and public location data in RELIGIOUS."
      />

      <section className="mt-16">
        <SectionHeader
          eyebrow="Usage notes"
          title="Important limitations"
          description="RELIGIOUS is a launch-stage resource. It can support study and reflection, but it should not replace trusted human guidance."
        />

        <div className="mt-8 grid gap-5">
          {terms.map((item) => (
            <GlassCard key={item.title} className="user-glass-panel p-6 sm:p-8">
              <h2 className="text-2xl font-bold text-[#F8FAFC]">
                {item.title}
              </h2>
              <p className="mt-3 leading-7 text-[#CBD5E1]">{item.body}</p>
            </GlassCard>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
