import { HeroPanel, PageShell } from "../../components/DesignSystem";
import AIHistoryClient from "./AIHistoryClient";

export default function AIHistoryPage() {
  return (
    <PageShell>
      <HeroPanel
        eyebrow="AI Assistant"
        title="AI History"
        description="Review saved spiritual questions and reflective answers from your logged-in sessions."
      />

      <AIHistoryClient />
    </PageShell>
  );
}
