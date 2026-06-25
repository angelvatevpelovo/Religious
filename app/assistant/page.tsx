import { HeroPanel, PageShell } from "../../components/DesignSystem";
import AssistantClient from "./AssistantClient";

export default function AssistantPage() {
  return (
    <PageShell>
      <HeroPanel
        eyebrow="Priority 6"
        title="AI Religious Assistant"
        description="Ask thoughtful questions about prayers, holy books, sacred places, spiritual routines and religious calendars."
      />

      <AssistantClient />
    </PageShell>
  );
}
