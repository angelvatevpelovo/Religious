require("dotenv").config({ path: ".env.local" });

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const OVERPASS_ENDPOINTS = (
  process.env.OVERPASS_ENDPOINTS ||
  process.env.OVERPASS_URL ||
  [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
  ].join(",")
)
  .split(",")
  .map((endpoint) => endpoint.trim())
  .filter(Boolean);
const DRY_RUN = process.env.SACRED_PLACES_DRY_RUN === "1";
const DEBUG = process.env.SACRED_PLACES_DEBUG === "1";
const MAX_PER_TARGET = Number(process.env.SACRED_PLACES_MAX_PER_TARGET || (DRY_RUN ? 50 : 300));
const REQUEST_TIMEOUT_MS = Number(process.env.SACRED_PLACES_TIMEOUT_MS || (DRY_RUN ? 12000 : 45000));
const DELAY_MS = Number(process.env.SACRED_PLACES_DELAY_MS || (DRY_RUN ? 1000 : 2500));
const RETRY_DELAY_MS = Number(process.env.SACRED_PLACES_RETRY_DELAY_MS || (DRY_RUN ? 500 : 3000));
const MAX_RETRIES = Number(process.env.SACRED_PLACES_RETRIES || (DRY_RUN ? 0 : 1));
const BATCH_SIZE = Number(process.env.SACRED_PLACES_INSERT_BATCH_SIZE || 100);
const DEFAULT_RADIUS_METERS = Number(process.env.SACRED_PLACES_RADIUS_METERS || (DRY_RUN ? 8000 : 12000));
const REPORT_PATH = path.join(process.cwd(), "docs", "sacred-places-batch-import-report.md");
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

const OPTIONAL_COLUMNS = [
  "external_id",
  "source",
  "type",
  "phone",
  "osm_type",
  "osm_id",
  "wikidata_id",
];

const DEFAULT_TARGETS = [
  { name: "Sofia", country: "Bulgaria", lat: 42.6977, lng: 23.3219 },
  { name: "Plovdiv", country: "Bulgaria", lat: 42.1354, lng: 24.7453 },
  { name: "Athens", country: "Greece", lat: 37.9838, lng: 23.7275 },
  { name: "Istanbul", country: "Turkey", lat: 41.0082, lng: 28.9784 },
  { name: "Jerusalem", country: "Israel", lat: 31.7683, lng: 35.2137 },
  { name: "Mecca", country: "Saudi Arabia", lat: 21.4225, lng: 39.8262 },
  { name: "Medina", country: "Saudi Arabia", lat: 24.5247, lng: 39.5692 },
  { name: "Cairo", country: "Egypt", lat: 30.0444, lng: 31.2357 },
  { name: "Delhi", country: "India", lat: 28.6139, lng: 77.209 },
  { name: "Varanasi", country: "India", lat: 25.3176, lng: 82.9739 },
  { name: "Kathmandu", country: "Nepal", lat: 27.7172, lng: 85.324 },
  { name: "Bangkok", country: "Thailand", lat: 13.7563, lng: 100.5018 },
  { name: "Kyoto", country: "Japan", lat: 35.0116, lng: 135.7681 },
  { name: "Rome", country: "Italy", lat: 41.9028, lng: 12.4964 },
  { name: "Paris", country: "France", lat: 48.8566, lng: 2.3522 },
  { name: "London", country: "United Kingdom", lat: 51.5074, lng: -0.1278 },
  { name: "New York", country: "United States", lat: 40.7128, lng: -74.006 },
];

const RELIGION_LABELS = {
  christian: "Christianity",
  muslim: "Islam",
  jewish: "Judaism",
  buddhist: "Buddhism",
  hindu: "Hinduism",
  sikh: "Sikhism",
  taoist: "Taoism",
  shinto: "Shinto",
};

const GENERIC_NAMES = new Set([
  "temple",
  "church",
  "mosque",
  "shrine",
  "monastery",
  "chapel",
  "religious place",
  "place of worship",
  "unknown",
]);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanText(value) {
  if (value === undefined || value === null) return null;
  const cleaned = String(value).trim().replace(/\s+/g, " ");
  return cleaned.length ? cleaned : null;
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function normalizeCoordinate(value, precision = 5) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(precision) : null;
}

