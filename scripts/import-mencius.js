require("dotenv").config({ path: ".env.local" });

const { createClient } = require("@supabase/supabase-js");
const axios = require("axios");

const SOURCE_URL =
  "https://en.wikisource.org/wiki/The_Chinese_Classics/Volume_2/The_Works_of_Mencius";
const RAW_PAGE_BASE =
  "https://en.wikisource.org/w/index.php?title=The_Chinese_Classics/Volume_2/The_Works_of_Mencius";
const EXPECTED_SECTIONS = [
  "Liang Hui Wang I",
  "Liang Hui Wang II",
  "Gong Sun Chou I",
  "Gong Sun Chou II",
  "Teng Wen Gong I",
  "Teng Wen Gong II",
  "Li Lou I",
  "Li Lou II",
  "Wan Zhang I",
  "Wan Zhang II",
  "Gaozi I",
  "Gaozi II",
  "Jin Xin I",
  "Jin Xin II",
];
const MIN_EXPECTED_PASSAGES = 500;
const MAX_EXPECTED_PASSAGES = 800;
const BOOK_METADATA = {
  title: "The Works of Mencius: Legge Translation",
  description:
    "A foundational Confucian text containing the teachings and dialogues of Mencius, translated into English by James Legge.",
  religion: "Confucianism",
  tradition: "Confucian / Four Books",
  language: "English",
  translator: "James Legge",
  license: "Public domain in the USA",
  public_domain: true,
  source_url: SOURCE_URL,
  text_type: "confucian_classic",
};

const REQUIRED_BOOK_COLUMNS = ["title", "description", "content"];
const REQUIRED_CHAPTER_COLUMNS = ["book_id", "title", "chapter_number"];
const REQUIRED_VERSE_COLUMNS = ["chapter_id", "verse_number", "content"];

