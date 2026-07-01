require("dotenv").config({ path: ".env.local" });

const { createClient } = require("@supabase/supabase-js");

const WIKIDATA_SPARQL_URL = "https://query.wikidata.org/sparql";
const COMMONS_FILE_URL = "https://commons.wikimedia.org/wiki/Special:FilePath";
const IMPORT_LIMIT = Number(process.env.WIKIDATA_TEMPLE_IMPORT_LIMIT || 100);

const RELIGIOUS_PLACE_TYPES = [
  { qid: "Q16970", religion: "Christianity" },
  { qid: "Q2977", religion: "Christianity" },
  { qid: "Q32815", religion: "Islam" },
  { qid: "Q34627", religion: "Judaism" },
  { qid: "Q5393308", religion: "Buddhism" },
  { qid: "Q842402", religion: "Hinduism" },
  { qid: "Q337986", religion: "Sikhism" },
  { qid: "Q845945", religion: "Shinto" },
  { qid: "Q156367", religion: "Bahai Faith" },
  { qid: "Q1152784", religion: "Zoroastrianism" },
];

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL in .env.local.");
}

if (!supabaseKey) {
  throw new Error(
    "Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local."
  );
}

if (typeof fetch !== "function") {
  throw new Error("This script requires Node.js 18+ because it uses global fetch.");
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

function normalizeText(value) {
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

function coordinateKey(name, latitude, longitude) {
  const normalizedLatitude = normalizeCoordinate(latitude);
  const normalizedLongitude = normalizeCoordinate(longitude);

  if (!name || !normalizedLatitude || !normalizedLongitude) return null;

  return `${normalizeText(name)}|${normalizedLatitude}|${normalizedLongitude}`;
}

function locationKey(name, city, country) {
  const normalizedName = normalizeText(name);
  const normalizedCity = normalizeText(city);
  const normalizedCountry = normalizeText(country);

  if (!normalizedName || !normalizedCity || !normalizedCountry) return null;

  return `${normalizedName}|${normalizedCity}|${normalizedCountry}`;
}

function safeHttpUrl(value) {
  if (!value || typeof value !== "string") return null;

  const trimmed = value.trim();

  if (!/^https?:\/\//i.test(trimmed)) return null;

  return trimmed;
}

function commonsFileUrl(fileName) {
  if (!fileName || typeof fileName !== "string") return null;

  const normalized = fileName
    .trim()
    .replace(/^File:/i, "")
    .replace(/^Image:/i, "");

  if (!normalized || /^Category:/i.test(normalized)) return null;

  return `${COMMONS_FILE_URL}/${encodeURIComponent(normalized)}?width=1200`;
}

function parseWikidataPoint(value) {
  const match = String(value || "").match(/^Point\(([-\d.]+) ([-\d.]+)\)$/);

  if (!match) return null;

  const longitude = Number(match[1]);
  const latitude = Number(match[2]);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return { latitude, longitude };
}

function buildSparqlQuery(limit) {
  const typeValues = RELIGIOUS_PLACE_TYPES.map(
    (item) => `(wd:${item.qid} "${item.religion}")`
  ).join("\n      ");

  return `
    SELECT ?place ?placeLabel ?religion ?countryLabel ?cityLabel ?coord ?description ?website ?image WHERE {
      VALUES (?type ?religion) {
        ${typeValues}
      }

      ?place wdt:P31/wdt:P279* ?type;
             wdt:P625 ?coord.

      OPTIONAL { ?place wdt:P17 ?country. }
      OPTIONAL { ?place wdt:P131 ?city. }
      OPTIONAL { ?place wdt:P856 ?website. }
      OPTIONAL { ?place wdt:P18 ?image. }
      OPTIONAL {
        ?place schema:description ?description.
        FILTER(LANG(?description) = "en")
      }

      SERVICE wikibase:label {
        bd:serviceParam wikibase:language "en".
      }
    }
    ORDER BY ?religion ?placeLabel
    LIMIT ${limit}
  `;
}

async function fetchWikidataTemples() {
  const url = new URL(WIKIDATA_SPARQL_URL);
  url.searchParams.set("query", buildSparqlQuery(IMPORT_LIMIT));
  url.searchParams.set("format", "json");

  const response = await fetch(url, {
    headers: {
      Accept: "application/sparql-results+json",
      "User-Agent": "RELIGIOUS Wikidata temple importer/1.0 (limited test import)",
    },
  });
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`Wikidata ${response.status}: ${body.slice(0, 500)}`);
  }

  const data = JSON.parse(body);
  const rows = data?.results?.bindings;

  return Array.isArray(rows) ? rows : [];
}

function bindingValue(row, key) {
  return row?.[key]?.value || null;
}

function rowToTemple(row) {
  const name = bindingValue(row, "placeLabel");
  const point = parseWikidataPoint(bindingValue(row, "coord"));

  if (!name || !point) return null;

  const country = bindingValue(row, "countryLabel");
  const city = bindingValue(row, "cityLabel");
  const religion = bindingValue(row, "religion");
  const wikidataUrl = bindingValue(row, "place");
  const description = bindingValue(row, "description");
  const websiteUrl = safeHttpUrl(bindingValue(row, "website"));
  const imageUrl = commonsFileUrl(bindingValue(row, "image"));

  return {
    name,
    religion,
    denomination: null,
    country,
    city,
    address: null,
    latitude: point.latitude,
    longitude: point.longitude,
    description:
      description ||
      [religion, "sacred place", [city, country].filter(Boolean).join(", ")]
        .filter(Boolean)
        .join(" in ") ||
      `Wikidata sacred place: ${wikidataUrl}`,
    image_url: imageUrl,
    website_url: websiteUrl || wikidataUrl,
  };
}

async function loadExistingTempleIndex() {
  const byCoordinates = new Map();
  const byLocation = new Map();
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from("temples")
      .select("id, name, country, city, latitude, longitude")
      .range(from, to);

    if (error) throw error;

    for (const temple of data || []) {
      const coordKey = coordinateKey(temple.name, temple.latitude, temple.longitude);
      const locKey = locationKey(temple.name, temple.city, temple.country);

      if (coordKey) byCoordinates.set(coordKey, temple.id);
      if (locKey) byLocation.set(locKey, temple.id);
    }

    if (!data || data.length < pageSize) break;

    from += pageSize;
  }

  return { byCoordinates, byLocation };
}

