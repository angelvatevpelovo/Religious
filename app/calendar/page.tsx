import { HeroPanel, PageShell } from "../../components/DesignSystem";
import { supabase } from "../../lib/supabase";
import CalendarClient, { ReligiousEvent } from "./CalendarClient";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const { data, error } = await supabase
    .from("religious_events")
    .select(
      "id, religion, title, description, event_date, country, is_global, created_at"
    )
    .order("event_date", { ascending: true });

  return (
    <PageShell>
      <HeroPanel
        eyebrow="Priority 4"
        title="Religious Calendar"
        description="Upcoming sacred days, festivals and observances across religious traditions."
      />

      <CalendarClient
        events={(data ?? []) as ReligiousEvent[]}
        error={error ? "Could not load religious events." : ""}
      />
    </PageShell>
  );
}
