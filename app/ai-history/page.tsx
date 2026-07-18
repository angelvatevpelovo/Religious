import { HeroPanel, PageShell } from "../../components/DesignSystem";
import AIHistoryClient from "./AIHistoryClient";

export default function AIHistoryPage() {
  return (
    <PageShell className="user-page-shell">
      <HeroPanel
        className="user-glass-panel mt-10"
        eyebrow="AI Assistant"
        title="AI History"
        description="Review your previous spiritual reflections and the questions you explored while signed in."
      />

      <AIHistoryClient />
    </PageShell>
  );
}
