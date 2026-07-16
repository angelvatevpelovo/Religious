require("dotenv").config({ path: ".env.local" });

const { createClient } = require("@supabase/supabase-js");
const axios = require("axios");

const INDEX_URL = "https://en.wikisource.org/wiki/Kojiki_(Chamberlain,_1882)";
const EXPECTED_SELECTED_SECTIONS = 19;
const MIN_EXPECTED_PASSAGES = 20;
const MAX_EXPECTED_PASSAGES = 180;
const BOOK_METADATA = {
  title: "Kojiki: Divine Age Selections",
  description:
    "Selected early mythological sections from the Kojiki, the Records of Ancient Matters, translated into English by Basil Hall Chamberlain.",
  religion: "Shinto",
  tradition: "Japanese sacred tradition / Kojiki",
  language: "English",
  translator: "Basil Hall Chamberlain",
  license: "Public domain in the USA",
  public_domain: true,
  source_url: INDEX_URL,
  text_type: "shinto_selection",
};

const REQUIRED_BOOK_COLUMNS = ["title", "description", "content"];
const REQUIRED_CHAPTER_COLUMNS = ["book_id", "title", "chapter_number"];
const REQUIRED_VERSE_COLUMNS = ["chapter_id", "verse_number", "content"];

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required for the Kojiki import script.`);
  }

  return value;
}

const parseOnly = process.env.KOJIKI_PARSE_ONLY === "1";
const debug = process.env.KOJIKI_DEBUG === "1";
let supabase = null;

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

function decodeHtmlEntities(value) {
  const namedEntities = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
    mdash: "-",
    ndash: "-",
    rsquo: "'",
    lsquo: "'",
    rdquo: '"',
    ldquo: '"',
  };

  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCharCode(Number.parseInt(code, 16))
    )
    .replace(/&([a-z]+);/gi, (match, name) => namedEntities[name] ?? match);
}

function cleanText(value) {
  return decodeHtmlEntities(value)
    .replace(/^\uFEFF/, "")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/\u00a0/g, " ")
    .replace(/\u200b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function htmlToText(html) {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<sup[\s\S]*?<\/sup>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|h1|h2|h3|h4|li|table|tr)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function downloadText(url) {
  const { data } = await axios.get(url, {
    responseType: "text",
    timeout: 30000,
    headers: {
      "User-Agent": "RELIGIOUS/1.1 Kojiki Divine Age importer",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  return data;
}

function parseIndexLinks(html) {
  const linkPattern = /href=["'](\/wiki\/Kojiki_\(Chamberlain,_1882\)\/Section_(\d+))["'][^>]*>([^<]+)<\/a>/gi;
  const linksByNumber = new Map();
  let match;

  while ((match = linkPattern.exec(html)) !== null) {
    const originalNumber = Number(match[2]);
    if (!Number.isInteger(originalNumber)) continue;
    if (originalNumber < 1 || originalNumber > EXPECTED_SELECTED_SECTIONS) continue;

    linksByNumber.set(originalNumber, {
      originalNumber,
      number: originalNumber,
      title: cleanText(match[3]),
      url: `https://en.wikisource.org${match[1]}`,
    });
  }

  const links = [...linksByNumber.values()].sort(
    (first, second) => first.originalNumber - second.originalNumber
  );

  if (links.length !== EXPECTED_SELECTED_SECTIONS) {
    throw new Error(
      `Expected ${EXPECTED_SELECTED_SECTIONS} selected Kojiki section links, found ${links.length}.`
    );
  }

  return links;
}

function stripInlineNoise(value) {
  return cleanText(
    value
      .replace(/\[\s*\d+\s*\]/g, "")
      .replace(/\^\s*/g, "")
      .replace(/Retrieved from .*/i, "")
  );
}

