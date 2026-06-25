require("dotenv").config({ path: ".env.local" });

const { createClient } = require("@supabase/supabase-js");

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const RELIGION_TAGS = [
  "christian",
  "muslim",
  "jewish",
  "buddhist",
  "hindu",
  "sikh",
  "shinto",
  "bahai",
  "zoroastrian",
];

const RELIGION_LABELS = {
  christian: "Christianity",
  muslim: "Islam",
  jewish: "Judaism",
  buddhist: "Buddhism",
  hindu: "Hinduism",
  sikh: "Sikhism",
  shinto: "Shinto",
  bahai: "Bahai Faith",
  zoroastrian: "Zoroastrianism",
};

const DEFAULT_IMPORT_AREAS = [
  {
    label: "Bulgaria",
    country: "Bulgaria",
    bbox: [41.2, 22.3, 44.3, 28.8],
  },
  {
    label: "United Kingdom",
    country: "United Kingdom",
    bbox: [49.9, -8.7, 60.9, 1.9],
  },
  {
    label: "Turkey",
    country: "Turkey",
    bbox: [35.8, 25.6, 42.2, 44.9],
  },
  {
    label: "Israel and Palestine",
    country: "Israel / Palestine",
    bbox: [29.4, 34.2, 33.4, 35.9],
  },
  {
    label: "India",
    country: "India",
    bbox: [6.5, 68.1, 35.7, 97.4],
  },
  {
    label: "Japan",
    country: "Japan",
    bbox: [30.0, 129.0, 46.0, 146.0],
  },
  {
    label: "United States",
    country: "United States",
    bbox: [24.4, -125.0, 49.4, -66.9],
  },
];

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const importLimitPerArea = Number(process.env.OSM_IMPORT_LIMIT_PER_AREA || 120);
const requestPauseMs = Number(process.env.OSM_IMPORT_PAUSE_MS || 1500);

if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL in .env.local.");
}

if (!serviceRoleKey) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY in .env.local.");
}

if (typeof fetch !== "function") {
  throw new Error("This script requires Node.js 18+ because it uses global fetch.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function normalizeCoordinate(value) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) return null;

  return parsed.toFixed(6);
}

function duplicateKey(name, latitude, longitude) {
  const normalizedLatitude = normalizeCoordinate(latitude);
  const normalizedLongitude = normalizeCoordinate(longitude);

  if (!normalizedLatitude || !normalizedLongitude) return null;

  return `${normalizeName(name)}|${normalizedLatitude}|${normalizedLongitude}`;
}

function directImageUrl(value) {
  if (!value || typeof value !== "string") return null;

  const trimmed = value.trim();

  if (!/^https?:\/\//i.test(trimmed)) return null;

  return trimmed;
}

function websiteUrl(tags) {
  return (
    directImageUrl(tags.website) ||
    directImageUrl(tags["contact:website"]) ||
    directImageUrl(tags.url)
  );
}

function elementName(tags) {
  return (
    tags.name ||
    tags["name:en"] ||
    tags.official_name ||
    tags["official_name:en"] ||
    null
  );
}

function elementLatitude(element) {
  return element.lat ?? element.center?.lat ?? null;
}

function elementLongitude(element) {
  return element.lon ?? element.center?.lon ?? null;
}

function elementCity(tags) {
  return (
    tags["addr:city"] ||
    tags["addr:town"] ||
    tags["addr:village"] ||
    tags["addr:municipality"] ||
    tags["is_in:city"] ||
    null
  );
}

function elementAddress(tags, city, country) {
  if (tags["addr:full"]) return tags["addr:full"];

  const streetLine = [tags["addr:housenumber"], tags["addr:street"]]
    .filter(Boolean)
    .join(" ");
  const parts = [
    streetLine,
    tags["addr:suburb"],
    city,
    tags["addr:postcode"],
    country,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : null;
}

function elementDescription(element, religion, denomination, city, country) {
  const tags = element.tags || {};

  if (tags.description) return tags.description;

  const location = [city, country].filter(Boolean).join(", ");
  const details = [denomination, religion].filter(Boolean).join(" ");
  const placeType = details || "sacred";
  const locationText = location ? ` in ${location}` : "";

  return `OpenStreetMap place of worship: ${placeType}${locationText}. OSM ${element.type}/${element.id}.`;
}

function osmElementToTemple(element, area) {
  const tags = element.tags || {};
  const name = elementName(tags);
  const latitude = elementLatitude(element);
  const longitude = elementLongitude(element);
  const religionTag = String(tags.religion || "").toLowerCase();
  const religion = RELIGION_LABELS[religionTag] || null;

  if (!name || !religion || !latitude || !longitude) return null;

  const city = elementCity(tags);
  const country = tags["addr:country"] || area.country || null;
  const denomination = tags.denomination || tags["denomination:en"] || null;

  return {
    name,
    religion,
    denomination,
    country,
    city,
    address: elementAddress(tags, city, country),
    latitude,
    longitude,
    description: elementDescription(element, religion, denomination, city, country),
    image_url: directImageUrl(tags.image),
    website_url: websiteUrl(tags),
  };
}

function importAreas() {
  const customBbox = process.env.OSM_IMPORT_BBOX;

  if (!customBbox) return DEFAULT_IMPORT_AREAS;

  const bbox = customBbox.split(",").map((value) => Number(value.trim()));

  if (bbox.length !== 4 || bbox.some((value) => !Number.isFinite(value))) {
    throw new Error(
      "Invalid OSM_IMPORT_BBOX. Use south,west,north,east for example: 41.2,22.3,44.3,28.8"
    );
  }

  return [
    {
      label: "Custom bbox",
      country: process.env.OSM_IMPORT_COUNTRY || null,
      bbox,
    },
  ];
}

function buildOverpassQuery(area) {
  const [south, west, north, east] = area.bbox;
  const religionPattern = RELIGION_TAGS.join("|");

  return `
    [out:json][timeout:90];
    (
      node["amenity"="place_of_worship"]["religion"~"^(${religionPattern})$"](${south},${west},${north},${east});
      way["amenity"="place_of_worship"]["religion"~"^(${religionPattern})$"](${south},${west},${north},${east});
      relation["amenity"="place_of_worship"]["religion"~"^(${religionPattern})$"](${south},${west},${north},${east});
    );
    out center tags ${importLimitPerArea};
  `;
}

async function fetchOverpassArea(area) {
  const response = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain",
      "User-Agent": "RELIGIOUS temple importer (OpenStreetMap Overpass)",
    },
    body: buildOverpassQuery(area),
  });

  const body = await response.text();

  if (!response.ok) {
    throw new Error(`Overpass ${response.status}: ${body.slice(0, 300)}`);
  }

  return JSON.parse(body);
}

