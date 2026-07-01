import { HeroPanel, PageShell } from "../../components/DesignSystem";
import AIClient from "./AIClient";

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
