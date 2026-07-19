require("dotenv").config({ path: ".env.local" });

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const PAGE_SIZE = 1000;
const OUTPUT_PATH = path.join(
  process.cwd(),
  "docs",
  "temple-data-quality-report.md"
);

const BASE_FIELDS = [
  "id",
  "name",
  "religion",
  "denomination",
  "country",
  "city",
  "address",
  "description",
  "image_url",
  "website_url",
  "latitude",
  "longitude",
  "created_at",
];

const OPTIONAL_FIELDS = ["external_id", "source", "type", "phone"];

const CLEAR_RELIGION_ALIASES = {
  christian: "Christianity",
  christianity: "Christianity",
  church: "Christianity",
  muslim: "Islam",
  islam: "Islam",
  mosque: "Islam",
  jewish: "Judaism",
  judaism: "Judaism",
  synagogue: "Judaism",
  buddhist: "Buddhism",
  buddhism: "Buddhism",
  hindu: "Hinduism",
  hinduism: "Hinduism",
  sikh: "Sikhism",
  sikhism: "Sikhism",
  taoist: "Taoism",
  taoism: "Taoism",
  shinto: "Shinto",
  egyptian: "Ancient Egyptian",
  "ancient egyptian": "Ancient Egyptian",
};

const SACRED_PLACE_LABELS = new Set([
  "",
  "unknown",
  "religious place",
  "place of worship",
  "sacred place",
]);

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

const GENERIC_CITY_VALUES = new Set([
  "unknown",
  "none",
  "n/a",
  "city",
  "town",
  "village",
  "municipality",
]);

function cleanKey(value) {
  return String(value || "")
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function cleanDisplayLabel(value) {
  const cleaned = String(value || "")
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

  if (!cleaned) return "Sacred place";

  return cleaned
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function normalizeReligionLabel(value) {
  const key = cleanKey(value);

  if (CLEAR_RELIGION_ALIASES[key]) return CLEAR_RELIGION_ALIASES[key];
  if (SACRED_PLACE_LABELS.has(key)) return "Sacred place";
  if (key === "other") return "Other";

  return cleanDisplayLabel(value);
}

function hasText(value) {
  return typeof value === "string" ? value.trim().length > 0 : Boolean(value);
}

function validCoordinates(temple) {
  return Number.isFinite(Number(temple.latitude)) &&
    Number.isFinite(Number(temple.longitude));
}

function roundedCoordinate(value, precision = 5) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed.toFixed(precision) : "";
}

function qualityScore(temple) {
  let score = 0;

  if (hasText(temple.image_url)) score += 3;
  if (hasText(temple.description)) score += 2;
  if (hasText(temple.website_url)) score += 2;
  if (hasText(temple.denomination)) score += 1;
  if (hasText(temple.city)) score += 1;
  if (hasText(temple.address)) score += 1;
  if (hasText(temple.religion)) score += 1;
  if (validCoordinates(temple)) score += 1;

  return score;
}

function countBy(rows, getter) {
  const counts = new Map();

  for (const row of rows) {
    const key = getter(row);
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return counts;
}

function topCounts(counts, limit = 50) {
  return Array.from(counts.entries())
    .sort((first, second) => second[1] - first[1] || String(first[0]).localeCompare(String(second[0])))
    .slice(0, limit);
}

function markdownTable(headers, rows) {
  if (!rows.length) return "_No rows._\n";

  const escapeCell = (value) =>
    String(value ?? "")
      .replace(/\|/g, "\\|")
      .replace(/\n/g, " ");

  return [
    `| ${headers.map(escapeCell).join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(escapeCell).join(" | ")} |`),
  ].join("\n") + "\n";
}

function rowSummary(temple) {
  return [
    temple.id,
    temple.name || "",
    temple.city || "",
    temple.country || "",
    temple.religion || "",
  ];
}

async function detectOptionalFields(supabase) {
  const available = [];

  for (const field of OPTIONAL_FIELDS) {
    const { error } = await supabase
      .from("temples")
      .select(`id, ${field}`)
      .limit(1);

    if (!error) available.push(field);
  }

  return available;
}

async function fetchAllTemples(supabase, fields) {
  const rows = [];
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("temples")
      .select(fields.join(", "))
      .range(from, to);

    if (error) throw error;

    rows.push(...(data || []));

    if (!data || data.length < PAGE_SIZE) break;

    from += PAGE_SIZE;
  }

  return rows;
}