async function loadExistingDuplicateKeys() {
  const keys = new Set();
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from("temples")
      .select("name, latitude, longitude")
      .range(from, to);

    if (error) throw error;

    for (const temple of data || []) {
      const key = duplicateKey(temple.name, temple.latitude, temple.longitude);

      if (key) keys.add(key);
    }

    if (!data || data.length < pageSize) break;

    from += pageSize;
  }

  return keys;
}

async function insertTemple(temple) {
  const { error } = await supabase.from("temples").insert(temple);

  if (error) throw error;
}

async function main() {
  console.log("Starting OpenStreetMap temple import...");
  console.log(`Overpass limit per area: ${importLimitPerArea}`);
  console.log("Duplicate check: name + latitude + longitude");

  const existingKeys = await loadExistingDuplicateKeys();
  const seenKeys = new Set(existingKeys);
  const summary = {
    inserted: 0,
    skipped: 0,
    errors: 0,
  };

  for (const area of importAreas()) {
    try {
      console.log(`\nFetching ${area.label}...`);

      const data = await fetchOverpassArea(area);
      const elements = Array.isArray(data.elements) ? data.elements : [];
      console.log(`Fetched ${elements.length} OSM elements.`);

      for (const element of elements) {
        try {
          const temple = osmElementToTemple(element, area);

          if (!temple) {
            summary.skipped += 1;
            continue;
          }

          const key = duplicateKey(temple.name, temple.latitude, temple.longitude);

          if (!key || seenKeys.has(key)) {
            summary.skipped += 1;
            continue;
          }

          await insertTemple(temple);
          seenKeys.add(key);
          summary.inserted += 1;
          console.log(`Inserted: ${temple.name}`);
        } catch (error) {
          summary.errors += 1;
          console.error(
            `Error importing OSM ${element.type}/${element.id}:`,
            error.message || error
          );
        }
      }
    } catch (error) {
      summary.errors += 1;
      console.error(`Failed fetching ${area.label}:`, error.message || error);
    }

    await sleep(requestPauseMs);
  }

  console.log("\nOpenStreetMap temple import finished.");
  console.log(`Inserted: ${summary.inserted}`);
  console.log(`Skipped: ${summary.skipped}`);
  console.log(`Errors: ${summary.errors}`);

  if (summary.errors > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("IMPORT FAILED:");
  console.error(error);
  process.exitCode = 1;
});