function safeHttpUrl(value) {
  const cleaned = cleanText(value);
  if (!cleaned || !/^https?:\/\//i.test(cleaned)) return null;
  return cleaned;
}

function selectTargets() {
  const requested = cleanText(process.env.SACRED_PLACES_TARGETS);
  if (!requested) return DEFAULT_TARGETS;

  const names = requested.split(",").map((item) => normalizeText(item));
  const selected = DEFAULT_TARGETS.filter((target) =>
    names.includes(normalizeText(target.name))
  );
  const missing = names.filter(
    (name) => !DEFAULT_TARGETS.some((target) => normalizeText(target.name) === name)
  );

  if (missing.length) {
    console.warn(`Unknown targets ignored: ${missing.join(", ")}`);
  }

  return selected.length ? selected : DEFAULT_TARGETS;
}

function overpassQuery(target) {
  const radius = Number.isFinite(target.radius) ? target.radius : DEFAULT_RADIUS_METERS;
  const limit = Number.isFinite(MAX_PER_TARGET) && MAX_PER_TARGET > 0
    ? Math.floor(MAX_PER_TARGET)
    : 50;

  return `
[out:json][timeout:60];
(
  node["amenity"="place_of_worship"](around:${radius},${target.lat},${target.lng});
  way["amenity"="place_of_worship"](around:${radius},${target.lat},${target.lng});
  relation["amenity"="place_of_worship"](around:${radius},${target.lat},${target.lng});
  node["religion"~"^(christian|muslim|jewish|buddhist|hindu|sikh|taoist|shinto)$"](around:${radius},${target.lat},${target.lng});
  way["religion"~"^(christian|muslim|jewish|buddhist|hindu|sikh|taoist|shinto)$"](around:${radius},${target.lat},${target.lng});
  relation["religion"~"^(christian|muslim|jewish|buddhist|hindu|sikh|taoist|shinto)$"](around:${radius},${target.lat},${target.lng});
  node["building"~"^(church|mosque|synagogue|temple|monastery)$"](around:${radius},${target.lat},${target.lng});
  way["building"~"^(church|mosque|synagogue|temple|monastery)$"](around:${radius},${target.lat},${target.lng});
  relation["building"~"^(church|mosque|synagogue|temple|monastery)$"](around:${radius},${target.lat},${target.lng});
  node["historic"="monastery"](around:${radius},${target.lat},${target.lng});
  way["historic"="monastery"](around:${radius},${target.lat},${target.lng});
  relation["historic"="monastery"](around:${radius},${target.lat},${target.lng});
);
out center ${limit};
`;
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchOverpassElementsFromEndpoint(endpoint, target) {
  const query = overpassQuery(target);
  const response = await fetchWithTimeout(
    endpoint,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        "Accept": "application/json",
        "User-Agent": "RELIGIOUS/1.1 sacred places batch importer (contact: local development)",
      },
      body: new URLSearchParams({ data: query }).toString(),
    },
    REQUEST_TIMEOUT_MS
  );

  const body = await response.text();

  if (!response.ok) {
    const error = new Error(`Overpass HTTP ${response.status}: ${body.slice(0, 500)}`);
    error.status = response.status;
    throw error;
  }

  const parsed = JSON.parse(body);
  return Array.isArray(parsed.elements) ? parsed.elements : [];
}

async function fetchOverpassElements(target) {
  const errors = [];

  for (const endpoint of OVERPASS_ENDPOINTS) {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
      try {
        if (DEBUG) {
          console.log(`Overpass endpoint ${endpoint}, attempt ${attempt + 1}`);
        }
        return await fetchOverpassElementsFromEndpoint(endpoint, target);
      } catch (error) {
        const message = error.name === "AbortError"
          ? `Overpass timeout after ${REQUEST_TIMEOUT_MS}ms`
          : error.message || String(error);
        errors.push(`${endpoint}: ${message}`);

        const retryable = error.name === "AbortError" ||
          RETRYABLE_STATUSES.has(Number(error.status));
        if (!retryable || attempt >= MAX_RETRIES) break;

        await sleep(RETRY_DELAY_MS * (attempt + 1));
      }
    }
  }

  throw new Error(errors.join(" | "));
}

async function detectOptionalColumns(supabase) {
  const available = [];

  for (const column of OPTIONAL_COLUMNS) {
    const { error } = await supabase.from("temples").select(`id, ${column}`).limit(1);
    if (!error) available.push(column);
  }

  return available;
}

