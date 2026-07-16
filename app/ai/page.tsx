import type { Metadata } from "next";
import { HeroPanel, PageShell } from "../../components/DesignSystem";
import AIClient from "./AIClient";

export const metadata: Metadata = {
  title: "AI Religious Guide",
  description:
    "Ask spiritual and religious questions and receive informational, reflective AI guidance.",
  alternates: {
    canonical: "/ai",
  },
};

export default function AIPage() {
  return (
    <PageShell>
      <HeroPanel
        eyebrow="AI Religious Guide"
        title="Ask with context, continue with care"
        description="A respectful guide that can use RELIGIOUS data from sacred texts, prayers, temples, nearby places and your saved favorites."
      />

      <AIClient />
    </PageShell>
  );
}
