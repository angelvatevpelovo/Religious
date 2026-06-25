require("dotenv").config({ path: ".env.local" });

const { createClient } = require("@supabase/supabase-js");
const axios = require("axios");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

const cities = [
  { name: "Sofia", lat: 42.6977, lng: 23.3219, radius: 30000 },
  { name: "Istanbul", lat: 41.0082, lng: 28.9784, radius: 30000 },
  { name: "Jerusalem", lat: 31.7683, lng: 35.2137, radius: 30000 },
  { name: "Rome", lat: 41.9028, lng: 12.4964, radius: 30000 },
  { name: "Mecca", lat: 21.4225, lng: 39.8262, radius: 30000 },
  { name: "Amritsar", lat: 31.634, lng: 74.8723, radius: 30000 },
  { name: "Varanasi", lat: 25.3176, lng: 82.9739, radius: 30000 },
  { name: "Bangkok", lat: 13.7563, lng: 100.5018, radius: 30000 },
  { name: "Athens", lat: 37.9838, lng: 23.7275, radius: 30000 },
  { name: "Cairo", lat: 30.0444, lng: 31.2357, radius: 30000 },
];

function buildQuery(city) {
  return `
    [out:json][timeout:60];

    (
      node["amenity"="place_of_worship"](around:${city.radius},${city.lat},${city.lng});
      way["amenity"="place_of_worship"](around:${city.radius},${city.lat},${city.lng});
      relation["amenity"="place_of_worship"](around:${city.radius},${city.lat},${city.lng});
    );

    out center tags;
  `;
}

function templeType(tags = {}) {
  if (tags.religion) return tags.religion;
  if (tags.denomination) return tags.denomination;
  return "Religious place";
}

function templeName(element) {
  return (
    element.tags?.name ||
    element.tags?.["name:en"] ||
    element.tags?.["official_name"] ||
    null
  );
}

function templeAddress(element, cityName) {
  const tags = element.tags || {};

  const street = tags["addr:street"] || "";
  const number = tags["addr:housenumber"] || "";

  const address = `${street} ${number}`.trim();

  return address || cityName;
}

function templeCity(element, fallbackCity) {
  const tags = element.tags || {};

  return (
    tags["addr:city"] ||
    tags["addr:town"] ||
    tags["addr:village"] ||
    fallbackCity
  );
}

function templeCountry(element) {
  const tags = element.tags || {};

  return tags["addr:country"] || null;
}

function templeDescription(element) {
  const tags = element.tags || {};

  const religion = tags.religion || "religious";
  const denomination = tags.denomination ? ` (${tags.denomination})` : "";

  return `A ${religion}${denomination} place of worship.`;
}

async function upsertTemples(rows) {
  if (!rows.length) return;

  const { error } = await supabase
    .from("temples")
    .upsert(rows, {
      onConflict: "external_id",
    });

  if (error) {
    console.error("Supabase insert error:", error);
    throw error;
  }
}

async function importCity(city) {
  console.log(`Importing temples around ${city.name}...`);

  const query = buildQuery(city);

  const { data } = await axios.post(
    OVERPASS_URL,
    query,
    {
      headers: {
        "Content-Type": "text/plain",
      },
      timeout: 90000,
    }
  );

  const elements = data.elements || [];

  const temples = elements
    .map((element) => {
      const name = templeName(element);

      if (!name) return null;

      const latitude = element.lat || element.center?.lat;
      const longitude = element.lon || element.center?.lon;

      if (!latitude || !longitude) return null;

      return {
        external_id: `osm-${element.type}-${element.id}`,
        source: "OpenStreetMap",
        religion_id: null,
        name,
        type: templeType(element.tags),
        country: templeCountry(element) || "Unknown",
        city: templeCity(element, city.name),
        address: templeAddress(element, city.name),
        latitude,
        longitude,
        phone: element.tags?.phone || null,
        website: element.tags?.website || null,
        description: templeDescription(element),
      };
    })
    .filter(Boolean);

  console.log(`Found ${temples.length} temples in ${city.name}`);

  await upsertTemples(temples);

  console.log(`Imported ${temples.length} temples from ${city.name}`);
}

async function main() {
  console.log("Starting temple import...");

  for (const city of cities) {
    try {
      await importCity(city);
    } catch (error) {
      console.error(`Failed importing ${city.name}:`, error.message);
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  console.log("DONE! Temple import finished.");
}

main().catch((error) => {
  console.error("IMPORT FAILED:", error);
});