function isDuplicate(temple, existingIndex) {
  const coordKey = coordinateKey(temple.name, temple.latitude, temple.longitude);
  const locKey = locationKey(temple.name, temple.city, temple.country);

  return Boolean(
    (coordKey && existingIndex.byCoordinates.has(coordKey)) ||
      (locKey && existingIndex.byLocation.has(locKey))
  );
}

function addToExistingIndex(temple, id, existingIndex) {
  const coordKey = coordinateKey(temple.name, temple.latitude, temple.longitude);
  const locKey = locationKey(temple.name, temple.city, temple.country);

  if (coordKey) existingIndex.byCoordinates.set(coordKey, id);
  if (locKey) existingIndex.byLocation.set(locKey, id);
}

async function insertTemple(temple) {
  const { data, error } = await supabase
    .from("temples")
    .insert(temple)
    .select("id")
    .single();

  if (error) throw error;

  return data.id;
}

async function main() {
  console.log("Starting Wikidata temple import...");
  console.log(`Import limit: ${IMPORT_LIMIT}`);
  console.log("Duplicate checks: name + latitude + longitude, then name + city + country");

  const rows = await fetchWikidataTemples();
  const existingIndex = await loadExistingTempleIndex();
  const stats = {
    fetched: rows.length,
    inserted: 0,
    skipped: 0,
    errors: 0,
  };

  for (const row of rows) {
    const temple = rowToTemple(row);

    if (!temple) {
      stats.skipped += 1;
      continue;
    }

    if (isDuplicate(temple, existingIndex)) {
      stats.skipped += 1;
      continue;
    }

    try {
      const id = await insertTemple(temple);
      addToExistingIndex(temple, id, existingIndex);
      stats.inserted += 1;
      console.log(`Inserted: ${temple.name}`);
    } catch (error) {
      stats.errors += 1;
      console.error(`Error importing ${temple.name}:`, error.message || error);
    }
  }

  console.log("DONE! Wikidata temple import finished.");
  console.log("Import summary:");
  console.log(`Fetched: ${stats.fetched}`);
  console.log(`Inserted: ${stats.inserted}`);
  console.log(`Skipped: ${stats.skipped}`);
  console.log(`Errors: ${stats.errors}`);

  if (stats.errors > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("IMPORT FAILED:");
  console.error(error);
  process.exitCode = 1;
});