async function loadExistingIndex(supabase, optionalColumns) {
  const fields = ["id", "name", "city", "country", "latitude", "longitude"];
  if (optionalColumns.includes("external_id")) fields.push("external_id");
  if (optionalColumns.includes("source")) fields.push("source");

  const byExternal = new Set();
  const byLocation = new Set();
  const byCoordinates = new Set();
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("temples")
      .select(fields.join(", "))
      .range(from, from + pageSize - 1);

    if (error) throw error;

    for (const row of data || []) {
      const externalKey = externalDuplicateKey(row);
      const locationKey = locationDuplicateKey(row);
      const coordinateKey = coordinateDuplicateKey(row);

      if (externalKey) byExternal.add(externalKey);
      if (locationKey) byLocation.add(locationKey);
      if (coordinateKey) byCoordinates.add(coordinateKey);
    }

    if (!data || data.length < pageSize) break;
    from += pageSize;
  }

  return { byExternal, byLocation, byCoordinates };
}

function externalDuplicateKey(place) {
  if (!place.external_id || !place.source) return null;
  return `${normalizeText(place.source)}|${normalizeText(place.external_id)}`;
}

function locationDuplicateKey(place) {
  const name = normalizeText(place.name);
  const city = normalizeText(place.city);
  const country = normalizeText(place.country);
  if (!name || !city || !country) return null;
  return `${name}|${city}|${country}`;
}

function coordinateDuplicateKey(place) {
  const name = normalizeText(place.name);
  const lat = normalizeCoordinate(place.latitude);
  const lng = normalizeCoordinate(place.longitude);
  if (!name || !lat || !lng) return null;
  return `${name}|${lat}|${lng}`;
}

function addToExistingIndex(place, index) {
  const externalKey = externalDuplicateKey(place);
  const locationKey = locationDuplicateKey(place);
  const coordinateKey = coordinateDuplicateKey(place);

  if (externalKey) index.byExternal.add(externalKey);
  if (locationKey) index.byLocation.add(locationKey);
  if (coordinateKey) index.byCoordinates.add(coordinateKey);
}

function isDuplicate(place, index) {
  const externalKey = externalDuplicateKey(place);
  const locationKey = locationDuplicateKey(place);
  const coordinateKey = coordinateDuplicateKey(place);

  return Boolean(
    (externalKey && index.byExternal.has(externalKey)) ||
      (locationKey && index.byLocation.has(locationKey)) ||
      (coordinateKey && index.byCoordinates.has(coordinateKey))
  );
}

function elementName(tags) {
  return cleanText(
    tags.name ||
      tags["name:en"] ||
      tags.official_name ||
      tags["official_name:en"] ||
      tags["name:local"]
  );
}