function buildDuplicateGroups(rows, keyGetter) {
  const groups = new Map();

  for (const row of rows) {
    const key = keyGetter(row);
    if (!key) continue;

    const current = groups.get(key) || [];
    current.push(row);
    groups.set(key, current);
  }

  return Array.from(groups.entries())
    .filter(([, group]) => group.length > 1)
    .sort((first, second) => second[1].length - first[1].length || first[0].localeCompare(second[0]));
}

function similarNameKey(name) {
  return cleanKey(name)
    .replace(/\b(the|saint|st)\b/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 42);
}

function buildReport({ rows, optionalFields, generatedAt }) {
  const missing = (field) => rows.filter((row) => !hasText(row[field])).length;
  const missingCoordinates = rows.filter((row) => !validCoordinates(row)).length;
  const rawReligionCounts = countBy(rows, (row) => row.religion || "(missing)");
  const normalizedReligionCounts = countBy(rows, (row) =>
    normalizeReligionLabel(row.religion)
  );
  const countryCounts = countBy(rows, (row) => row.country || "(missing)");
  const cityCounts = countBy(rows, (row) => row.city || "(missing)");
  const suspiciousCities = rows.filter((row) =>
    GENERIC_CITY_VALUES.has(cleanKey(row.city))
  );

  const duplicateLocationGroups = buildDuplicateGroups(rows, (row) => {
    const name = cleanKey(row.name);
    const city = cleanKey(row.city);
    const country = cleanKey(row.country);

    return name && city && country ? `${name}|${city}|${country}` : null;
  });

  const duplicateCoordinateGroups = buildDuplicateGroups(rows, (row) => {
    const name = cleanKey(row.name);
    const lat = roundedCoordinate(row.latitude, 5);
    const lng = roundedCoordinate(row.longitude, 5);

    return name && lat && lng ? `${name}|${lat}|${lng}` : null;
  });

  const closeCoordinateGroups = buildDuplicateGroups(rows, (row) => {
    const name = similarNameKey(row.name);
    const lat = roundedCoordinate(row.latitude, 3);
    const lng = roundedCoordinate(row.longitude, 3);

    return name && lat && lng ? `${name}|${lat}|${lng}` : null;
  });

  const genericNameRows = rows.filter((row) =>
    GENERIC_NAMES.has(cleanKey(row.name))
  );

  const scoredRows = rows.map((row) => ({
    ...row,
    quality_score: qualityScore(row),
  }));
  const totalScore = scoredRows.reduce((sum, row) => sum + row.quality_score, 0);
  const averageQualityScore = rows.length ? totalScore / rows.length : 0;
  const scoreDistribution = countBy(scoredRows, (row) => row.quality_score);
  const highestQuality = [...scoredRows]
    .sort((first, second) => second.quality_score - first.quality_score || cleanKey(first.name).localeCompare(cleanKey(second.name)))
    .slice(0, 20);
  const lowestQuality = [...scoredRows]
    .sort((first, second) => first.quality_score - second.quality_score || cleanKey(first.name).localeCompare(cleanKey(second.name)))
    .slice(0, 20);

  const imageCandidates = scoredRows
    .filter((row) =>
      hasText(row.name) &&
      (hasText(row.city) || hasText(row.country)) &&
      !hasText(row.image_url)
    )
    .sort((first, second) => second.quality_score - first.quality_score || cleanKey(first.name).localeCompare(cleanKey(second.name)))
    .slice(0, 20);

  const websiteCandidates = scoredRows
    .filter((row) =>
      hasText(row.name) &&
      (hasText(row.city) || hasText(row.country)) &&
      !hasText(row.website_url)
    )
    .sort((first, second) => second.quality_score - first.quality_score || cleanKey(first.name).localeCompare(cleanKey(second.name)))
    .slice(0, 20);

  const normalizationCandidates = topCounts(rawReligionCounts, 200)
    .map(([raw, count]) => ({
      raw,
      normalized: normalizeReligionLabel(raw === "(missing)" ? "" : raw),
      count,
    }))
    .filter((item) => item.raw !== item.normalized && item.raw !== "(missing)");

  const clearlyMappedNormalization = normalizationCandidates.filter((item) =>
    Object.prototype.hasOwnProperty.call(CLEAR_RELIGION_ALIASES, cleanKey(item.raw))
  );

  const strangeReligionLabels = topCounts(rawReligionCounts, 200)
    .map(([raw, count]) => ({ raw, normalized: normalizeReligionLabel(raw), count }))
    .filter((item) => {
      const key = cleanKey(item.raw);
      return item.raw !== "(missing)" &&
        !CLEAR_RELIGION_ALIASES[key] &&
        !SACRED_PLACE_LABELS.has(key) &&
        key !== "other";
    });

  const missingStats = [
    ["name", missing("name")],
    ["religion", missing("religion")],
    ["denomination", missing("denomination")],
    ["country", missing("country")],
    ["city", missing("city")],
    ["address", missing("address")],
    ["description", missing("description")],
    ["image_url", missing("image_url")],
    ["website_url", missing("website_url")],
    ["coordinates", missingCoordinates],
  ];

  const duplicateExamples = duplicateLocationGroups.slice(0, 20).map(([key, group]) => [
    key,
    group.length,
    group.slice(0, 3).map((row) => `${row.id}: ${row.name}`).join("; "),
  ]);

  const coordinateDuplicateExamples = duplicateCoordinateGroups.slice(0, 20).map(([key, group]) => [
    key,
    group.length,
    group.slice(0, 3).map((row) => `${row.id}: ${row.name}`).join("; "),
  ]);

  const closeDuplicateExamples = closeCoordinateGroups.slice(0, 20).map(([key, group]) => [
    key,
    group.length,
    group.slice(0, 3).map((row) => `${row.id}: ${row.name}`).join("; "),
  ]);

  const lines = [];

  lines.push("# Temple Data Quality Report");
  lines.push("");
  lines.push(`Generated: ${generatedAt}`);
  lines.push("");
  lines.push("> READ-ONLY AUDIT. No database rows were changed.");
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(markdownTable(["Metric", "Value"], [
    ["Total temples", rows.length],
    ["Valid coordinates", rows.length - missingCoordinates],
    ["Missing coordinates", missingCoordinates],
    ["Average quality score", averageQualityScore.toFixed(2)],
    ["Optional fields available", optionalFields.join(", ") || "None detected"],
  ]));
  lines.push("");
  lines.push("## Missing Field Stats");
  lines.push("");
  lines.push(markdownTable(["Field", "Missing count"], missingStats));
  lines.push("");
  lines.push("## Raw Religion Labels");
  lines.push("");
  lines.push(markdownTable(["Raw label", "Count"], topCounts(rawReligionCounts, 100)));
  lines.push("");
  lines.push("## Normalized Religion Labels");
  lines.push("");
  lines.push(markdownTable(["Normalized label", "Count"], topCounts(normalizedReligionCounts, 100)));
  lines.push("");
  lines.push("## Clear Religion Normalization Candidates");
  lines.push("");
  lines.push(markdownTable(
    ["Raw label", "Normalized label", "Count"],
    clearlyMappedNormalization.map((item) => [item.raw, item.normalized, item.count])
  ));
  lines.push("");
  lines.push("## Strange Religion Labels For Manual Review");
  lines.push("");
  lines.push(markdownTable(
    ["Raw label", "Display label", "Count"],
    strangeReligionLabels.slice(0, 50).map((item) => [item.raw, item.normalized, item.count])
  ));
  lines.push("");
  lines.push("## Countries And Cities");
  lines.push("");
  lines.push("### Top Countries");
  lines.push("");
  lines.push(markdownTable(["Country", "Count"], topCounts(countryCounts, 30)));
  lines.push("");
  lines.push("### Top Cities");
  lines.push("");
  lines.push(markdownTable(["City", "Count"], topCounts(cityCounts, 30)));
  lines.push("");
  lines.push(`Missing city count: ${missing("city")}`);
  lines.push("");
  lines.push("### Suspicious City Values");
  lines.push("");
  lines.push(markdownTable(["ID", "Name", "City", "Country", "Religion"], suspiciousCities.slice(0, 20).map(rowSummary)));
  lines.push("");
  lines.push("## Duplicate Detection");
  lines.push("");
  lines.push(`Duplicate name + city + country groups: ${duplicateLocationGroups.length}`);
  lines.push("");
  lines.push(markdownTable(["Duplicate key", "Rows", "Examples"], duplicateExamples));
  lines.push("");
  lines.push(`Duplicate name + rounded coordinates groups: ${duplicateCoordinateGroups.length}`);
  lines.push("");
  lines.push(markdownTable(["Duplicate key", "Rows", "Examples"], coordinateDuplicateExamples));
  lines.push("");
  lines.push(`Very close coordinates with similar name groups: ${closeCoordinateGroups.length}`);
  lines.push("");
  lines.push(markdownTable(["Close key", "Rows", "Examples"], closeDuplicateExamples));
  lines.push("");
  lines.push("## Generic Or Low-Quality Names");
  lines.push("");
  lines.push(`Generic name count: ${genericNameRows.length}`);
  lines.push("");
  lines.push(markdownTable(["ID", "Name", "City", "Country", "Religion"], genericNameRows.slice(0, 20).map(rowSummary)));
  lines.push("");
  lines.push("## Quality Score Distribution");
  lines.push("");
  lines.push(markdownTable(["Score", "Count"], topCounts(scoreDistribution, 50).sort((a, b) => Number(a[0]) - Number(b[0]))));
  lines.push("");
  lines.push("## Highest Quality Records");
  lines.push("");
  lines.push(markdownTable(
    ["Score", "ID", "Name", "City", "Country", "Religion"],
    highestQuality.map((row) => [row.quality_score, ...rowSummary(row)])
  ));
  lines.push("");
  lines.push("## Lowest Quality Records");
  lines.push("");
  lines.push(markdownTable(
    ["Score", "ID", "Name", "City", "Country", "Religion"],
    lowestQuality.map((row) => [row.quality_score, ...rowSummary(row)])
  ));
  lines.push("");
  lines.push("## Enrichment Candidates");
  lines.push("");
  lines.push("### Image Enrichment Candidates");
  lines.push("");
  lines.push(markdownTable(
    ["Score", "ID", "Name", "City", "Country", "Religion"],
    imageCandidates.map((row) => [row.quality_score, ...rowSummary(row)])
  ));
  lines.push("");
  lines.push("### Website Enrichment Candidates");
  lines.push("");
  lines.push(markdownTable(
    ["Score", "ID", "Name", "City", "Country", "Religion"],
    websiteCandidates.map((row) => [row.quality_score, ...rowSummary(row)])
  ));
  lines.push("");
  lines.push("### Religion Normalization Candidates");
  lines.push("");
  lines.push(markdownTable(
    ["Raw label", "Normalized label", "Count"],
    normalizationCandidates.slice(0, 50).map((item) => [item.raw, item.normalized, item.count])
  ));
  lines.push("");
  lines.push("### Manual Review Candidates");
  lines.push("");
  lines.push("- Strange religion labels listed above.");
  lines.push("- Generic names listed above.");
  lines.push("- Duplicate groups listed above.");
  lines.push("");
  lines.push("## Recommended Next Actions");
  lines.push("");
  lines.push("1. Normalize clear religion labels in a controlled migration or admin workflow.");
  lines.push("2. Review duplicate groups before deleting or merging anything.");
  lines.push("3. Prioritize image enrichment for high-quality records missing images.");
  lines.push("4. Prioritize website enrichment for records with strong names and locations.");
  lines.push("5. Create a manual moderation/admin workflow before large cleanup operations.");
  lines.push("");

  return {
    markdown: lines.join("\n"),
    summary: {
      total: rows.length,
      validCoordinates: rows.length - missingCoordinates,
      missing,
      missingCoordinates,
      averageQualityScore,
      duplicateLocationGroups: duplicateLocationGroups.length,
      duplicateCoordinateGroups: duplicateCoordinateGroups.length,
      closeCoordinateGroups: closeCoordinateGroups.length,
      genericNameCount: genericNameRows.length,
      rawReligionCounts,
      normalizedReligionCounts,
      clearlyMappedNormalization,
      strangeReligionLabels,
    },
  };
}

