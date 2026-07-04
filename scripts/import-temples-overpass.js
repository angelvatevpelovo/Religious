require("dotenv").config({ path: ".env.local" });

const { createClient } = require("@supabase/supabase-js");

const OVERPASS_URL = process.env.OVERPASS_URL || "https://overpass-api.de/api/interpreter";
const IMPORT_LIMIT = Number(process.env.OVERPASS_TEMPLE_IMPORT_LIMIT || 100);
const OVERPASS_TIMEOUT_SECONDS = Number(process.env.OVERPASS_TEMPLE_QUERY_TIMEOUT_SECONDS || 60);
const FETCH_TIMEOUT_MS = Number(process.env.OVERPASS_TEMPLE_FETCH_TIMEOUT_MS || 75000);
const COUNTRY_CODE = "BG";
const COUNTRY_NAME = "Bulgaria";

const RELIGION_TAGS = ["christian", "muslim", "jewish", "buddhist", "hindu"];

const RELIGION_LABELS = {
  christian: "Christianity",
  muslim: "Islam",
  jewish: "Judaism",
  buddhist: "Buddhism",
  hindu: "Hinduism",
};

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

function elementName(tags) {
  return (
    tags.name ||
    tags["name:en"] ||
    tags.official_name ||
    tags["official_name:en"] ||
    null
  );
}

function elementCity(tags) {
  return (
    tags["addr:city"] ||
    tags["addr:town"] ||
    tags["addr:village"] ||
    tags["addr:municipality"] ||
    tags["is_in:city"] ||
    tags["is_in:town"] ||
    tags["is_in:village"] ||
    null
  );
}

function elementAddress(tags, city) {
  if (tags["addr:full"]) return tags["addr:full"];

  const streetLine = [tags["addr:housenumber"], tags["addr:street"]]
    .filter(Boolean)
    .join(" ");
  const parts = [
    streetLine,
    tags["addr:suburb"],
    city,
    tags["addr:postcode"],
    COUNTRY_NAME,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : null;
}

function websiteUrl(tags) {
  return (
    safeHttpUrl(tags.website) ||
    safeHttpUrl(tags["contact:website"]) ||
    safeHttpUrl(tags.url)
  );
}

function imageUrl(tags) {
  return safeHttpUrl(tags.image) || null;
}

function elementDescription(element, religion, denomination, city) {
  const tags = element.tags || {};

  if (tags.description) return tags.description;

  const location = [city, COUNTRY_NAME].filter(Boolean).join(", ");
  const details = [denomination, religion].filter(Boolean).join(" ");
  const placeType = details || "sacred";
  const locationText = location ? ` in ${location}` : "";

  return `OpenStreetMap place of worship: ${placeType}${locationText}. OSM ${element.type}/${element.id}.`;
}

function elementCoordinates(element) {
  const latitude = element.lat ?? element.center?.lat ?? null;
  const longitude = element.lon ?? element.center?.lon ?? null;
  const parsedLatitude = Number(latitude);
  const parsedLongitude = Number(longitude);

  if (!Number.isFinite(parsedLatitude) || !Number.isFinite(parsedLongitude)) {
    return null;
  }

  return {
    latitude: parsedLatitude,
    longitude: parsedLongitude,
  };
}

function overpassQuery() {
  const safeLimit = Number.isFinite(IMPORT_LIMIT) && IMPORT_LIMIT > 0 ? Math.floor(IMPORT_LIMIT) : 100;
  const safeTimeout =
    Number.isFinite(OVERPASS_TIMEOUT_SECONDS) && OVERPASS_TIMEOUT_SECONDS > 0
      ? Math.floor(OVERPASS_TIMEOUT_SECONDS)
      : 60;
  const religionPattern = RELIGION_TAGS.join("|");

  return `
[out:json][timeout:${safeTimeout}];
area["ISO3166-1"="${COUNTRY_CODE}"][admin_level=2]->.searchArea;
(
  node["amenity"="place_of_worship"]["religion"~"^(${religionPattern})$"](area.searchArea);
  way["amenity"="place_of_worship"]["religion"~"^(${religionPattern})$"](area.searchArea);
  relation["amenity"="place_of_worship"]["religion"~"^(${religionPattern})$"](area.searchArea);
);
out center ${safeLimit};
`;
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchOverpassElements() {
  const query = overpassQuery();

  console.log("Overpass query:");
  console.log(query);

  let response;

  try {
    response = await fetchWithTimeout(
      OVERPASS_URL,
      {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
          "User-Agent": "RELIGIOUS/1.0 Bulgaria temple importer (OpenStreetMap Overpass)",
        },
        body: query,
      },
      FETCH_TIMEOUT_MS
    );
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`Overpass request timed out after ${FETCH_TIMEOUT_MS} ms.`);
    }

    throw error;
  }

  const body = await response.text();

  if (!response.ok) {
    console.error(`Overpass request failed with HTTP status ${response.status}.`);
    console.error("Overpass response body:");
    console.error(body);
    throw new Error(`Overpass request failed with HTTP status ${response.status}.`);
  }

  const data = JSON.parse(body);

  return Array.isArray(data.elements) ? data.elements : [];
}

function osmElementToTemple(element) {
  const tags = element.tags || {};
  const name = elementName(tags);
  const coordinates = elementCoordinates(element);
  const religionTag = normalizeText(tags.religion);
  const religion = RELIGION_LABELS[religionTag] || null;

  if (!name || !coordinates || !religion) return null;

  const city = elementCity(tags);
  const denomination = tags.denomination || tags["denomination:en"] || null;

  return {
    name,
    religion,
    denomination,
    country: COUNTRY_NAME,
    city,
    address: elementAddress(tags, city),
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    description: elementDescription(element, religion, denomination, city),
    image_url: imageUrl(tags),
    website_url: websiteUrl(tags),
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
  console.log("Starting Bulgaria OpenStreetMap / Overpass temple import...");
  console.log(`Import limit: ${IMPORT_LIMIT}`);
  console.log(`Fetch timeout: ${FETCH_TIMEOUT_MS} ms`);
  console.log("Duplicate checks: name + latitude + longitude, then name + city + country");

  const elements = await fetchOverpassElements();
  const existingIndex = await loadExistingTempleIndex();
  const stats = {
    fetched: elements.length,
    inserted: 0,
    skipped: 0,
    errors: 0,
  };

  for (const element of elements) {
    try {
      const temple = osmElementToTemple(element);

      if (!temple) {
        stats.skipped += 1;
        continue;
      }

      if (isDuplicate(temple, existingIndex)) {
        stats.skipped += 1;
        continue;
      }

      const id = await insertTemple(temple);
      addToExistingIndex(temple, id, existingIndex);
      stats.inserted += 1;
      console.log(`Inserted: ${temple.name}`);
    } catch (error) {
      stats.errors += 1;
      console.error(
        `Error importing OSM ${element.type}/${element.id}:`,
        error.message || error
      );
    }
  }

  console.log("DONE! Bulgaria Overpass temple import finished.");
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
