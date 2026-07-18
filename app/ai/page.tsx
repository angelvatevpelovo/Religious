import type { Metadata } from "next";
import { PageShell } from "../../components/DesignSystem";
import AIClient from "./AIClient";

export const metadata: Metadata = {
  title: "AI Spiritual Guide",
  description:
    "Ask spiritual and religious questions and receive informational, reflective AI guidance.",
  alternates: {
    canonical: "/ai",
  },
};

export default function AIPage() {
  return (
    <PageShell className="ai-shell relative overflow-hidden">
      <div className="ai-atmosphere pointer-events-none absolute inset-0" aria-hidden="true" />

      <div className="relative">
        <section className="overflow-hidden rounded-[2rem] border border-white/12 bg-[#061326]/72 p-6 shadow-2xl shadow-black/30 backdrop-blur-2xl sm:p-8 lg:p-10">
          <div className="max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#F5D76E]">
              Reflective guidance
            </p>
            <h1 className="mt-4 text-5xl font-black leading-tight tracking-normal text-[#F8FAFC] sm:text-6xl">
              AI Spiritual Guide
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-[#DCE7F4]">
              Ask questions about sacred texts, traditions, prayer, reflection,
              and spiritual learning.
            </p>
            <p className="mt-4 max-w-3xl leading-7 text-[#AFC0D4]">
              This guide is for reflection and education. It is not a
              replacement for religious leaders, professional counseling,
              medical advice, or emergency help.
            </p>
          </div>
        </section>

        <AIClient />
      </div>
    </PageShell>
  );
}
