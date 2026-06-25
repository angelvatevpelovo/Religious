require("dotenv").config({ path: ".env.local" });

const { createClient } = require("@supabase/supabase-js");
const events = require("./religious-events-data.json");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function eventExists(event) {
  const { data, error } = await supabase
    .from("religious_events")
    .select("id")
    .eq("title", event.title)
    .eq("event_date", event.event_date)
    .eq("religion", event.religion)
    .limit(1);

  if (error) throw error;

  return Boolean(data?.length);
}

async function main() {
  console.log("Starting religious events seed...");

  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (const event of events) {
    try {
      if (await eventExists(event)) {
        skipped += 1;
        continue;
      }

      const { error } = await supabase.from("religious_events").insert(event);
      if (error) throw error;

      inserted += 1;
      console.log(`Inserted: ${event.title} (${event.event_date})`);
    } catch (error) {
      errors += 1;
      console.error(`Error seeding ${event.title}:`, error.message || error);
    }
  }

  console.log("DONE! Religious events seed finished.");
  console.log("Seed summary:");
  console.log(`Inserted: ${inserted}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);

  if (errors > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("SEED FAILED:");
  console.error(error);
  process.exitCode = 1;
});
