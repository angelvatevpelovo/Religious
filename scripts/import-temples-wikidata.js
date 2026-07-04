require("dotenv").config({ path: ".env.local" });

const { createClient } = require("@supabase/supabase-js");

const WIKIDATA_SPARQL_URL = "https://query.wikidata.org/sparql";
const COMMONS_FILE_URL = "https://commons.wikimedia.org/wiki/Special:FilePath";
const IMPORT_LIMIT = Number(process.env.WIKIDATA_TEMPLE_IMPORT_LIMIT || 10);
const PER_TYPE_LIMIT = Number(process.env.WIKIDATA_TEMPLE_IMPORT_PER_TYPE_LIMIT || 2);
const WIKIDATA_TIMEOUT_MS = Number(process.env.WIKIDATA_TEMPLE_TIMEOUT_MS || 20000);
const WIKIDATA_RETRIES = Number(process.env.WIKIDATA_TEMPLE_RETRIES || 2);
const WIKIDATA_REQUEST_DELAY_MS = Number(
  process.env.WIKIDATA_TEMPLE_REQUEST_DELAY_MS || 1200
);
const USER_AGENT =
  process.env.WIKIDATA_TEMPLE_USER_AGENT ||
  "RELIGIOUS/1.0 temple importer (limited Wikidata import; contact: local-dev)";

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

function groupedPlaceTypes() {
  const groups = new Map();

  for (const item of RELIGIOUS_PLACE_TYPES) {
    const existing = groups.get(item.religion) || [];
    existing.push(item.qid);
    groups.set(item.religion, existing);
  }

  return Array.from(groups, ([religion, qids]) => ({ religion, qids }));
}

function buildSparqlQuery(group, limit) {
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 2;
  const typeValues = group.qids.map((qid) => `    wd:${qid}`).join("\n");
  const escapedReligion = group.religion.replace(/"/g, "\\\"");

  return `SELECT ?place ?placeLabel ?religion ?countryLabel ?cityLabel ?coord ?description ?website ?image WHERE {
  VALUES ?type {
${typeValues}
  }
  BIND("${escapedReligion}" AS ?religion)

  ?place wdt:P31/wdt:P279* ?type;
         wdt:P625 ?coord.

  OPTIONAL { ?place wdt:P17 ?country. }
  OPTIONAL { ?place wdt:P131 ?city. }
  OPTIONAL { ?place wdt:P856 ?website. }
  OPTIONAL { ?place wdt:P18 ?image. }

  SERVICE wikibase:label {
    bd:serviceParam wikibase:language "en".
    ?place rdfs:label ?placeLabel.
    ?country rdfs:label ?countryLabel.
    ?city rdfs:label ?cityLabel.
    ?place schema:description ?description.
  }
}
LIMIT ${safeLimit}`;
}

function isRetryableStatus(status) {
  return [500, 502, 503, 504].includes(status);
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

async function fetchWikidataQuery(query, label) {
  const bodyParams = new URLSearchParams({
    query,
    format: "json",
  });

  console.log(`Final Wikidata SPARQL query for ${label}:`);
  console.log(query);

  for (let attempt = 1; attempt <= WIKIDATA_RETRIES + 1; attempt += 1) {
    try {
      const response = await fetchWithTimeout(
        WIKIDATA_SPARQL_URL,
        {
          method: "POST",
          headers: {
            Accept: "application/sparql-results+json",
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": USER_AGENT,
          },
          body: bodyParams,
        },
        WIKIDATA_TIMEOUT_MS
      );
      const responseBody = await response.text();

      if (!response.ok) {
        console.error(`Wikidata request failed with HTTP status ${response.status}.`);
        console.error("Wikidata response body:");
        console.error(responseBody);

        if (isRetryableStatus(response.status) && attempt <= WIKIDATA_RETRIES) {
          await sleep(attempt * 1500);
          continue;
        }

        throw new Error(`Wikidata request failed with HTTP status ${response.status}.`);
      }

      const data = JSON.parse(responseBody);
      const rows = data?.results?.bindings;

      return Array.isArray(rows) ? rows : [];
    } catch (error) {
      const timedOut = error?.name === "AbortError";

      if ((timedOut || error?.message?.includes("fetch failed")) && attempt <= WIKIDATA_RETRIES) {
        console.warn(
          `Wikidata ${label} attempt ${attempt} failed${timedOut ? " by timeout" : ""}. Retrying...`
        );
        await sleep(attempt * 1500);
        continue;
      }

      if (timedOut) {
        throw new Error(`Wikidata request timed out after ${WIKIDATA_TIMEOUT_MS} ms.`);
      }

      throw error;
    }
  }

  return [];
}

async function fetchWikidataTemples() {
  const rows = [];
  const groups = groupedPlaceTypes();
  const totalLimit = Number.isFinite(IMPORT_LIMIT) && IMPORT_LIMIT > 0 ? IMPORT_LIMIT : 10;
  const perTypeLimit =
    Number.isFinite(PER_TYPE_LIMIT) && PER_TYPE_LIMIT > 0 ? PER_TYPE_LIMIT : 2;

  for (const group of groups) {
    if (rows.length >= totalLimit) break;

    const remaining = totalLimit - rows.length;
    const queryLimit = Math.min(perTypeLimit, remaining);
    const query = buildSparqlQuery(group, queryLimit);

    console.log(`Fetching ${group.religion}...`);
    const groupRows = await fetchWikidataQuery(query, group.religion);
    console.log(`Fetched ${groupRows.length} ${group.religion} records`);

    rows.push(...groupRows.slice(0, remaining));

    if (rows.length < totalLimit) {
      await sleep(WIKIDATA_REQUEST_DELAY_MS);
    }
  }

  return rows;
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
  console.log(`Per type limit: ${PER_TYPE_LIMIT}`);
  console.log(`Wikidata timeout: ${WIKIDATA_TIMEOUT_MS} ms`);
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