function elementCoordinates(element) {
  const latitude = Number(element.lat ?? element.center?.lat);
  const longitude = Number(element.lon ?? element.center?.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
}

function normalizeReligion(tags) {
  const raw = normalizeText(tags.religion);
  if (RELIGION_LABELS[raw]) return RELIGION_LABELS[raw];

  const building = normalizeText(tags.building);
  if (building === "church") return "Christianity";
  if (building === "mosque") return "Islam";
  if (building === "synagogue") return "Judaism";
  if (building === "temple") return "Religious place";
  if (building === "monastery") return "Religious place";
  if (normalizeText(tags.historic) === "monastery") return "Religious place";

  return "Religious place";
}

function readableType(tags) {
  return cleanText(
    tags.denomination ||
      tags["denomination:en"] ||
      tags.building ||
      tags.historic ||
      tags.tourism ||
      tags.amenity
  );
}

function elementCity(tags, target) {
  return cleanText(
    tags["addr:city"] ||
      tags["addr:town"] ||
      tags["addr:village"] ||
      tags["addr:municipality"] ||
      tags["is_in:city"] ||
      tags["is_in:town"] ||
      tags["is_in:village"] ||
      target.name
  );
}

function elementCountry(tags, target) {
  return cleanText(tags["addr:country"] || target.country);
}

function elementAddress(tags, city, country) {
  if (tags["addr:full"]) return cleanText(tags["addr:full"]);

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

  return cleanText(parts.join(", "));
}

function elementDescription(element, religion, type, city, country) {
  const tags = element.tags || {};
  if (tags.description) return cleanText(tags.description);

  const location = [city, country].filter(Boolean).join(", ");
  const details = [type, religion].filter(Boolean).join(" ");
  const placeType = details || "sacred place";
  const locationText = location ? ` in ${location}` : "";

  return `OpenStreetMap sacred place: ${placeType}${locationText}. OSM ${element.type}/${element.id}.`;
}

function websiteUrl(tags) {
  return (
    safeHttpUrl(tags.website) ||
    safeHttpUrl(tags["contact:website"]) ||
    safeHttpUrl(tags.url)
  );
}

function imageUrl(tags) {
  return safeHttpUrl(tags.image) || safeHttpUrl(tags["image:0"]);
}

function phone(tags) {
  return cleanText(tags.phone || tags["contact:phone"]);
}

function shouldSkipGenericName(name, tags) {
  const normalizedName = normalizeText(name);
  if (!GENERIC_NAMES.has(normalizedName)) return false;

  return !tags.wikidata &&
    !tags.wikipedia &&
    !tags.website &&
    !tags["contact:website"] &&
    !tags.official_name &&
    !tags["name:en"];
}

function parseElement(element, target, optionalColumns) {
  const tags = element.tags || {};
  const name = elementName(tags);
  if (!name) return { skipped: "unnamed" };

  if (shouldSkipGenericName(name, tags)) {
    return { skipped: "generic" };
  }

  const coordinates = elementCoordinates(element);
  if (!coordinates) return { skipped: "noCoordinates" };

  const religion = normalizeReligion(tags);
  const type = readableType(tags);
  const city = elementCity(tags, target);
  const country = elementCountry(tags, target);
  const address = elementAddress(tags, city, country);

  const place = {
    name,
    religion,
    denomination: cleanText(tags.denomination || tags["denomination:en"] || type),
    country,
    city,
    address,
    description: elementDescription(element, religion, type, city, country),
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    website_url: websiteUrl(tags),
    image_url: imageUrl(tags),
  };

  if (optionalColumns.includes("external_id")) {
    place.external_id = `${element.type}/${element.id}`;
  }
  if (optionalColumns.includes("source")) {
    place.source = "openstreetmap";
  }
  if (optionalColumns.includes("type")) {
    place.type = type;
  }
  if (optionalColumns.includes("phone")) {
    place.phone = phone(tags);
  }
  if (optionalColumns.includes("osm_type")) {
    place.osm_type = element.type;
  }
  if (optionalColumns.includes("osm_id")) {
    place.osm_id = String(element.id);
  }
  if (optionalColumns.includes("wikidata_id")) {
    place.wikidata_id = cleanText(tags.wikidata);
  }

  return { place };
}

async function insertBatch(supabase, places) {
  if (!places.length) return 0;
  const { error } = await supabase.from("temples").insert(places);
  if (error) throw error;
  return places.length;
}

function markdownCell(value, maxLength = 260) {
  const singleLine = cleanText(value) || "";
  const trimmed = singleLine.length > maxLength
    ? `${singleLine.slice(0, maxLength - 3)}...`
    : singleLine;

  return trimmed.replace(/\|/g, "\\|");
}

function reportLines(targetResults, summary) {
  const now = new Date().toISOString();
  const lines = [
    "# Sacred Places Batch Import Report",
    "",
    `Generated: ${now}`,
    "",
    DRY_RUN
      ? "> DRY RUN. No database rows were changed."
      : "> REAL IMPORT RUN. New rows may have been inserted.",
    "",
    "## Summary",
    "",
    "| Metric | Value |",
    "| --- | --- |",
    `| Targets checked | ${summary.targetsChecked} |`,
    `| Total fetched | ${summary.fetched} |`,
    `| Total valid | ${summary.valid} |`,
    `| Total duplicates | ${summary.duplicates} |`,
    `| Total insert candidates | ${summary.candidates} |`,
    `| Total inserted | ${summary.inserted} |`,
    `| Target errors | ${summary.errors.length} |`,
    "",
    "## Per Target",
    "",
    "| Target | Fetched | Valid | Duplicates | Candidates | Inserted | Errors |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...targetResults.map((target) =>
      `| ${target.name} | ${target.fetched} | ${target.valid} | ${target.duplicates} | ${target.candidates} | ${target.inserted} | ${markdownCell(target.error)} |`
    ),
    "",
  ];

  if (summary.errors.length) {
    lines.push("## Errors", "");
    for (const error of summary.errors) {
      lines.push(`- ${error.target}: ${markdownCell(error.message, 500)}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

async function main() {
  console.log(DRY_RUN
    ? "DRY RUN. No database rows will be changed."
    : "REAL IMPORT MODE. New database rows may be inserted.");
  console.log("Importer safety: no update/delete/upsert operations are used.");

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseKey = DRY_RUN ? serviceRoleKey || anonKey : serviceRoleKey;

  if (!supabaseUrl) {
    throw new Error("Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL.");
  }
  if (!supabaseKey) {
    throw new Error(DRY_RUN
      ? "Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY."
      : "Missing SUPABASE_SERVICE_ROLE_KEY. Real import requires service role.");
  }
  if (typeof fetch !== "function") {
    throw new Error("This script requires Node.js 18+ because it uses global fetch.");
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const optionalColumns = await detectOptionalColumns(supabase);
  const existingIndex = await loadExistingIndex(supabase, optionalColumns);
  const targets = selectTargets();
  const targetResults = [];
  const summary = {
    targetsChecked: 0,
    fetched: 0,
    valid: 0,
    duplicates: 0,
    candidates: 0,
    inserted: 0,
    errors: [],
  };

  console.log(`Targets: ${targets.map((target) => target.name).join(", ")}`);
  console.log(`Max per target: ${MAX_PER_TARGET}`);
  console.log(`Optional columns detected: ${optionalColumns.join(", ") || "none"}`);

  for (const target of targets) {
    const result = {
      name: target.name,
      fetched: 0,
      valid: 0,
      skippedUnnamed: 0,
      skippedGeneric: 0,
      skippedNoCoordinates: 0,
      duplicates: 0,
      candidates: 0,
      inserted: 0,
      error: "",
    };

    console.log(`\nFetching ${target.name}...`);

    try {
      const elements = await fetchOverpassElements(target);
      result.fetched = elements.length;
      const candidates = [];

      for (const element of elements) {
        const parsed = parseElement(element, target, optionalColumns);

        if (parsed.skipped === "unnamed") {
          result.skippedUnnamed += 1;
          continue;
        }
        if (parsed.skipped === "generic") {
          result.skippedGeneric += 1;
          continue;
        }
        if (parsed.skipped === "noCoordinates") {
          result.skippedNoCoordinates += 1;
          continue;
        }

        const place = parsed.place;
        result.valid += 1;

        if (isDuplicate(place, existingIndex)) {
          result.duplicates += 1;
          continue;
        }

        candidates.push(place);
        addToExistingIndex(place, existingIndex);
      }

      result.candidates = candidates.length;

      if (DEBUG && candidates.length) {
        console.log(`Sample parsed ${target.name} candidates:`);
        console.log(JSON.stringify(candidates.slice(0, 5), null, 2));
      }

      if (!DRY_RUN && candidates.length) {
        for (let start = 0; start < candidates.length; start += BATCH_SIZE) {
          const batch = candidates.slice(start, start + BATCH_SIZE);
          result.inserted += await insertBatch(supabase, batch);
          await sleep(150);
        }
      }

      console.log(
        `${target.name}: fetched=${result.fetched}, valid=${result.valid}, ` +
          `skippedUnnamed=${result.skippedUnnamed}, skippedNoCoordinates=${result.skippedNoCoordinates}, ` +
          `duplicates=${result.duplicates}, candidates=${result.candidates}, inserted=${result.inserted}`
      );
    } catch (error) {
      result.error = error.message || String(error);
      summary.errors.push({ target: target.name, message: result.error });
      console.error(`${target.name} failed: ${result.error}`);
    }

    targetResults.push(result);
    summary.targetsChecked += 1;
    summary.fetched += result.fetched;
    summary.valid += result.valid;
    summary.duplicates += result.duplicates;
    summary.candidates += result.candidates;
    summary.inserted += result.inserted;

    if (target !== targets[targets.length - 1]) {
      await sleep(DELAY_MS);
    }
  }

  console.log("\nFinal summary:");
  console.log(`Targets checked: ${summary.targetsChecked}`);
  console.log(`Total fetched: ${summary.fetched}`);
  console.log(`Total valid: ${summary.valid}`);
  console.log(`Total duplicates: ${summary.duplicates}`);
  console.log(`Total insert candidates: ${summary.candidates}`);
  console.log(`Total inserted: ${summary.inserted}`);
  console.log(`Errors by target: ${summary.errors.length}`);

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, reportLines(targetResults, summary), "utf8");
  console.log(`Report saved: ${REPORT_PATH}`);
}

main().catch((error) => {
  console.error("IMPORT FAILED:");
  console.error(error);
  process.exitCode = 1;
});