const parseOnly = process.env.MENCIUS_PARSE_ONLY === "1";
const debug = process.env.MENCIUS_DEBUG === "1";
let supabase = null;

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required for the Mencius import script.`);
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

function cleanText(value) {
  return value
    .replace(/^\uFEFF/, "")
    .replace(/&nbsp;/g, " ")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function pageUrl(sectionNumber) {
  const chapter = String(sectionNumber).padStart(2, "0");

  return `${RAW_PAGE_BASE}/chapter${chapter}&action=raw`;
}

function stripWikisourceMarkup(wikitext) {
  return wikitext
    .replace(/\r/g, "")
    .replace(/{{header[\s\S]*?}}\s*/i, "")
    .replace(/{{lang\|zh\|[\s\S]*?}}\s*/g, "")
    .replace(/<ref[\s\S]*?<\/ref>/gi, "")
    .replace(/<ref[^/]*\/>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/{{[^{}]*}}/g, "")
    .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/'{2,}/g, "")
    .replace(/__NOTOC__/g, "")
    .trim();
}

function parseSectionWikitext(wikitext, sectionNumber, expectedTitle) {
  const cleaned = stripWikisourceMarkup(wikitext);
  const paragraphs = cleaned
    .split(/\n\s*\n/g)
    .map(cleanText)
    .filter(Boolean)
    .filter((paragraph) => paragraph !== expectedTitle)
    .filter((paragraph) => !/^category:/i.test(paragraph));

  return {
    number: sectionNumber,
    displayTitle: expectedTitle,
    verses: paragraphs.map((content, index) => ({
      number: index + 1,
      content,
    })),
  };
}

function hasHanCharacters(value) {
  return /[\u3400-\u9FFF\uF900-\uFAFF]/.test(value);
}

function validateParsedSections(sections) {
  const passageCount = sections.reduce(
    (total, section) => total + section.verses.length,
    0
  );

  if (sections.length !== EXPECTED_SECTIONS.length) {
    throw new Error(
      `Expected ${EXPECTED_SECTIONS.length} Mencius sections, parsed ${sections.length}.`
    );
  }

  const numberSet = new Set(sections.map((section) => section.number));
  for (let number = 1; number <= EXPECTED_SECTIONS.length; number += 1) {
    if (!numberSet.has(number)) {
      throw new Error(`Missing Mencius section ${number}.`);
    }
  }

  if (numberSet.size !== EXPECTED_SECTIONS.length) {
    throw new Error("Duplicate Mencius section number detected.");
  }

  for (const section of sections) {
    const expectedTitle = EXPECTED_SECTIONS[section.number - 1];

    if (section.displayTitle !== expectedTitle) {
      throw new Error(
        `Unexpected Mencius section title for ${section.number}: ${section.displayTitle}.`
      );
    }

    if (!section.verses.length) {
      throw new Error(`Parsed ${section.displayTitle} with no passages.`);
    }
  }

  if (passageCount < MIN_EXPECTED_PASSAGES) {
    throw new Error(
      `Parsed only ${passageCount} Mencius passages; expected at least ${MIN_EXPECTED_PASSAGES}.`
    );
  }

  if (passageCount > MAX_EXPECTED_PASSAGES) {
    throw new Error(
      `Parsed ${passageCount} Mencius passages; expected no more than ${MAX_EXPECTED_PASSAGES}. Parser may be too broad.`
    );
  }

  const forbidden = /Wikisource|Creative Commons|Privacy policy|Disclaimers|Navigation|Retrieved from|Sacred Texts|Project Gutenberg/i;
  for (const section of sections) {
    for (const passage of section.verses) {
      if (hasHanCharacters(passage.content)) {
        throw new Error(
          `Detected Chinese original text in ${section.displayTitle}, passage ${passage.number}.`
        );
      }

      if (forbidden.test(passage.content)) {
        throw new Error(
          `Detected navigation/license text in ${section.displayTitle}, passage ${passage.number}.`
        );
      }
    }
  }

  if (passageCount < 600 || passageCount > 730) {
    console.warn(
      `Warning: parsed ${passageCount} Mencius passage rows. Review before real import.`
    );
  }
}

function printParseSummary(sections) {
  const passageCount = sections.reduce(
    (total, section) => total + section.verses.length,
    0
  );

  console.log(`Parsed section count: ${sections.length}`);
  console.log(`Parsed passage row count: ${passageCount}`);
  console.log("Selected section titles:");
  for (const section of sections.slice(0, 5)) {
    console.log(`- ${section.displayTitle}`);
  }

  if (!debug) return;

  for (const section of sections) {
    console.log(
      `Book ${section.number}: ${section.displayTitle} (${section.verses.length} passages)`
    );
  }
}

async function fetchMenciusSections() {
  const sections = [];

  for (let index = 0; index < EXPECTED_SECTIONS.length; index += 1) {
    const sectionNumber = index + 1;
    const title = EXPECTED_SECTIONS[index];
    const url = pageUrl(sectionNumber);

    console.log(`Fetching ${title}...`);

    const { data } = await axios.get(url, {
      responseType: "text",
      timeout: 30000,
      headers: {
        "User-Agent": "RELIGIOUS/1.1 Mencius importer",
      },
    });

    const section = parseSectionWikitext(data, sectionNumber, title);
    console.log(`Fetched ${section.verses.length} passages for ${title}`);
    sections.push(section);
  }

  validateParsedSections(sections);

  return sections;
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

async function findExistingChapter(bookId, chapterNumber) {
  if (!supabase) {
    throw new Error("Supabase client is unavailable in parse-only mode.");
  }

  const { data, error } = await supabase
    .from("chapters")
    .select("id")
    .eq("book_id", bookId)
    .eq("chapter_number", chapterNumber)
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
      title: "The Works of Mencius",
      chapter_number: section.number,
      section_label: "Book",
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
      ? "Starting Mencius parse-only validation..."
      : "Starting Mencius import..."
  );
  console.log(`Source of truth: ${SOURCE_URL}`);

  const sections = await fetchMenciusSections();
  printParseSummary(sections);

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

  for (const section of sections) {
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

  console.log("DONE! Mencius import completed.");
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
