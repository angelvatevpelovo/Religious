require("dotenv").config({ path: ".env.local" });

const { createClient } = require("@supabase/supabase-js");
const axios = require("axios");

const SOURCE_URL = "https://www.gutenberg.org/files/2526/2526-h/2526-h.htm";
const BOOK_METADATA = {
  title: "The Yoga Sutras of Patanjali: Johnston Translation",
  description:
    "A foundational text of Yoga philosophy attributed to Patanjali, translated into English by Charles Johnston.",
  religion: "Hinduism",
  tradition: "Yoga philosophy / Patanjali Yoga",
  language: "English",
  translator: "Charles Johnston",
  license: "Public domain in the USA",
  public_domain: true,
  source_url: "https://www.gutenberg.org/ebooks/2526",
  text_type: "yoga_sutra",
};
const BOOKS = [
  { number: 1, roman: "I", expectedSutras: 51 },
  { number: 2, roman: "II", expectedSutras: 55 },
  { number: 3, roman: "III", expectedSutras: 55 },
  { number: 4, roman: "IV", expectedSutras: 34 },
];
const EXPECTED_TOTAL_SUTRAS = 195;

const REQUIRED_BOOK_COLUMNS = ["title", "description", "content"];
const REQUIRED_CHAPTER_COLUMNS = ["book_id", "title", "chapter_number"];
const REQUIRED_VERSE_COLUMNS = ["chapter_id", "verse_number", "content"];

