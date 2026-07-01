require("dotenv").config({ path: ".env.local" });

const { createClient } = require("@supabase/supabase-js");

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const WIKIDATA_API_URL = "https://www.wikidata.org/w/api.php";
const WIKIDATA_ENTITY_URL = "https://www.wikidata.org/wiki/Special:EntityData";
const COMMONS_FILE_URL = "https://commons.wikimedia.org/wiki/Special:FilePath";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const enrichLimit = Number(process.env.TEMPLE_IMAGE_ENRICH_LIMIT || 100);
const overpassRadiusMeters = Number(process.env.TEMPLE_IMAGE_OVERPASS_RADIUS || 250);
const overpassPauseMs = Number(process.env.TEMPLE_IMAGE_OVERPASS_PAUSE_MS || 1200);
const wikidataPauseMs = Number(process.env.TEMPLE_IMAGE_WIKIDATA_PAUSE_MS || 500);
const updatePauseMs = Number(process.env.TEMPLE_IMAGE_UPDATE_PAUSE_MS || 150);
const requestTimeoutMs = Number(process.env.TEMPLE_IMAGE_REQUEST_TIMEOUT_MS || 20000);
const requestRetries = Number(process.env.TEMPLE_IMAGE_REQUEST_RETRIES || 3);

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

const TEMPORARY_ERROR_TYPES = new Set(["rate_limited", "server", "network", "timeout"]);
const wikidataEntityCache = new Map();
const wikidataSearchCache = new Map();
const errorSummary = new Map();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hasImageUrl(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function safeHttpUrl(value) {
  if (!value || typeof value !== "string") return null;

  const trimmed = value.trim();

  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
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

function createTypedError(message, errorType = "unknown", details = {}) {
  const error = new Error(message);
  error.errorType = errorType;

  for (const [key, value] of Object.entries(details)) {
    error[key] = value;
  }

  return error;
}

function classifyError(error) {
  if (!error) return "unknown";
  if (typeof error.errorType === "string") return error.errorType;

  const status = Number(error.status || error.statusCode);

  if (status === 429) return "rate_limited";
  if (status === 404) return "not_found";
  if (status >= 500) return "server";
  if (status >= 400) return "http";

  const code = error.code || error.cause?.code;
  const message = String(error.message || "").toLowerCase();

  if (error.name === "AbortError" || message.includes("timeout") || message.includes("timed out")) {
    return "timeout";
  }

  if (
    ["EAI_AGAIN", "ENOTFOUND", "ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "EPIPE"].includes(code) ||
    message.includes("fetch failed") ||
    message.includes("network")
  ) {
    return "network";
  }

  if (error instanceof SyntaxError || message.includes("json") || message.includes("parse")) {
    return "parsing";
  }

  if (error.code || error.details || error.hint) {
    return "supabase";
  }

  return "unknown";
}

function recordError(error) {
  const type = classifyError(error);
  errorSummary.set(type, (errorSummary.get(type) || 0) + 1);

  return type;
}

function retryAfterToMs(value) {
  if (!value) return null;

  const seconds = Number(value);

  if (Number.isFinite(seconds)) {
    return Math.max(0, seconds * 1000);
  }

  const dateMs = Date.parse(value);

  if (Number.isFinite(dateMs)) {
    return Math.max(0, dateMs - Date.now());
  }

  return null;
}

function retryDelayMs(error, attempt) {
  if (Number.isFinite(error.retryAfterMs)) {
    return error.retryAfterMs;
  }

  const baseDelay = Math.min(30000, 1000 * 2 ** attempt);
  const jitter = Math.floor(Math.random() * 250);

  return baseDelay + jitter;
}

function shouldRetry(error, attempt, retries) {
  if (attempt >= retries) return false;

  return TEMPORARY_ERROR_TYPES.has(classifyError(error));
}

async function fetchTextWithRetry(url, options = {}, retries = requestRetries) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      const body = await response.text();

      if (!response.ok) {
        const status = Number(response.status);
        const retryAfterMs = retryAfterToMs(response.headers.get("retry-after"));
        const errorType =
          status === 429
            ? "rate_limited"
            : status === 404
              ? "not_found"
              : status >= 500
                ? "server"
                : "http";

        throw createTypedError(`${status}: ${body.slice(0, 300)}`, errorType, {
          status,
          retryAfterMs,
        });
      }

      return body;
    } catch (error) {
      lastError =
        error?.name === "AbortError"
          ? createTypedError(`Request timed out after ${requestTimeoutMs}ms`, "timeout", {
              cause: error,
            })
          : error;

      if (!shouldRetry(lastError, attempt, retries)) {
        throw lastError;
      }

      const delayMs = retryDelayMs(lastError, attempt);
      console.warn(
        `Temporary ${classifyError(lastError)} error. Retrying in ${Math.round(delayMs)}ms (${attempt + 1}/${retries})...`
      );
      await sleep(delayMs);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError;
}

async function fetchJsonWithRetry(url, options = {}, retries = requestRetries) {
  const body = await fetchTextWithRetry(url, options, retries);

  try {
    return JSON.parse(body);
  } catch (error) {
    throw createTypedError("Could not parse JSON response.", "parsing", {
      cause: error,
    });
  }
}

function imageFromOsmTags(tags = {}) {
  const directImage = safeHttpUrl(tags.image);

  if (directImage) return directImage;

  if (tags.image && /^(File|Image):/i.test(tags.image)) {
    return commonsFileUrl(tags.image);
  }

  if (tags.wikimedia_commons && /^(File|Image):/i.test(tags.wikimedia_commons)) {
    return commonsFileUrl(tags.wikimedia_commons);
  }

  return null;
}

function wikidataIdFromTags(tags = {}) {
  const rawId = tags.wikidata || tags["brand:wikidata"] || tags["subject:wikidata"];

  if (!rawId || typeof rawId !== "string") return null;

  const trimmed = rawId.trim();

  return /^Q\d+$/i.test(trimmed) ? trimmed.toUpperCase() : null;
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function coordinate(value) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function nameSimilarityScore(temple, tags = {}) {
  const templeName = normalizeText(temple.name);
  const osmNames = [
    tags.name,
    tags["name:en"],
    tags.official_name,
    tags["official_name:en"],
  ]
    .map(normalizeText)
    .filter(Boolean);

  if (!templeName || osmNames.length === 0) return 0;

  if (osmNames.some((name) => name === templeName)) return 3;
  if (osmNames.some((name) => name.includes(templeName) || templeName.includes(name))) {
    return 2;
  }

  return 0;
}

function buildOverpassQuery(temple) {
  const latitude = coordinate(temple.latitude);
  const longitude = coordinate(temple.longitude);

  if (latitude === null || longitude === null) return null;

  return `
    [out:json][timeout:60];
    (
      node["amenity"="place_of_worship"](around:${overpassRadiusMeters},${latitude},${longitude});
      way["amenity"="place_of_worship"](around:${overpassRadiusMeters},${latitude},${longitude});
      relation["amenity"="place_of_worship"](around:${overpassRadiusMeters},${latitude},${longitude});
    );
    out center tags 25;
  `;
}

async function findOsmMetadata(temple) {
  const query = buildOverpassQuery(temple);

  if (!query) return {};

  await sleep(overpassPauseMs);

  try {
    const data = await fetchJsonWithRetry(OVERPASS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
        "User-Agent": "RELIGIOUS temple image enrichment (OpenStreetMap Overpass)",
      },
      body: query,
    });
    const elements = Array.isArray(data.elements) ? data.elements : [];
    const rankedElements = elements
      .map((element) => ({
        element,
        score: nameSimilarityScore(temple, element.tags || {}),
      }))
      .sort((first, second) => second.score - first.score);

    for (const { element, score } of rankedElements) {
      const tags = element.tags || {};
      const imageUrl = imageFromOsmTags(tags);
      const wikidataId = wikidataIdFromTags(tags);

      if (score > 0 && (imageUrl || wikidataId)) {
        return { imageUrl, wikidataId };
      }
    }

    for (const { element } of rankedElements) {
      const tags = element.tags || {};
      const imageUrl = imageFromOsmTags(tags);
      const wikidataId = wikidataIdFromTags(tags);

      if (imageUrl || wikidataId) {
        return { imageUrl, wikidataId };
      }
    }
  } catch (error) {
    const type = recordError(error);
    console.warn(`OSM lookup failed for ${temple.name || temple.id} [${type}]: ${error.message || error}`);
  }

  return {};
}

function wikidataClaimValue(entity, propertyId) {
  const claim = entity?.claims?.[propertyId]?.[0];
  const value = claim?.mainsnak?.datavalue?.value;

  if (!value) return null;

  return typeof value === "string" ? value : null;
}

async function imageFromWikidataId(qid) {
  if (!qid) return null;

  const normalizedQid = String(qid).toUpperCase();

  if (wikidataEntityCache.has(normalizedQid)) {
    return wikidataEntityCache.get(normalizedQid);
  }

  await sleep(wikidataPauseMs);

  try {
    const data = await fetchJsonWithRetry(`${WIKIDATA_ENTITY_URL}/${normalizedQid}.json`, {
      headers: {
        "User-Agent": "RELIGIOUS temple image enrichment (Wikidata)",
      },
    });
    const entity = data?.entities?.[normalizedQid];

    if (!entity || entity.missing) {
      wikidataEntityCache.set(normalizedQid, null);
      return null;
    }

    const imageFile = wikidataClaimValue(entity, "P18");
    const imageUrl = imageFile ? commonsFileUrl(imageFile) : null;

    wikidataEntityCache.set(normalizedQid, imageUrl);
    return imageUrl;
  } catch (error) {
    const type = recordError(error);
    console.warn(`Wikidata entity lookup failed for ${normalizedQid} [${type}]: ${error.message || error}`);

    if (type === "not_found") {
      wikidataEntityCache.set(normalizedQid, null);
    }

    return null;
  }
}

async function searchWikidataImage(temple) {
  const name = temple.name?.trim();

  if (!name) return null;

  const searchText = [name, temple.city, temple.country].filter(Boolean).join(" ");
  const searchKey = normalizeText(searchText);

  if (wikidataSearchCache.has(searchKey)) {
    return wikidataSearchCache.get(searchKey);
  }

  const url = new URL(WIKIDATA_API_URL);
  url.searchParams.set("action", "wbsearchentities");
  url.searchParams.set("format", "json");
  url.searchParams.set("language", "en");
  url.searchParams.set("limit", "5");
  url.searchParams.set("search", searchText);

  await sleep(wikidataPauseMs);

  try {
    const data = await fetchJsonWithRetry(url.toString(), {
      headers: {
        "User-Agent": "RELIGIOUS temple image enrichment (Wikidata search)",
      },
    });
    const results = Array.isArray(data.search) ? data.search : [];

    for (const result of results) {
      const qid = typeof result.id === "string" ? result.id : null;
      const imageUrl = await imageFromWikidataId(qid);

      if (imageUrl) {
        wikidataSearchCache.set(searchKey, imageUrl);
        return imageUrl;
      }
    }

    wikidataSearchCache.set(searchKey, null);
  } catch (error) {
    const type = recordError(error);
    console.warn(`Wikidata search failed for ${name} [${type}]: ${error.message || error}`);

    if (type === "not_found") {
      wikidataSearchCache.set(searchKey, null);
    }
  }

  return null;
}

async function findImageUrl(temple) {
  const osmMetadata = await findOsmMetadata(temple);

  if (osmMetadata.imageUrl) {
    return { imageUrl: osmMetadata.imageUrl, source: "OpenStreetMap" };
  }

  const wikidataImageFromOsm = await imageFromWikidataId(osmMetadata.wikidataId);

  if (wikidataImageFromOsm) {
    return { imageUrl: wikidataImageFromOsm, source: "OSM Wikidata tag" };
  }

  const wikidataSearchImage = await searchWikidataImage(temple);

  if (wikidataSearchImage) {
    return { imageUrl: wikidataSearchImage, source: "Wikidata search" };
  }

  return { imageUrl: null, source: null };
}

async function fetchTemplesWithoutImagesByCondition(conditionBuilder, seenIds, temples) {
  const pageSize = 500;
  let from = 0;

  while (temples.length < enrichLimit) {
    const to = from + pageSize - 1;
    const query = supabase
      .from("temples")
      .select("id, name, religion, country, city, latitude, longitude, image_url")
      .order("name", { ascending: true })
      .range(from, to);
    const { data, error } = await conditionBuilder(query);

    if (error) throw error;

    for (const temple of data || []) {
      if (seenIds.has(temple.id)) continue;

      seenIds.add(temple.id);
      temples.push(temple);

      if (temples.length >= enrichLimit) break;
    }

    if (!data || data.length < pageSize) break;

    from += pageSize;
  }
}

async function fetchTemplesWithoutImages() {
  const temples = [];
  const seenIds = new Set();

  await fetchTemplesWithoutImagesByCondition(
    (query) => query.is("image_url", null),
    seenIds,
    temples
  );

  if (temples.length < enrichLimit) {
    await fetchTemplesWithoutImagesByCondition(
      (query) => query.eq("image_url", ""),
      seenIds,
      temples
    );
  }

  return temples;
}

async function updateTempleImageIfMissing(temple, imageUrl) {
  const { data: currentTemple, error: readError } = await supabase
    .from("temples")
    .select("id, image_url")
    .eq("id", temple.id)
    .single();

  if (readError) throw readError;

  if (hasImageUrl(currentTemple?.image_url)) {
    return false;
  }

  const { error: updateError } = await supabase
    .from("temples")
    .update({ image_url: imageUrl })
    .eq("id", temple.id);

  if (updateError) throw updateError;

  await sleep(updatePauseMs);
  return true;
}

function printErrorSummary() {
  console.log("\nErrors by type:");

  if (errorSummary.size === 0) {
    console.log("none");
    return;
  }

  for (const [type, count] of [...errorSummary.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    console.log(`${type}: ${count}`);
  }
}

async function main() {
  console.log("Starting temple image enrichment...");
  console.log(`Limit this run: ${enrichLimit}`);
  console.log(`HTTP retries: ${requestRetries}`);
  console.log(`HTTP timeout: ${requestTimeoutMs}ms`);

  const temples = await fetchTemplesWithoutImages();
  const summary = {
    checked: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
  };

  console.log(`Found ${temples.length} temples without image_url.`);

  for (const temple of temples) {
    summary.checked += 1;

    try {
      const { imageUrl, source } = await findImageUrl(temple);

      if (!imageUrl) {
        summary.skipped += 1;
        console.log(`Skipped: ${temple.name || temple.id} (no image found)`);
        continue;
      }

      const updated = await updateTempleImageIfMissing(temple, imageUrl);

      if (updated) {
        summary.updated += 1;
        console.log(`Updated: ${temple.name || temple.id} (${source})`);
      } else {
        summary.skipped += 1;
        console.log(`Skipped: ${temple.name || temple.id} (already has image)`);
      }
    } catch (error) {
      const type = recordError(error);
      summary.errors += 1;
      console.error(`Error enriching ${temple.name || temple.id} [${type}]:`, error.message || error);
    }

    console.log(
      `Progress: checked=${summary.checked}, updated=${summary.updated}, skipped=${summary.skipped}, errors=${summary.errors}`
    );
  }

  console.log("\nTemple image enrichment finished.");
  console.log(`Checked: ${summary.checked}`);
  console.log(`Updated: ${summary.updated}`);
  console.log(`Skipped: ${summary.skipped}`);
  console.log(`Errors: ${summary.errors}`);
  console.log(`Wikidata entity cache entries: ${wikidataEntityCache.size}`);
  console.log(`Wikidata search cache entries: ${wikidataSearchCache.size}`);
  printErrorSummary();

  if (summary.errors > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  const type = recordError(error);
  console.error(`ENRICHMENT FAILED [${type}]:`);
  console.error(error);
  printErrorSummary();
  process.exitCode = 1;
});
