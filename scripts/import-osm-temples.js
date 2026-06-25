require("dotenv").config({ path: ".env.local" });

const { createClient } = require("@supabase/supabase-js");

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const WIKIDATA_ENTITY_URL = "https://www.wikidata.org/wiki/Special:EntityData";
const COMMONS_FILE_URL = "https://commons.wikimedia.org/wiki/Special:FilePath";
const IMPORT_PROGRESS_TABLE = "osm_import_progress";

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

const COUNTRIES = [
  ["AF", "Afghanistan"],
  ["AL", "Albania"],
  ["DZ", "Algeria"],
  ["AD", "Andorra"],
  ["AO", "Angola"],
  ["AR", "Argentina"],
  ["AM", "Armenia"],
  ["AU", "Australia"],
  ["AT", "Austria"],
  ["AZ", "Azerbaijan"],
  ["BH", "Bahrain"],
  ["BD", "Bangladesh"],
  ["BY", "Belarus"],
  ["BE", "Belgium"],
  ["BA", "Bosnia and Herzegovina"],
  ["BR", "Brazil"],
  ["BG", "Bulgaria"],
  ["KH", "Cambodia"],
  ["CA", "Canada"],
  ["CL", "Chile"],
  ["CN", "China"],
  ["CO", "Colombia"],
  ["HR", "Croatia"],
  ["CY", "Cyprus"],
  ["CZ", "Czechia"],
  ["DK", "Denmark"],
  ["EG", "Egypt"],
  ["EE", "Estonia"],
  ["ET", "Ethiopia"],
  ["FI", "Finland"],
  ["FR", "France"],
  ["GE", "Georgia"],
  ["DE", "Germany"],
  ["GR", "Greece"],
  ["HU", "Hungary"],
  ["IS", "Iceland"],
  ["IN", "India"],
  ["ID", "Indonesia"],
  ["IR", "Iran"],
  ["IQ", "Iraq"],
  ["IE", "Ireland"],
  ["IL", "Israel"],
  ["IT", "Italy"],
  ["JP", "Japan"],
  ["JO", "Jordan"],
  ["KZ", "Kazakhstan"],
  ["KE", "Kenya"],
  ["KW", "Kuwait"],
  ["LA", "Laos"],
  ["LV", "Latvia"],
  ["LB", "Lebanon"],
  ["LT", "Lithuania"],
  ["MY", "Malaysia"],
  ["MX", "Mexico"],
  ["MN", "Mongolia"],
  ["ME", "Montenegro"],
  ["MA", "Morocco"],
  ["MM", "Myanmar"],
  ["NP", "Nepal"],
  ["NL", "Netherlands"],
  ["NZ", "New Zealand"],
  ["NG", "Nigeria"],
  ["MK", "North Macedonia"],
  ["NO", "Norway"],
  ["OM", "Oman"],
  ["PK", "Pakistan"],
  ["PS", "Palestine"],
  ["PE", "Peru"],
  ["PH", "Philippines"],
  ["PL", "Poland"],
  ["PT", "Portugal"],
  ["QA", "Qatar"],
  ["RO", "Romania"],
  ["SA", "Saudi Arabia"],
  ["RS", "Serbia"],
  ["SG", "Singapore"],
  ["SK", "Slovakia"],
  ["SI", "Slovenia"],
  ["ZA", "South Africa"],
  ["KR", "South Korea"],
  ["ES", "Spain"],
  ["LK", "Sri Lanka"],
  ["SE", "Sweden"],
  ["CH", "Switzerland"],
  ["SY", "Syria"],
  ["TW", "Taiwan"],
  ["TH", "Thailand"],
  ["TR", "Turkey"],
  ["UA", "Ukraine"],
  ["AE", "United Arab Emirates"],
  ["GB", "United Kingdom"],
  ["US", "United States"],
  ["UZ", "Uzbekistan"],
  ["VN", "Vietnam"],
];

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const countryLimit = Number(process.env.OSM_COUNTRY_LIMIT || 5);
const elementLimitPerCountry = Number(process.env.OSM_IMPORT_LIMIT_PER_COUNTRY || 500);
const overpassPauseMs = Number(process.env.OSM_OVERPASS_PAUSE_MS || 6000);
const wikidataPauseMs = Number(process.env.OSM_WIKIDATA_PAUSE_MS || 350);
const updateExisting = process.env.OSM_UPDATE_EXISTING !== "false";
const reimportCompleted = process.env.OSM_REIMPORT_COMPLETED === "true";

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

