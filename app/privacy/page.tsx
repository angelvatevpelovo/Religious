import type { Metadata } from "next";
import {
  GlassCard,
  HeroPanel,
  PageShell,
  SectionHeader,
} from "../../components/DesignSystem";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "Privacy information for RELIGIOUS, including public access, Supabase Auth, favorites and AI history.",
  alternates: {
    canonical: "/privacy",
  },
};

const privacyItems = [
  {
    title: "Public access",
    body: "You can use public pages such as search, books, temples and the AI assistant without creating an account.",
  },
  {
    title: "Accounts",
    body: "Accounts and authentication are handled by Supabase Auth. RELIGIOUS uses authentication to identify your private saved content.",
  },
  {
    title: "User-specific data",
    body: "Favorites, AI history and personal account data are intended to be visible only to the user who created them.",
  },
  {
    title: "Private sharing",
    body: "RELIGIOUS does not intentionally share private user data with other users.",
  },
  {
    title: "AI questions",
    body: "AI questions and answers may be saved for logged-in users so they can view their own history later.",
  },
  {
    title: "Sensitive information",
    body: "Avoid entering highly sensitive personal, medical, legal, financial or mental health information into the AI chat.",
  },
];

export default function PrivacyPage() {
  return (
    <PageShell>
      <HeroPanel
        eyebrow="Privacy"
        title="Privacy basics for RELIGIOUS"
        description="This page explains the basic privacy expectations for the first public version of RELIGIOUS."
      />

      <section className="mt-16">
        <SectionHeader
          eyebrow="Data use"
          title="What to know before using the app"
          description="RELIGIOUS separates public browsing from logged-in personal features such as favorites and AI history."
        />

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {privacyItems.map((item) => (
            <GlassCard key={item.title} className="p-6">
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