const parseOnly = process.env.YOGA_SUTRAS_PARSE_ONLY === "1";
const debug = process.env.YOGA_SUTRAS_DEBUG === "1";
let supabase = null;

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required for the Yoga Sutras import script.`);
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

function decodeHtmlEntities(value) {
  const namedEntities = {
    amp: "&",
    apos: "'",
    gt: ">",
    ldquo: '"',
    lsquo: "'",
    lt: "<",
    mdash: "-",
    ndash: "-",
    nbsp: " ",
    quot: '"',
    rdquo: '"',
    rsquo: "'",
  };

  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCodePoint(Number.parseInt(code, 16))
    )
    .replace(/&([a-z]+);/gi, (match, name) => namedEntities[name] ?? match);
}

function cleanText(value) {
  return decodeHtmlEntities(value)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function romanToNumber(value) {
  const numerals = {
    I: 1,
    V: 5,
    X: 10,
  };
  let total = 0;
  let previous = 0;

  for (const character of value.toUpperCase().split("").reverse()) {
    const current = numerals[character];

    if (!current) {
      throw new Error(`Invalid Roman numeral in Yoga Sutras text: ${value}`);
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

function headingText(headingHtml) {
  return cleanText(headingHtml).toUpperCase();
}

function findBookRanges(html) {
  const headingPattern = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
  const headings = [...html.matchAll(headingPattern)].map((match) => ({
    index: match.index,
    end: match.index + match[0].length,
    text: headingText(match[1]),
  }));

  return BOOKS.map((book) => {
    const startHeading = headings.find(
      (heading) => heading.text === `BOOK ${book.roman}`
    );

    if (!startHeading) {
      throw new Error(`Could not find BOOK ${book.roman} heading.`);
    }

    const nextHeading = headings.find(
      (heading) =>
        heading.index > startHeading.index &&
        (heading.text.startsWith("INTRODUCTION TO BOOK") ||
          heading.text.startsWith("BOOK "))
    );

    const end = nextHeading ? nextHeading.index : html.length;

    if (end === -1 || end <= startHeading.end) {
      throw new Error(`Could not find end of BOOK ${book.roman}.`);
    }

    return {
      ...book,
      html: html.slice(startHeading.end, end),
    };
  });
}

function parseSutraBlock(blockHtml, bookRoman) {
  const text = cleanText(blockHtml);
  const match = text.match(/^(\d+)[.,]?\s+(.+)$/);

  if (!match) {
    throw new Error(`Could not parse sutra number in Book ${bookRoman}: ${text}`);
  }

  return {
    number: Number(match[1]),
    content: match[2].trim(),
  };
}

function parseYogaSutras(html) {
  const bodyStart = html.search(/\*\*\*\s*START OF THE PROJECT GUTENBERG EBOOK/i);
  const bodyEnd = html.search(/\*\*\*\s*END OF THE PROJECT GUTENBERG EBOOK/i);

  if (bodyStart === -1 || bodyEnd === -1 || bodyEnd <= bodyStart) {
    throw new Error("Could not identify Gutenberg body boundaries.");
  }

  const body = html.slice(bodyStart, bodyEnd);
  const ranges = findBookRanges(body);
  const chapters = ranges.map((range) => {
    const p1Blocks = [...range.html.matchAll(/<p class="p1">([\s\S]*?)<\/p>/gi)];
    const sutras = p1Blocks.map((match) => parseSutraBlock(match[1], range.roman));

    return {
      number: range.number,
      displayTitle: `Book ${range.roman}`,
      verses: sutras,
      expectedSutras: range.expectedSutras,
    };
  });

  validateParsedChapters(chapters);

  return chapters;
}

function validateParsedChapters(chapters) {
  const total = chapters.reduce(
    (sum, chapter) => sum + chapter.verses.length,
    0
  );

  if (chapters.length !== BOOKS.length) {
    throw new Error(`Expected ${BOOKS.length} Yoga Sutras books, parsed ${chapters.length}.`);
  }

  if (total !== EXPECTED_TOTAL_SUTRAS) {
    throw new Error(
      `Expected ${EXPECTED_TOTAL_SUTRAS} total Yoga Sutras, parsed ${total}.`
    );
  }

  const forbidden = /Project Gutenberg|START OF THE PROJECT|END OF THE PROJECT|INTRODUCTION TO BOOK|Contents|license|commentary/i;

  for (const chapter of chapters) {
    const expected = BOOKS[chapter.number - 1];

    if (!expected || chapter.displayTitle !== `Book ${expected.roman}`) {
      throw new Error(`Unexpected Yoga Sutras book sequence at ${chapter.displayTitle}.`);
    }

    if (chapter.verses.length !== expected.expectedSutras) {
      throw new Error(
        `Expected ${expected.expectedSutras} sutras in ${chapter.displayTitle}, parsed ${chapter.verses.length}.`
      );
    }

    const numberSet = new Set(chapter.verses.map((verse) => verse.number));
    for (let number = 1; number <= expected.expectedSutras; number += 1) {
      if (!numberSet.has(number)) {
        throw new Error(`Missing ${chapter.displayTitle} sutra ${number}.`);
      }
    }

    if (numberSet.size !== expected.expectedSutras) {
      throw new Error(`Duplicate sutra number detected in ${chapter.displayTitle}.`);
    }

    for (const verse of chapter.verses) {
      if (!verse.content) {
        throw new Error(`${chapter.displayTitle} sutra ${verse.number} is empty.`);
      }

      if (forbidden.test(verse.content)) {
        throw new Error(
          `Detected non-sutra text in ${chapter.displayTitle}, sutra ${verse.number}.`
        );
      }
    }
  }
}

function printParseSummary(chapters) {
  const total = chapters.reduce(
    (sum, chapter) => sum + chapter.verses.length,
    0
  );

  console.log(`Parsed book count: ${chapters.length}`);
  console.log(`Parsed sutra/passages count: ${total}`);

  for (const chapter of chapters) {
    console.log(`${chapter.displayTitle}: ${chapter.verses.length} sutras`);
  }

  if (!debug) return;

  for (const chapter of chapters) {
    const first = chapter.verses[0];
    const last = chapter.verses[chapter.verses.length - 1];

    console.log(
      `${chapter.displayTitle} first: ${first.number}. ${first.content}`
    );
    console.log(`${chapter.displayTitle} last: ${last.number}. ${last.content}`);
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
  return verses.map((verse) => ({
    chapter_id: chapterId,
    verse_number: verse.number,
    verse_label: "Sutra",
    sort_order: verse.number,
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
      title: "The Yoga Sutras of Patanjali",
      chapter_number: parsedChapter.number,
      section_label: "Book",
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
    sectionsInserted: 0,
    sectionsSkipped: 0,
    passagesInserted: 0,
    errors: 0,
  };

  console.log(
    parseOnly
      ? "Starting Yoga Sutras parse-only validation..."
      : "Starting Yoga Sutras import..."
  );
  console.log(`Downloading source: ${SOURCE_URL}`);

  const { data: html } = await axios.get(SOURCE_URL, {
    responseType: "text",
    timeout: 30000,
    headers: {
      "User-Agent": "RELIGIOUS/1.1 Yoga Sutras importer",
    },
  });

  const parsedChapters = parseYogaSutras(html);
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
      summary.passagesInserted += result.versesInserted;

      if (result.skipped) {
        summary.sectionsSkipped += 1;
        console.log(`Skipped ${parsedChapter.displayTitle}`);
      } else {
        summary.sectionsInserted += 1;
        console.log(`Inserted ${parsedChapter.displayTitle}`);
      }
    } catch (error) {
      summary.errors += 1;
      console.error(`${parsedChapter.displayTitle} failed:`);
      console.error(error);
    }
  }

  console.log("DONE! Yoga Sutras import completed.");
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