const wikidataCache = new Map();

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

function osmImageUrl(tags) {
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

function websiteUrl(tags) {
  return (
    safeHttpUrl(tags.website) ||
    safeHttpUrl(tags["contact:website"]) ||
    safeHttpUrl(tags.url)
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

function wikidataId(tags) {
  const rawId = tags.wikidata || tags["brand:wikidata"] || tags["subject:wikidata"];

  if (!rawId || typeof rawId !== "string") return null;

  const trimmed = rawId.trim();

  return /^Q\d+$/i.test(trimmed) ? trimmed.toUpperCase() : null;
}

function wikidataClaimValue(entity, propertyId) {
  const claim = entity?.claims?.[propertyId]?.[0];
  const value = claim?.mainsnak?.datavalue?.value;

  if (!value) return null;

  if (typeof value === "string") return value;

  return null;
}

async function fetchJsonWithRetry(url, options = {}, retries = 2) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, options);
      const body = await response.text();

      if (!response.ok) {
        throw new Error(`${response.status}: ${body.slice(0, 300)}`);
      }

      return JSON.parse(body);
    } catch (error) {
      lastError = error;

      if (attempt < retries) {
        await sleep((attempt + 1) * 1500);
      }
    }
  }

  throw lastError;
}

async function fetchWikidataMetadata(qid) {
  if (!qid) return {};

  if (wikidataCache.has(qid)) {
    return wikidataCache.get(qid);
  }

  await sleep(wikidataPauseMs);

  try {
    const data = await fetchJsonWithRetry(`${WIKIDATA_ENTITY_URL}/${qid}.json`, {
      headers: {
        "User-Agent": "RELIGIOUS temple importer (Wikidata metadata)",
      },
    });
    const entity = data?.entities?.[qid];
    const description = entity?.descriptions?.en?.value || null;
    const officialWebsite = safeHttpUrl(wikidataClaimValue(entity, "P856"));
    const imageFile = wikidataClaimValue(entity, "P18");
    const imageUrl = imageFile ? commonsFileUrl(imageFile) : null;
    const metadata = {
      description,
      image_url: imageUrl,
      website_url: officialWebsite,
    };

    wikidataCache.set(qid, metadata);
    return metadata;
  } catch (error) {
    console.warn(`Wikidata metadata failed for ${qid}: ${error.message || error}`);
    const metadata = {};
    wikidataCache.set(qid, metadata);
    return metadata;
  }
}

async function osmElementToTemple(element, country) {
  const tags = element.tags || {};
  const name = elementName(tags);
  const latitude = element.lat ?? element.center?.lat ?? null;
  const longitude = element.lon ?? element.center?.lon ?? null;
  const religionTag = String(tags.religion || "").toLowerCase();
  const religion = RELIGION_LABELS[religionTag] || null;

  if (!name || !religion || !latitude || !longitude) return null;

  const city = elementCity(tags);
  const countryName = tags["addr:country"] || country.name;
  const denomination = tags.denomination || tags["denomination:en"] || null;
  const wikidata = await fetchWikidataMetadata(wikidataId(tags));
  const description =
    tags.description ||
    wikidata.description ||
    elementDescription(element, religion, denomination, city, countryName);

  return {
    name,
    religion,
    denomination,
    country: countryName,
    city,
    address: elementAddress(tags, city, countryName),
    latitude,
    longitude,
    description,
    image_url: osmImageUrl(tags) || wikidata.image_url || null,
    website_url: websiteUrl(tags) || wikidata.website_url || null,
  };
}

function selectedCountries() {
  const requestedCodes = process.env.OSM_COUNTRY_CODES;
  const countries = requestedCodes
    ? COUNTRIES.filter(([code]) =>
        requestedCodes
          .split(",")
          .map((value) => value.trim().toUpperCase())
          .includes(code)
      )
    : COUNTRIES;

  return countries.map(([code, name]) => ({ code, name }));
}