async function main() {
  console.log("READ-ONLY AUDIT. No database rows will be changed.");

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL.");
  }

  if (!supabaseKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const optionalFields = await detectOptionalFields(supabase);
  const fields = [...BASE_FIELDS, ...optionalFields];
  const rows = await fetchAllTemples(supabase, fields);
  const generatedAt = new Date().toISOString();
  const { markdown, summary } = buildReport({ rows, optionalFields, generatedAt });

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, markdown, "utf8");

  console.log("");
  console.log("Temple data quality audit summary:");
  console.log(`Total temples: ${summary.total}`);
  console.log(`Valid coordinates: ${summary.validCoordinates}`);
  console.log(`Missing coordinates: ${summary.missingCoordinates}`);
  console.log(`Missing religion: ${summary.missing("religion")}`);
  console.log(`Missing denomination: ${summary.missing("denomination")}`);
  console.log(`Missing city: ${summary.missing("city")}`);
  console.log(`Missing image_url: ${summary.missing("image_url")}`);
  console.log(`Missing website_url: ${summary.missing("website_url")}`);
  console.log(`Average quality score: ${summary.averageQualityScore.toFixed(2)}`);
  console.log(`Duplicate name + city + country groups: ${summary.duplicateLocationGroups}`);
  console.log(`Duplicate name + rounded coordinate groups: ${summary.duplicateCoordinateGroups}`);
  console.log(`Close coordinate + similar name groups: ${summary.closeCoordinateGroups}`);
  console.log(`Generic name count: ${summary.genericNameCount}`);
  console.log(`Markdown report saved: ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error("AUDIT FAILED:");
  console.error(error);
  process.exitCode = 1;
});
