require("dotenv").config({ path: ".env.local" });

const { createClient } = require("@supabase/supabase-js");
const axios = require("axios");

const SOURCE_URL = "https://www.gutenberg.org/files/2017/2017-h/2017-h.htm";
const EXPECTED_CHAPTERS = 26;
const EXPECTED_VERSES = 423;
const EXPECTED_ROMAN_CHAPTERS = [
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
  "XI",
  "XII",
  "XIII",
  "XIV",
  "XV",
  "XVI",
  "XVII",
  "XVIII",
  "XIX",
  "XX",
  "XXI",
  "XXII",
  "XXIII",
  "XXIV",
  "XXV",
  "XXVI",
];
const BOOK_METADATA = {
  title: "Dhammapada",
  description:
    "A revered Buddhist collection of verses from the Pali canon, translated into English by F. Max Muller.",
  religion: "Buddhism",
  tradition: "Theravada Buddhist / Pali Canon",
  language: "English",
  translator: "F. Max Muller",
  license: "Public domain in the USA",
  public_domain: true,
  source_url: "https://www.gutenberg.org/ebooks/2017",
  text_type: "verse_collection",
};

const REQUIRED_BOOK_COLUMNS = ["title", "description", "content"];
const REQUIRED_CHAPTER_COLUMNS = ["book_id", "title", "chapter_number"];
const REQUIRED_VERSE_COLUMNS = ["chapter_id", "verse_number", "content"];

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required for the Dhammapada import script.`);
  }

  return value;
}

const parseOnly = process.env.DHAMMAPADA_PARSE_ONLY === "1";
const debug = process.env.DHAMMAPADA_DEBUG === "1";
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

function htmlToText(html) {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|h1|h2|h3|h4|pre|li)>/gi, "\n")
      .replace(/<[^>]+>/g, "")
  )
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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
      throw new Error(`Invalid Roman numeral in Dhammapada chapter: ${value}`);
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

function findMainTextStart(lines) {
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index] !== "DHAMMAPADA") continue;

    const next = lines[index + 1] ?? "";
    const nearby = lines.slice(index + 2, index + 6);

    if (
      /^Chapter\s+I\.\s+The Twin-Verses$/.test(next) &&
      nearby.some((line) => /^1\.\s+/.test(line))
    ) {
      return index + 1;
    }
  }

  throw new Error("Could not find the start of the Dhammapada text.");
}

function cleanText(value) {
  return value.replace(/\s+/g, " ").trim();
}

function parseVerseNumbers(value) {
  return value
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((number) => Number.isInteger(number) && number > 0);
}

function parseDhammapada(html) {
  const lines = htmlToText(html)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const startIndex = findMainTextStart(lines);
  const chapters = [];
  let currentChapter = null;
  let pendingVerse = null;
  let expectedChapterIndex = 0;

  function finishVerse() {
    if (!pendingVerse || !currentChapter) return;

    const content = cleanText(pendingVerse.content);
    if (!content) return;

    for (const number of pendingVerse.numbers) {
      currentChapter.verses.push({
        number,
        content,
      });
    }

    pendingVerse = null;
  }

  function finishChapter() {
    finishVerse();

    if (currentChapter) {
      chapters.push(currentChapter);
      currentChapter = null;
    }
  }

  for (const rawLine of lines.slice(startIndex)) {
    if (/^\*\*\*\s*END OF/i.test(rawLine)) break;
    if (/^End of (the )?Project Gutenberg/i.test(rawLine)) break;
    if (/^PROJECT GUTENBERG/i.test(rawLine)) break;

    const chapterMatch = rawLine.match(/^Chapter\s+([IVXLCDM]+)\.\s+(.+)$/i);
    if (chapterMatch) {
      const romanChapter = chapterMatch[1].toUpperCase();
      const expectedRomanChapter = EXPECTED_ROMAN_CHAPTERS[expectedChapterIndex];

      if (romanChapter !== expectedRomanChapter) {
        throw new Error(
          `Unexpected Dhammapada chapter sequence: found ${romanChapter}, expected ${expectedRomanChapter}.`
        );
      }

      finishChapter();

      const chapterNumber = romanToNumber(romanChapter);
      currentChapter = {
        number: chapterNumber,
        displayTitle: `Chapter ${romanChapter}. ${cleanText(
          chapterMatch[2]
        )}`,
        verses: [],
      };
      expectedChapterIndex += 1;
      continue;
    }

    if (!currentChapter) continue;

    const verseMatch = rawLine.match(/^(\d+(?:,\s*\d+)*)\.\s+(.+)$/);
    if (verseMatch) {
      finishVerse();

      pendingVerse = {
        numbers: parseVerseNumbers(verseMatch[1]),
        content: verseMatch[2],
      };
      continue;
    }

    if (pendingVerse) {
      pendingVerse.content = `${pendingVerse.content} ${rawLine}`;
    }
  }

  finishChapter();

  validateParsedChapters(chapters);

  return chapters;
}

function printParseSummary(chapters) {
  const verseCount = chapters.reduce(
    (total, chapter) => total + chapter.verses.length,
    0
  );

  console.log(`Parsed chapter count: ${chapters.length}`);
  console.log(`Parsed verse count: ${verseCount}`);

  if (!debug) return;

  for (const chapter of chapters) {
    console.log(
      `Chapter ${chapter.number}: ${chapter.displayTitle} (${chapter.verses.length} verses)`
    );
  }
}

function validateParsedChapters(chapters) {
  const verseCount = chapters.reduce(
    (total, chapter) => total + chapter.verses.length,
    0
  );

  if (chapters.length !== EXPECTED_CHAPTERS) {
    throw new Error(
      `Expected ${EXPECTED_CHAPTERS} Dhammapada chapters, parsed ${chapters.length}.`
    );
  }

  if (verseCount !== EXPECTED_VERSES) {
    throw new Error(
      `Expected ${EXPECTED_VERSES} Dhammapada verses, parsed ${verseCount}.`
    );
  }

  const chapterNumberSet = new Set(chapters.map((chapter) => chapter.number));
  for (let number = 1; number <= EXPECTED_CHAPTERS; number += 1) {
    if (!chapterNumberSet.has(number)) {
      throw new Error(`Missing Dhammapada chapter ${number}.`);
    }
  }

  const verseNumberSet = new Set();
  for (const chapter of chapters) {
    if (!chapter.verses.length) {
      throw new Error(`Parsed chapter ${chapter.number} with no verses.`);
    }

    for (const verse of chapter.verses) {
      if (verseNumberSet.has(verse.number)) {
        throw new Error(`Duplicate Dhammapada verse number ${verse.number}.`);
      }

      verseNumberSet.add(verse.number);
    }
  }

  for (let number = 1; number <= EXPECTED_VERSES; number += 1) {
    if (!verseNumberSet.has(number)) {
      throw new Error(`Missing Dhammapada verse ${number}.`);
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
    verse_number: verse.number,
    verse_label: "Verse",
    sort_order: index + 1,
    content: verse.content,
  }));
}

async function importChapter(bookId, parsedChapter) {
  const existingChapter = await findExistingChapter(bookId, parsedChapter.number);

  if (existingChapter) {
    const verseCount = await countChapterVerses(existingChapter.id);

    if (verseCount > 0) {
      return {
        skipped: true,
        versesInserted: 0,
      };
    }

    const verses = buildVerses(existingChapter.id, parsedChapter.verses);
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
      chapter_number: parsedChapter.number,
      section_label: "Chapter",
      display_title: parsedChapter.displayTitle,
      sort_order: parsedChapter.number,
    },
    REQUIRED_CHAPTER_COLUMNS
  );

  const verses = buildVerses(chapter.id, parsedChapter.verses);
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
      ? "Starting Dhammapada parse-only validation..."
      : "Starting Dhammapada import..."
  );
  console.log(`Downloading source: ${SOURCE_URL}`);

  const { data: html } = await axios.get(SOURCE_URL, {
    responseType: "text",
    timeout: 30000,
    headers: {
      "User-Agent": "RELIGIOUS/1.1 Dhammapada importer",
    },
  });
  const parsedChapters = parseDhammapada(html);
  printParseSummary(parsedChapters);

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

  for (const parsedChapter of parsedChapters) {
    try {
      const result = await importChapter(book.id, parsedChapter);
      summary.versesInserted += result.versesInserted;

      if (result.skipped) {
        summary.chaptersSkipped += 1;
        console.log(`Skipped chapter ${parsedChapter.number}`);
      } else {
        summary.chaptersInserted += 1;
        console.log(`Inserted chapter ${parsedChapter.number}`);
      }
    } catch (error) {
      summary.errors += 1;
      console.error(`Chapter ${parsedChapter.number} failed:`);
      console.error(error);
    }
  }

  console.log("DONE! Dhammapada import completed.");
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