function extractSectionLines(html, sectionTitle) {
  let contentHtml = html;
  const contentStart = contentHtml.indexOf('<div class="prp-pages-output"');
  if (contentStart !== -1) {
    contentHtml = contentHtml.slice(contentStart);
  }

  const referencesStart = contentHtml.search(/<div[^>]+class=["'][^"']*\breflist\b/i);
  if (referencesStart !== -1) {
    contentHtml = contentHtml.slice(0, referencesStart);
  }

  const footerStart = contentHtml.indexOf('<div class="printfooter"');
  if (footerStart !== -1) {
    contentHtml = contentHtml.slice(0, footerStart);
  }

  const text = htmlToText(contentHtml);
  const lines = text
    .split("\n")
    .map((line) => stripInlineNoise(line))
    .filter(Boolean);
  const titleIndex = lines.findIndex((line) =>
    /^\[\s*Sect\.\s+[IVXLCDM]+\.?\s*[.\-—–]/.test(line)
  );

  if (titleIndex === -1) {
    throw new Error(`Could not find Kojiki section heading for ${sectionTitle}.`);
  }

  let stopIndex = lines.findIndex((line, index) =>
    index > titleIndex && /^\* \* \*$/.test(line)
  );

  if (stopIndex === -1) {
    stopIndex = lines.findIndex((line, index) =>
      index > titleIndex && /Retrieved from|This page was last edited|Text is available under/i.test(line)
    );
  }

  const bodyLines = lines.slice(titleIndex + 1, stopIndex === -1 ? lines.length : stopIndex);

  return bodyLines
    .filter((line) => !/^RECORDS OF ANCIENT MATTERS\.?$/i.test(line))
    .filter((line) => !/^Kojiki \(1882\)$/i.test(line))
    .filter((line) => !/^by\s+/i.test(line))
    .filter((line) => !/^←|^→/.test(line))
    .filter((line) => !/^Section \d+$/i.test(line))
    .filter((line) => !/^Preface$|^Translator/i.test(line));
}

function buildPassages(lines) {
  const passages = [];

  for (const line of lines) {
    const content = stripInlineNoise(line);
    if (!content) continue;
    if (content.length < 2) continue;

    passages.push({
      number: passages.length + 1,
      content,
    });
  }

  return passages;
}

async function parseSection(link) {
  const html = await downloadText(link.url);
  const lines = extractSectionLines(html, link.title);
  const passages = buildPassages(lines);

  return {
    number: link.number,
    originalNumber: link.originalNumber,
    displayTitle: link.title,
    url: link.url,
    verses: passages,
  };
}

async function parseKojikiDivineAge() {
  console.log(`Downloading Wikisource Kojiki index: ${INDEX_URL}`);
  const indexHtml = await downloadText(INDEX_URL);
  const links = parseIndexLinks(indexHtml);
  const sections = [];

  console.log("Selected Kojiki sections:");
  for (const link of links) {
    console.log(`- Section ${link.originalNumber}: ${link.title}`);
  }

  for (const link of links) {
    console.log(`Parsing Section ${link.originalNumber}: ${link.title}`);
    sections.push(await parseSection(link));
  }

  validateParsedSections(sections);

  return sections;
}

function printParseSummary(sections) {
  const passageCount = sections.reduce(
    (total, section) => total + section.verses.length,
    0
  );

  console.log(`Parsed selected section count: ${sections.length}`);
  console.log(`Parsed passage row count: ${passageCount}`);

  if (!debug) return;

  for (const section of sections) {
    console.log(
      `Section ${section.number}: ${section.displayTitle} (${section.verses.length} passages)`
    );
  }
}

function validateParsedSections(sections) {
  const passageCount = sections.reduce(
    (total, section) => total + section.verses.length,
    0
  );

  if (sections.length !== EXPECTED_SELECTED_SECTIONS) {
    throw new Error(
      `Expected ${EXPECTED_SELECTED_SECTIONS} selected Kojiki sections, parsed ${sections.length}.`
    );
  }

  if (sections.length >= 100) {
    throw new Error("Parser appears to have captured too much of the Kojiki.");
  }

  const sectionNumberSet = new Set(sections.map((section) => section.number));
  for (let number = 1; number <= EXPECTED_SELECTED_SECTIONS; number += 1) {
    if (!sectionNumberSet.has(number)) {
      throw new Error(`Missing selected Kojiki section ${number}.`);
    }
  }

  if (sectionNumberSet.size !== EXPECTED_SELECTED_SECTIONS) {
    throw new Error("Duplicate selected Kojiki section number detected.");
  }

  for (const section of sections) {
    if (!section.verses.length) {
      throw new Error(`Parsed ${section.displayTitle} with no passages.`);
    }
  }

  if (passageCount < MIN_EXPECTED_PASSAGES) {
    throw new Error(
      `Parsed only ${passageCount} Kojiki passages; expected at least ${MIN_EXPECTED_PASSAGES}.`
    );
  }

  if (passageCount > MAX_EXPECTED_PASSAGES) {
    throw new Error(
      `Parsed ${passageCount} Kojiki passages; expected no more than ${MAX_EXPECTED_PASSAGES}. Parser may be too broad.`
    );
  }

  const forbidden = /Translator.?s Introduction|Preface|Appendix|Wikisource|Retrieved from|This page was last edited|Creative Commons|Privacy Policy|Search|Main menu|Navigation|Add languages|Download EPUB/i;
  for (const section of sections) {
    for (const passage of section.verses) {
      if (forbidden.test(passage.content)) {
        throw new Error(
          `Detected navigation/intro/footer text in ${section.displayTitle}, passage ${passage.number}.`
        );
      }
    }
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

  console.warn(`Warning: ${table} metadata columns are missing. Inserted required columns only.`);

  return fallbackData;
}

async function insertManyWithFallback(table, rows, requiredColumns, size = 500) {
  for (let index = 0; index < rows.length; index += size) {
    const chunk = rows.slice(index, index + size);
    const { error } = await supabase.from(table).insert(chunk);

    if (!error) continue;
    if (!isMissingColumnError(error)) throw error;

    const fallbackChunk = chunk.map((row) => keepKeys(row, requiredColumns));
    const { error: fallbackError } = await supabase.from(table).insert(fallbackChunk);

    if (fallbackError) throw fallbackError;

    console.warn(`Warning: ${table} metadata columns are missing. Inserted required columns only.`);
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
    return { book: existingBook, created: false };
  }

  const book = await insertSingleWithFallback(
    "holy_books",
    { ...BOOK_METADATA, content: null },
    REQUIRED_BOOK_COLUMNS
  );

  return { book, created: true };
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

async function importSection(bookId, parsedSection) {
  const existingChapter = await findExistingChapter(bookId, parsedSection.number);

  if (existingChapter) {
    const verseCount = await countChapterVerses(existingChapter.id);

    if (verseCount > 0) {
      return { skipped: true, versesInserted: 0 };
    }

    const verses = buildVerses(existingChapter.id, parsedSection.verses);
    await insertManyWithFallback("verses", verses, REQUIRED_VERSE_COLUMNS);

    return { skipped: true, versesInserted: verses.length };
  }

  const chapter = await insertSingleWithFallback(
    "chapters",
    {
      book_id: bookId,
      title: "Kojiki",
      chapter_number: parsedSection.number,
      section_label: "Section",
      display_title: parsedSection.displayTitle,
      sort_order: parsedSection.number,
    },
    REQUIRED_CHAPTER_COLUMNS
  );

  const verses = buildVerses(chapter.id, parsedSection.verses);
  await insertManyWithFallback("verses", verses, REQUIRED_VERSE_COLUMNS);

  return { skipped: false, versesInserted: verses.length };
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

  console.log(parseOnly ? "Starting Kojiki Divine Age parse-only validation..." : "Starting Kojiki Divine Age import...");

  const parsedSections = await parseKojikiDivineAge();
  printParseSummary(parsedSections);

  if (parseOnly) {
    console.log("Parse-only mode enabled. No Supabase connection or import was attempted.");
    return;
  }

  const { book, created } = await getOrCreateBook();
  summary.bookCreated = created;
  summary.bookReused = !created;

  console.log(`${created ? "Created" : "Reused"} holy_books record: ${book.title} (${book.id})`);

  for (const parsedSection of parsedSections) {
    try {
      const result = await importSection(book.id, parsedSection);
      summary.passagesInserted += result.versesInserted;

      if (result.skipped) {
        summary.sectionsSkipped += 1;
        console.log(`Skipped ${parsedSection.displayTitle}`);
      } else {
        summary.sectionsInserted += 1;
        console.log(`Inserted ${parsedSection.displayTitle}`);
      }
    } catch (error) {
      summary.errors += 1;
      console.error(`${parsedSection.displayTitle} failed:`);
      console.error(error);
    }
  }

  console.log("DONE! Kojiki Divine Age import completed.");
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