function buildOverpassQuery(country) {
  const religionPattern = RELIGION_TAGS.join("|");

  return `
    [out:json][timeout:180];
    area["ISO3166-1"="${country.code}"][admin_level=2]->.searchArea;
    (
      node["amenity"="place_of_worship"]["religion"~"^(${religionPattern})$"](area.searchArea);
      way["amenity"="place_of_worship"]["religion"~"^(${religionPattern})$"](area.searchArea);
      relation["amenity"="place_of_worship"]["religion"~"^(${religionPattern})$"](area.searchArea);
    );
    out center ${elementLimitPerCountry};
  `;
}

async function fetchOverpassCountry(country) {
  const response = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain",
      "User-Agent": "RELIGIOUS temple importer (OpenStreetMap Overpass)",
    },
    body: buildOverpassQuery(country),
  });

  const body = await response.text();

  if (!response.ok) {
    throw new Error(`Overpass ${response.status}: ${body.slice(0, 300)}`);
  }

  return JSON.parse(body);
}

async function assertProgressTableExists() {
  const { error } = await supabase
    .from(IMPORT_PROGRESS_TABLE)
    .select("country_code")
    .limit(1);

  if (error) {
    throw new Error(
      `Missing or inaccessible ${IMPORT_PROGRESS_TABLE}. Run scripts/create-osm-import-progress.sql in Supabase first. Original error: ${error.message}`
    );
  }
}

async function getCountryProgress(countryCode) {
  const { data, error } = await supabase
    .from(IMPORT_PROGRESS_TABLE)
    .select("*")
    .eq("country_code", countryCode)
    .maybeSingle();

  if (error) throw error;

  return data;
}

async function saveCountryProgress(country, patch) {
  const { error } = await supabase.from(IMPORT_PROGRESS_TABLE).upsert(
    {
      country_code: country.code,
      country_name: country.name,
      last_run_at: new Date().toISOString(),
      ...patch,
    },
    { onConflict: "country_code" }
  );

  if (error) throw error;
}

async function loadExistingTempleIndex() {
  const byDuplicateKey = new Map();
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from("temples")
      .select(
        "id, name, religion, denomination, country, city, address, latitude, longitude, description, image_url, website_url"
      )
      .range(from, to);

    if (error) throw error;

    for (const temple of data || []) {
      const key = duplicateKey(temple.name, temple.latitude, temple.longitude);

      if (key) byDuplicateKey.set(key, temple);
    }

    if (!data || data.length < pageSize) break;

    from += pageSize;
  }

  return byDuplicateKey;
}

function missingFieldUpdates(existingTemple, importedTemple) {
  const updates = {};
  const fields = [
    "religion",
    "denomination",
    "country",
    "city",
    "address",
    "description",
    "image_url",
    "website_url",
  ];

  for (const field of fields) {
    const currentValue = existingTemple[field];
    const nextValue = importedTemple[field];

    if (
      updateExisting &&
      (currentValue === null || currentValue === undefined || currentValue === "") &&
      nextValue !== null &&
      nextValue !== undefined &&
      nextValue !== ""
    ) {
      updates[field] = nextValue;
    }
  }

  return updates;
}

async function insertTemple(temple) {
  const { data, error } = await supabase
    .from("temples")
    .insert(temple)
    .select(
      "id, name, religion, denomination, country, city, address, latitude, longitude, description, image_url, website_url"
    )
    .single();

  if (error) throw error;

  return data;
}

async function updateTemple(existingTemple, updates) {
  const { data, error } = await supabase
    .from("temples")
    .update(updates)
    .eq("id", existingTemple.id)
    .select(
      "id, name, religion, denomination, country, city, address, latitude, longitude, description, image_url, website_url"
    )
    .single();

  if (error) throw error;

  return data;
}

