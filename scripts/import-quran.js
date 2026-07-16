require("dotenv").config({ path: ".env.local" });

const { createClient } = require("@supabase/supabase-js");
const axios = require("axios");

const SOURCE_URL = "https://www.gutenberg.org/cache/epub/3434/pg3434.txt";
const EXPECTED_SURAHS = 114;
const MIN_EXPECTED_ROWS = 2500;
const MAX_EXPECTED_ROWS = 9000;
const BOOK_METADATA = {
  title: "Quran",
  description:
    "The central sacred text of Islam, translated into English by J. M. Rodwell.",
  religion: "Islam",
  tradition: "Islamic",
  language: "English",
  translator: "J. M. Rodwell",
  license: "Public domain in the USA",
  public_domain: true,
  source_url: "https://www.gutenberg.org/ebooks/3434",
  text_type: "quran_translation",
};

const REQUIRED_BOOK_COLUMNS = ["title", "description", "content"];
const REQUIRED_CHAPTER_COLUMNS = ["book_id", "title", "chapter_number"];
const REQUIRED_VERSE_COLUMNS = ["chapter_id", "verse_number", "content"];

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required for the Quran import script.`);
  }

  return value;
}

const parseOnly = process.env.QURAN_PARSE_ONLY === "1";
const debug = process.env.QURAN_DEBUG === "1";
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

function romanToNumber(value) {
  const numerals = {
    I: 1,
    V: 5,
    X: 10,
    L: 50,
    C: 100,
    D: 500,
    M: 1000,
  };
  let total = 0;
  let previous = 0;

  for (const character of value.toUpperCase().split("").reverse()) {
    const current = numerals[character];

    if (!current) {
      throw new Error(`Invalid Roman numeral in Quran heading: ${value}`);
    }

    if (current < previous) {
      total -= current;
    } else {
      total += current;
      previous = current;
    }
  }

  return total;
}

function cleanText(value) {
  return value
    .replace(/^\uFEFF/, "")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanTitle(value) {
  return cleanText(value)
    .replace(/\d+$/g, "")
    .replace(/^[.-]+|[.-]+$/g, "")
    .trim();
}

function parseSuraHeading(line) {
  const match = cleanText(line).match(
    /^SURA\d*\s*[^A-Z0-9]*\s*([IVXLCDM]+)\.?\d*\s*(?:[.-]\s*)?(.*?)\s*\[([IVXLCDM]+)\.\]$/i
  );

  if (!match) return null;

  const originalSuraNumber = romanToNumber(match[1]);
  const orderNumber = romanToNumber(match[3]);
  const title = cleanTitle(match[2]) || `Sura ${originalSuraNumber}`;

  return {
    originalSuraNumber,
    orderNumber,
    title,
    displayTitle: `Surah ${originalSuraNumber} - ${title}`,
  };
}

function isFootnoteDivider(line) {
  return /^_{5,}$/.test(line.trim());
}

function isMetadataLine(line) {
  return /^(MECCA|MEDINA)\.-\d+\s+Verses?/i.test(line);
}

function isSkippableBodyLine(line) {
  if (!line) return true;
  if (/^\d+\s+The word Sura occurs/i.test(line)) return true;
  if (/^For the understanding/i.test(line)) return true;
  if (/^In the Name of God/i.test(line)) return true;

  return false;
}

function endsTextUnit(line) {
  return /[.!?;:,]["']?-?$/.test(line);
}

function groupTextRows(rows) {
  const grouped = [];
  let pending = "";

  function flush() {
    const content = cleanText(pending);
    if (content) {
      grouped.push({
        number: grouped.length + 1,
        content,
      });
    }
    pending = "";
  }

  for (const row of rows) {
    const content = cleanText(row.content);
    if (!content) continue;

    pending = pending ? `${pending} ${content}` : content;

    if (endsTextUnit(content) || pending.length > 480) {
      flush();
    }
  }

  flush();

  return grouped;
}

function parseQuran(text) {
  const lines = text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => cleanText(line))
    .filter(Boolean);
  const surahs = [];
  let currentSurah = null;
  let ignoringNotes = false;

  function finishSurah() {
    if (!currentSurah) return;

    currentSurah.verses = groupTextRows(currentSurah.verses);
    surahs.push(currentSurah);
    currentSurah = null;
  }

  for (const line of lines) {
    if (/^\*\*\*\s*END OF/i.test(line)) {
      finishSurah();
      break;
    }
    if (/^End of (the )?Project Gutenberg/i.test(line)) {
      finishSurah();
      break;
    }
    if (/^PROJECT GUTENBERG/i.test(line)) {
      finishSurah();
      break;
    }
    if (/^INDEX\.$/i.test(line)) {
      finishSurah();
      break;
    }

    const heading = parseSuraHeading(line);
    if (heading) {
      finishSurah();

      const expectedOrderNumber = surahs.length + 1;

      if (
        heading.orderNumber !== expectedOrderNumber &&
        heading.orderNumber > surahs.length
      ) {
        throw new Error(
          `Unexpected Quran surah sequence: found [${heading.orderNumber}], expected [${expectedOrderNumber}].`
        );
      }

      if (heading.orderNumber !== expectedOrderNumber) {
        console.warn(
          `Warning: source heading order [${heading.orderNumber}] was adjusted to parsed order [${expectedOrderNumber}] for ${heading.displayTitle}.`
        );
      }

      currentSurah = {
        number: heading.originalSuraNumber,
        importOrder: expectedOrderNumber,
        displayTitle: heading.displayTitle,
        verses: [],
      };
      ignoringNotes = false;
      continue;
    }

    if (!currentSurah) continue;

    if (isFootnoteDivider(line)) {
      ignoringNotes = true;
      continue;
    }

    if (ignoringNotes) continue;
    if (isMetadataLine(line)) continue;
    if (isSkippableBodyLine(line)) continue;

    currentSurah.verses.push({
      number: currentSurah.verses.length + 1,
      content: line,
    });
  }

  validateParsedSurahs(surahs);

  return surahs;
}

function printParseSummary(surahs) {
  const verseCount = surahs.reduce(
    (total, surah) => total + surah.verses.length,
    0
  );

  console.log(`Parsed surah count: ${surahs.length}`);
  console.log(`Parsed ayah/text row count: ${verseCount}`);

  if (!debug) return;

  for (const surah of surahs) {
    console.log(
      `Import order ${surah.importOrder}: canonical surah ${surah.number}: ${surah.displayTitle} (${surah.verses.length} ayah/text rows)`
    );
  }
}

function validateParsedSurahs(surahs) {
  const verseCount = surahs.reduce(
    (total, surah) => total + surah.verses.length,
    0
  );

  if (surahs.length !== EXPECTED_SURAHS) {
    throw new Error(
      `Expected ${EXPECTED_SURAHS} Quran surahs, parsed ${surahs.length}.`
    );
  }

  if (verseCount < MIN_EXPECTED_ROWS) {
    throw new Error(
      `Parsed only ${verseCount} Quran ayah/text rows; expected at least ${MIN_EXPECTED_ROWS}.`
    );
  }

  if (verseCount > MAX_EXPECTED_ROWS) {
    throw new Error(
      `Parsed ${verseCount} Quran ayah/text rows; expected no more than ${MAX_EXPECTED_ROWS}. Parser may be too broad.`
    );
  }

  const surahNumberSet = new Set();
  for (const surah of surahs) {
    if (surahNumberSet.has(surah.number)) {
      throw new Error(`Duplicate canonical Quran surah ${surah.number}.`);
    }

    surahNumberSet.add(surah.number);
  }

  for (let number = 1; number <= EXPECTED_SURAHS; number += 1) {
    if (!surahNumberSet.has(number)) {
      throw new Error(`Missing canonical Quran surah ${number}.`);
    }
  }

  for (const surah of surahs) {
    if (!surah.verses.length) {
      throw new Error(`Parsed surah ${surah.number} with no text rows.`);
    }
  }

  if (verseCount < 3500 || verseCount > 7000) {
    console.warn(
      `Warning: parsed ${verseCount} Quran ayah/text rows. This should be reviewed before import.`
    );
  }

  console.log("Validated canonical Quran surah numbers 1 through 114 exactly once.");
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
    verse_label: "Ayah",
    sort_order: index + 1,
    content: verse.content,
  }));
}

async function importChapter(bookId, parsedSurah) {
  const existingChapter = await findExistingChapter(bookId, parsedSurah.number);

  if (existingChapter) {
    const verseCount = await countChapterVerses(existingChapter.id);

    if (verseCount > 0) {
      return {
        skipped: true,
        versesInserted: 0,
      };
    }

    const verses = buildVerses(existingChapter.id, parsedSurah.verses);
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
      title: BOOK_METADATA.title,
      chapter_number: parsedSurah.number,
      section_label: "Surah",
      display_title: parsedSurah.displayTitle,
      sort_order: parsedSurah.number,
    },
    REQUIRED_CHAPTER_COLUMNS
  );

  const verses = buildVerses(chapter.id, parsedSurah.verses);
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
    chaptersInserted: 0,
    chaptersSkipped: 0,
    versesInserted: 0,
    errors: 0,
  };

  console.log(
    parseOnly
      ? "Starting Quran parse-only validation..."
      : "Starting Quran import..."
  );
  console.log(`Downloading source: ${SOURCE_URL}`);

  const { data: text } = await axios.get(SOURCE_URL, {
    responseType: "text",
    timeout: 30000,
    headers: {
      "User-Agent": "RELIGIOUS/1.1 Quran importer",
    },
  });
  const parsedSurahs = parseQuran(text);
  printParseSummary(parsedSurahs);

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

  for (const parsedSurah of parsedSurahs) {
    try {
      const result = await importChapter(book.id, parsedSurah);
      summary.versesInserted += result.versesInserted;

      if (result.skipped) {
        summary.chaptersSkipped += 1;
      console.log(`Skipped surah ${parsedSurah.number}`);
    } else {
      summary.chaptersInserted += 1;
      console.log(`Inserted surah ${parsedSurah.number}`);
      }
    } catch (error) {
      summary.errors += 1;
      console.error(`Surah ${parsedSurah.number} failed:`);
      console.error(error);
    }
  }

  console.log("DONE! Quran import completed.");
  console.log("Import summary:");
  console.log(`Book created: ${summary.bookCreated ? "yes" : "no"}`);
  console.log(`Book reused: ${summary.bookReused ? "yes" : "no"}`);
  console.log(`Chapters inserted: ${summary.chaptersInserted}`);
  console.log(`Chapters skipped: ${summary.chaptersSkipped}`);
  console.log(`Verses inserted: ${summary.versesInserted}`);
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
