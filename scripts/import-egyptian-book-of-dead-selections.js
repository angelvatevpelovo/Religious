require("dotenv").config({ path: ".env.local" });

const { createClient } = require("@supabase/supabase-js");
const axios = require("axios");

const INDEX_URL = "https://sacred-texts.com/egy/ebod/index.htm";
const BOOK_METADATA = {
  title: "The Egyptian Book of the Dead: Papyrus of Ani Selections",
  description:
    "Selected ancient Egyptian funerary and afterlife texts from the Papyrus of Ani, translated into English by E. A. Wallis Budge.",
  religion: "Ancient Egyptian religion",
  tradition: "Egyptian funerary and afterlife texts",
  language: "English",
  translator: "E. A. Wallis Budge",
  license: "Public domain in the USA",
  public_domain: true,
  source_url: INDEX_URL,
  text_type: "ancient_egyptian_selection",
};
const BASE_URL = "https://sacred-texts.com/egy/ebod/";
const SELECTED_SECTIONS = [
  {
    displayTitle: "Hymn to Osiris",
    pages: ["ebod14.htm"],
    start: /HYMN TO OSIRIS/i,
    stop: /Vignette|Appendix|PLATE|CHAPTER/i,
  },
  {
    displayTitle: "Hymn to Ra",
    pages: ["ebod27.htm", "ebod28.htm"],
    start: /A HYMN OF PRAISE To RA|A HYMN OF PRAISE TO RA/i,
    stop: /Vignette|Text\s*\[CHAPTER CXXXIII\]|Appendix|PLATE/i,
  },
  {
    displayTitle: "Entering the Hall of Double Right and Truth",
    pages: ["ebod35.htm"],
    start: /THE CHAPTER OF ENTERING INTO THE HALL OF DOUBLE RIGHT AND TRUTH/i,
    stop: /Appendix|Vignette|PLATE/i,
  },
  {
    displayTitle: "The Negative Confession",
    pages: ["ebod36.htm", "ebod37.htm"],
    start: /THE NEGATIVE CONFESSION/i,
    stop: /Appendix|PLATE XXXII\. \(continued\)|CHAPTER XLII/i,
  },
  {
    displayTitle: "Offerings to the Seven Cows and the Four Rudders",
    pages: ["ebod40.htm"],
    start: /CHAPTER CXLVIII/i,
    stop: /Appendix|Vignette|PLATE/i,
  },
];
const MIN_EXPECTED_SECTIONS = 5;
const MAX_EXPECTED_SECTIONS = 5;
const MIN_EXPECTED_PASSAGES = 30;
const MAX_EXPECTED_PASSAGES = 180;

const REQUIRED_BOOK_COLUMNS = ["title", "description", "content"];
const REQUIRED_CHAPTER_COLUMNS = ["book_id", "title", "chapter_number"];
const REQUIRED_VERSE_COLUMNS = ["chapter_id", "verse_number", "content"];