async function importCountry(country, existingIndex) {
  const stats = {
    fetched: 0,
    candidates: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
  };

  await saveCountryProgress(country, {
    status: "running",
    started_at: new Date().toISOString(),
    completed_at: null,
    last_error: null,
  });

  const data = await fetchOverpassCountry(country);
  const elements = Array.isArray(data.elements) ? data.elements : [];
  stats.fetched = elements.length;

  for (const element of elements) {
    try {
      const temple = await osmElementToTemple(element, country);

      if (!temple) {
        stats.skipped += 1;
        continue;
      }

      stats.candidates += 1;

      const key = duplicateKey(temple.name, temple.latitude, temple.longitude);

      if (!key) {
        stats.skipped += 1;
        continue;
      }

      const existingTemple = existingIndex.get(key);

      if (existingTemple) {
        const updates = missingFieldUpdates(existingTemple, temple);

        if (Object.keys(updates).length > 0) {
          const updatedTemple = await updateTemple(existingTemple, updates);
          existingIndex.set(key, updatedTemple);
          stats.updated += 1;
        } else {
          stats.skipped += 1;
        }

        continue;
      }

      const insertedTemple = await insertTemple(temple);
      existingIndex.set(key, insertedTemple);
      stats.inserted += 1;
    } catch (error) {
      stats.errors += 1;
      console.error(
        `Error importing OSM ${element.type}/${element.id} in ${country.code}:`,
        error.message || error
      );
    }
  }

  await saveCountryProgress(country, {
    status: stats.errors > 0 ? "completed_with_errors" : "completed",
    completed_at: new Date().toISOString(),
    fetched: stats.fetched,
    candidates: stats.candidates,
    inserted: stats.inserted,
    updated: stats.updated,
    skipped: stats.skipped,
    errors: stats.errors,
  });

  return stats;
}

async function countriesToImport() {
  const countries = selectedCountries();
  const pendingCountries = [];

  for (const country of countries) {
    const progress = await getCountryProgress(country.code);

    if (
      !reimportCompleted &&
      (progress?.status === "completed" ||
        progress?.status === "completed_with_errors")
    ) {
      continue;
    }

    pendingCountries.push(country);

    if (pendingCountries.length >= countryLimit) {
      break;
    }
  }

  return pendingCountries;
}

function printCountryStats(country, stats) {
  console.log(`\n${country.name} (${country.code}) import stats:`);
  console.log(`Fetched: ${stats.fetched}`);
  console.log(`Candidates: ${stats.candidates}`);
  console.log(`Inserted: ${stats.inserted}`);
  console.log(`Updated: ${stats.updated}`);
  console.log(`Skipped: ${stats.skipped}`);
  console.log(`Errors: ${stats.errors}`);
}

async function main() {
  console.log("Starting production OpenStreetMap temples import...");
  console.log(`Country limit this run: ${countryLimit}`);
  console.log(`Overpass element limit per country: ${elementLimitPerCountry}`);
  console.log("Duplicate check: name + latitude + longitude");
  console.log("Progress table: osm_import_progress");

  await assertProgressTableExists();

  const countries = await countriesToImport();

  if (countries.length === 0) {
    console.log("No pending countries found. Use OSM_REIMPORT_COMPLETED=true to run completed countries again.");
    return;
  }

  const existingIndex = await loadExistingTempleIndex();
  const totalStats = {
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
  };

  for (const country of countries) {
    console.log(`\nImporting ${country.name} (${country.code})...`);

    try {
      const stats = await importCountry(country, existingIndex);
      printCountryStats(country, stats);
      totalStats.inserted += stats.inserted;
      totalStats.updated += stats.updated;
      totalStats.skipped += stats.skipped;
      totalStats.errors += stats.errors;
    } catch (error) {
      totalStats.errors += 1;
      await saveCountryProgress(country, {
        status: "failed",
        completed_at: null,
        last_error: String(error.message || error).slice(0, 1000),
      });
      console.error(`Failed importing ${country.name}:`, error.message || error);
    }

    await sleep(overpassPauseMs);
  }

  console.log("\nWorld temple import run finished.");
  console.log(`Inserted: ${totalStats.inserted}`);
  console.log(`Updated: ${totalStats.updated}`);
  console.log(`Skipped: ${totalStats.skipped}`);
  console.log(`Errors: ${totalStats.errors}`);

  if (totalStats.errors > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("IMPORT FAILED:");
  console.error(error);
  process.exitCode = 1;
});
