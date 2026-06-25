require("dotenv").config({ path: ".env.local" });

const { createClient } = require("@supabase/supabase-js");
const sampleTemples = require("./temples-data.json");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function findExistingTemples(temple) {
  const { data, error } = await supabase
    .from("temples")
    .select("id, image_url")
    .eq("name", temple.name)
    .eq("city", temple.city)
    .eq("country", temple.country);

  if (error) throw error;

  return data ?? [];
}

async function updateMissingImage(existingTemples, temple) {
  if (!temple.image_url) return 0;

  let updated = 0;

  for (const existingTemple of existingTemples) {
    if (existingTemple.image_url) continue;

    const { error } = await supabase
      .from("temples")
      .update({ image_url: temple.image_url })
      .eq("id", existingTemple.id);

    if (error) throw error;

    updated += 1;
  }

  return updated;
}

async function main() {
  console.log("Starting temple seed...");

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const temple of sampleTemples) {
    try {
      const existingTemples = await findExistingTemples(temple);

      if (existingTemples.length > 0) {
        const updatedImages = await updateMissingImage(existingTemples, temple);

        if (updatedImages > 0) {
          updated += updatedImages;
          console.log(`Updated image: ${temple.name}`);
        } else {
          skipped += 1;
        }

        continue;
      }

      const { error } = await supabase.from("temples").insert(temple);

      if (error) throw error;

      inserted += 1;
      console.log(`Inserted: ${temple.name}`);
    } catch (error) {
      errors += 1;
      console.error(`Error seeding ${temple.name}:`, error.message || error);
    }
  }

  console.log("DONE! Temple seed finished.");
  console.log("Seed summary:");
  console.log(`Inserted: ${inserted}`);
  console.log(`Updated: ${updated}`);
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