const parseOnly = process.env.EGYPTIAN_BOD_PARSE_ONLY === "1";
const debug = process.env.EGYPTIAN_BOD_DEBUG === "1";
let supabase = null;

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required for the Egyptian Book of the Dead import script.`);
  }

  return value;
}

if (!parseOnly) {
  supabase = createClient(
    process.env.SUPABASE_URL || requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

const REQUEST_HEADERS = {
  "User-Agent": "RELIGIOUS/1.1 Egyptian Book of the Dead selections importer",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

function decodeHtmlEntities(value) {
  const namedEntities = {
    AElig: "AE",
    aelig: "ae",
    Acirc: "A",
    acirc: "a",
    amp: "&",
    apos: "'",
    ccirc: "c",
    Ccirc: "C",
    eacute: "e",
    Eacute: "E",
    ecirc: "e",
    Ecirc: "E",
    egrave: "e",
    Egrave: "E",
    gt: ">",
    icirc: "i",
    Icirc: "I",
    ldquo: '"',
    lsquo: "'",
    lt: "<",
    mdash: "-",
    nbsp: " ",
    ndash: "-",
    oelig: "oe",
    OElig: "OE",
    ocirc: "o",
    Ocirc: "O",
    quot: '"',
    rdquo: '"',
    rsquo: "'",
    ucirc: "u",
    Ucirc: "U",
  };

  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCharCode(Number.parseInt(code, 16))
    )
    .replace(/&([a-zA-Z]+);/g, (match, name) => namedEntities[name] ?? match);
}

function cleanText(value) {
  return decodeHtmlEntities(value)
    .replace(/^\uFEFF/, "")
    .replace(/\{(?:footnote\s*)?p\.\s*\d+\}/gi, "")
    .replace(/\[[0-9]+\]/g, "")
    .replace(/#{2,}/g, "")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripHtml(value) {
  return cleanText(
    value
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
      .replace(/<a[^>]*>([\s\S]*?)<\/a>/gi, "$1")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  );
}

async function downloadHtml(file) {
  const url = `${BASE_URL}${file}`;
  const { data } = await axios.get(url, {
    responseType: "text",
    timeout: 30000,
    headers: REQUEST_HEADERS,
  });

  if (/Just a moment|Enable JavaScript and cookies|cf_chl/i.test(data)) {
    throw new Error(`Sacred Texts returned a challenge page for ${url}.`);
  }

  return data;
}

function extractMainHtml(html, file) {
  const bodyStart = html.search(/<BODY|<body/i);
  const navStart = html.search(/<nav\s+role=["']navigation["']|<HR>\s*<CENTER><A HREF=/i);

  if (bodyStart === -1) {
    throw new Error(`Could not find body for ${file}.`);
  }

  if (navStart === -1 || navStart <= bodyStart) {
    throw new Error(`Could not find navigation boundary for ${file}.`);
  }

  return html.slice(bodyStart, navStart);
}

function paragraphBlocks(html) {
  return [...html.matchAll(/<p(?:\s+[^>]*)?>([\s\S]*?)<\/p>/gi)]
    .map((match) => stripHtml(match[1]))
    .filter(Boolean);
}

function isFootnote(value) {
  return (
    /^\[\d+[\s.]/.test(value) ||
    /^[*.]\s/.test(value) ||
    /^\d+[.\s]/.test(value) ||
    /^[a-z]+(?:\s+[a-z]+){1,4}\s*,\s*"/.test(value)
  );
}

function isNonTranslation(value) {
  return (
    /^Sacred Texts$/i.test(value) ||
    /^Egypt$/i.test(value) ||
    /^Index$/i.test(value) ||
    /^Previous$/i.test(value) ||
    /^Next$/i.test(value) ||
    /^Vignette/i.test(value) ||
    /^Vignettes/i.test(value) ||
    /^Rubric/i.test(value) ||
    /^Appendix/i.test(value) ||
    /^PLATE/i.test(value)
  );
}

function removeSourceLabels(value) {
  return cleanText(
    value
      .replace(/^Text\s*:\s*/i, "")
      .replace(/^Text\s*\[[^\]]+\]\s*[:.]?\s*/i, "")
      .replace(/^\[[^\]]+\]\s*:?\s*/i, "")
      .replace(/^THE CHAPTER OF[^:]+:\s*/i, "")
  );
}

function cleanPassagePart(value) {
  return cleanText(value)
    .replace(/^\(\s*[ivxlcdm]+\s*\)\s*/i, "")
    .replace(/^\[[^\]]+\]\s*/i, "")
    .trim();
}

function splitNumberedPassage(value) {
  const normalized = value.replace(/\s+/g, " ").trim();
  const matches = [...normalized.matchAll(/\(\s*\d+\s*\)/g)];

  if (matches.length <= 1) {
    return [cleanPassagePart(normalized.replace(/\(\s*[ivxlcdm\d]+\s*\)/gi, ""))].filter(Boolean);
  }

  const parts = [];
  const prefix = cleanPassagePart(normalized.slice(0, matches[0].index));
  if (prefix.length >= 8) {
    parts.push(prefix);
  }

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
      const start = match.index + match[0].length;
      const next = matches[index + 1];
      const end = next ? next.index : normalized.length;
    const part = cleanPassagePart(normalized.slice(start, end));
    if (part.length >= 8) {
      parts.push(part);
    }
  }

  return parts;
}

function collectSectionParagraphs(sectionConfig, pages) {
  const collected = [];
  let active = false;
  let hasStarted = false;

  for (const page of pages) {
    const paragraphs = page.paragraphs;

    for (const rawParagraph of paragraphs) {
      const rawCleaned = cleanText(rawParagraph);
      const paragraph = removeSourceLabels(rawParagraph);

      if (!hasStarted && !active && (sectionConfig.start.test(rawCleaned) || sectionConfig.start.test(paragraph))) {
        active = true;
        hasStarted = true;
      }

      if (!paragraph) continue;
      if (!active) continue;

      if (collected.length > 0 && (sectionConfig.stop.test(rawCleaned) || sectionConfig.stop.test(paragraph))) {
        active = false;
        continue;
      }

      if (isFootnote(paragraph) || isNonTranslation(paragraph)) continue;

      const cleaned = removeSourceLabels(paragraph);
      if (!cleaned || isFootnote(cleaned) || isNonTranslation(cleaned)) continue;
      if (cleaned.length < 8) continue;

      collected.push(...splitNumberedPassage(cleaned));
    }
  }

  return collected;
}

async function loadPages(sectionConfig) {
  const pages = [];

  for (const file of sectionConfig.pages) {
    console.log(`Downloading ${sectionConfig.displayTitle}: ${BASE_URL}${file}`);
    const html = await downloadHtml(file);
    const mainHtml = extractMainHtml(html, file);
    pages.push({
      file,
      paragraphs: paragraphBlocks(mainHtml),
    });
  }

  return pages;
}

async function parseSelectedSections() {
  const sections = [];

  for (let index = 0; index < SELECTED_SECTIONS.length; index += 1) {
    const sectionConfig = SELECTED_SECTIONS[index];
    const pages = await loadPages(sectionConfig);
    const passages = collectSectionParagraphs(sectionConfig, pages);

    sections.push({
      number: index + 1,
      displayTitle: sectionConfig.displayTitle,
      verses: passages.map((content, passageIndex) => ({
        number: passageIndex + 1,
        content,
      })),
    });
  }

  validateParsedSections(sections);

  return sections;
}

function validateParsedSections(sections) {
  const passageCount = sections.reduce(
    (total, section) => total + section.verses.length,
    0
  );

  if (sections.length < MIN_EXPECTED_SECTIONS || sections.length > MAX_EXPECTED_SECTIONS) {
    throw new Error(
      `Expected ${MIN_EXPECTED_SECTIONS} Egyptian Book of the Dead selected sections, parsed ${sections.length}.`
    );
  }

  if (passageCount < MIN_EXPECTED_PASSAGES) {
    throw new Error(
      `Parsed only ${passageCount} Egyptian Book of the Dead passages; expected at least ${MIN_EXPECTED_PASSAGES}.`
    );
  }

  if (passageCount > MAX_EXPECTED_PASSAGES) {
    throw new Error(
      `Parsed ${passageCount} Egyptian Book of the Dead passages; this may be too broad for a selections import.`
    );
  }

  const forbidden = /Sacred Texts|Internet Sacred Text Archive|Google tag|Cloudflare|cf_chl|challenge-platform|Page navigation|Previous:|Next:|Title Page|Preface|Contents|Introduction|Dover reprint|Online Books Page|Appendix|Vignette|Naville|Todtenbuch|Brugsch|Lanzone|Pierret|License|Project Gutenberg/i;

  for (const section of sections) {
    if (!section.verses.length) {
      throw new Error(`Parsed ${section.displayTitle} with no passages.`);
    }

    for (const passage of section.verses) {
      if (forbidden.test(passage.content)) {
        throw new Error(
          `Detected note/navigation/source text in ${section.displayTitle}, passage ${passage.number}: ${passage.content.slice(0, 160)}`
        );
      }
    }
  }
}

function printParseSummary(sections) {
  const passageCount = sections.reduce(
    (total, section) => total + section.verses.length,
    0
  );

  console.log(`Selected section count: ${sections.length}`);
  console.log(`Total passage row count: ${passageCount}`);
  console.log(
    `Selected section titles: ${sections.map((section) => section.displayTitle).join(", ")}`
  );

  for (const section of sections) {
    console.log(`${section.displayTitle}: ${section.verses.length} passages`);
  }

  if (!debug) return;

  for (const section of sections) {
    const first = section.verses[0];
    const last = section.verses[section.verses.length - 1];
    console.log(`${section.displayTitle} first: ${first?.content ?? ""}`);
    console.log(`${section.displayTitle} last: ${last?.content ?? ""}`);
  }
}

function isMissingColumnError(error) {
  const message = `${error?.message ?? ""} ${error?.details ?? ""}`;

  return (
    error?.code === "PGRST204" ||
    /column .* does not exist/i.test(message) ||
    /Could not find .* column/i.test(message)
  );
}

function keepKeys(row, keys) {
  return Object.fromEntries(
    Object.entries(row).filter(([key]) => keys.includes(key))
  );
}

async function insertSingleWithFallback(table, row, requiredColumns) {
  const { data, error } = await supabase.from(table).insert(row).select().single();

  if (!error) return data;
  if (!isMissingColumnError(error)) throw error;

  const fallbackRow = keepKeys(row, requiredColumns);
  const { data: fallbackData, error: fallbackError } = await supabase
    .from(table)
    .insert(fallbackRow)
    .select()
    .single();

  if (fallbackError) throw fallbackError;

  console.warn(
    `Warning: ${table} metadata columns are missing. Inserted required columns only.`
  );

  return fallbackData;
}

async function insertManyWithFallback(table, rows, requiredColumns, size = 500) {
  for (let index = 0; index < rows.length; index += size) {
    const chunk = rows.slice(index, index + size);
    const { error } = await supabase.from(table).insert(chunk);

    if (!error) continue;
    if (!isMissingColumnError(error)) throw error;

    const fallbackChunk = chunk.map((row) => keepKeys(row, requiredColumns));
    const { error: fallbackError } = await supabase
      .from(table)
      .insert(fallbackChunk);

    if (fallbackError) throw fallbackError;

    console.warn(
      `Warning: ${table} metadata columns are missing. Inserted required columns only.`
    );
  }
}

async function getOrCreateBook() {
  if (!supabase) {
    throw new Error("Supabase client is unavailable in parse-only mode.");
  }

  const { data: existingBook, error: existingError } = await supabase
    .from("holy_books")
    .select("*")
    .eq("title", BOOK_METADATA.title)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existingBook) {
    return {
      book: existingBook,
      created: false,
    };
  }

  const book = await insertSingleWithFallback(
    "holy_books",
    {
      ...BOOK_METADATA,
      content: null,
    },
    REQUIRED_BOOK_COLUMNS
  );

  return {
    book,
    created: true,
  };
}

async function findExistingChapter(bookId, sectionNumber) {
  if (!supabase) {
    throw new Error("Supabase client is unavailable in parse-only mode.");
  }

  const { data, error } = await supabase
    .from("chapters")
    .select("id")
    .eq("book_id", bookId)
    .eq("chapter_number", sectionNumber)
    .maybeSingle();

  if (error) throw error;

  return data;
}

async function countChapterVerses(chapterId) {
  if (!supabase) {
    throw new Error("Supabase client is unavailable in parse-only mode.");
  }

  const { count, error } = await supabase
    .from("verses")
    .select("id", { count: "exact", head: true })
    .eq("chapter_id", chapterId);

  if (error) throw error;

  return count ?? 0;
}

function buildVerses(chapterId, verses) {
  return verses.map((verse, index) => ({
    chapter_id: chapterId,
    verse_number: index + 1,
    verse_label: "Passage",
    sort_order: index + 1,
    content: verse.content,
  }));
}

async function importSection(bookId, section) {
  const existingChapter = await findExistingChapter(bookId, section.number);

  if (existingChapter) {
    const verseCount = await countChapterVerses(existingChapter.id);

    if (verseCount > 0) {
      return {
        skipped: true,
        versesInserted: 0,
      };
    }

    const verses = buildVerses(existingChapter.id, section.verses);
    await insertManyWithFallback("verses", verses, REQUIRED_VERSE_COLUMNS);

    return {
      skipped: true,
      versesInserted: verses.length,
    };
  }

  const chapter = await insertSingleWithFallback(
    "chapters",
    {
      book_id: bookId,
      title: "The Egyptian Book of the Dead",
      chapter_number: section.number,
      section_label: "Section",
      display_title: section.displayTitle,
      sort_order: section.number,
    },
    REQUIRED_CHAPTER_COLUMNS
  );

  const verses = buildVerses(chapter.id, section.verses);
  await insertManyWithFallback("verses", verses, REQUIRED_VERSE_COLUMNS);

  return {
    skipped: false,
    versesInserted: verses.length,
  };
}

async function main() {
  const summary = {
    bookCreated: false,
    bookReused: false,
    sectionsInserted: 0,
    sectionsSkipped: 0,
    passagesInserted: 0,
    errors: 0,
  };

  console.log(
    parseOnly
      ? "Starting Egyptian Book of the Dead selections parse-only validation..."
      : "Starting Egyptian Book of the Dead selections import..."
  );

  const parsedSections = await parseSelectedSections();
  printParseSummary(parsedSections);

  if (parseOnly) {
    console.log("Parse-only mode enabled. No Supabase connection or import was attempted.");
    return;
  }

  const { book, created } = await getOrCreateBook();
  summary.bookCreated = created;
  summary.bookReused = !created;

  console.log(
    `${created ? "Created" : "Reused"} holy_books record: ${book.title} (${book.id})`
  );

  for (const section of parsedSections) {
    try {
      const result = await importSection(book.id, section);
      summary.passagesInserted += result.versesInserted;

      if (result.skipped) {
        summary.sectionsSkipped += 1;
        console.log(`Skipped ${section.displayTitle}`);
      } else {
        summary.sectionsInserted += 1;
        console.log(`Inserted ${section.displayTitle}`);
      }
    } catch (error) {
      summary.errors += 1;
      console.error(`${section.displayTitle} failed:`);
      console.error(error);
    }
  }

  console.log("DONE! Egyptian Book of the Dead selections import completed.");
  console.log("Import summary:");
  console.log(`Book created: ${summary.bookCreated ? "yes" : "no"}`);
  console.log(`Book reused: ${summary.bookReused ? "yes" : "no"}`);
  console.log(`Sections inserted: ${summary.sectionsInserted}`);
  console.log(`Sections skipped: ${summary.sectionsSkipped}`);
  console.log(`Passages inserted: ${summary.passagesInserted}`);
  console.log(`Errors: ${summary.errors}`);

  if (summary.errors > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("IMPORT FAILED:");
  console.error(error.response?.data || error);
  process.exitCode = 1;
});
