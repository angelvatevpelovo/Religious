require("dotenv").config({ path: ".env.local" });

const { createClient } = require("@supabase/supabase-js");
const axios = require("axios");

const SOURCE_URL = "https://www.gutenberg.org/cache/epub/3330/pg3330.txt";
const EXPECTED_BOOKS = 20;
const MIN_EXPECTED_PASSAGES = 450;
const MAX_EXPECTED_PASSAGES = 550;
const BOOK_METADATA = {
  title: "The Analects of Confucius",
  description:
    "A foundational Confucian text containing sayings and teachings attributed to Confucius and his disciples, translated into English by James Legge.",
  religion: "Confucianism",
  tradition: "Confucian",
  language: "English",
  translator: "James Legge",
  license: "Public domain in the USA",
  public_domain: true,
  source_url: "https://www.gutenberg.org/ebooks/3330",
  text_type: "philosophical_teachings",
};

const REQUIRED_BOOK_COLUMNS = ["title", "description", "content"];
const REQUIRED_CHAPTER_COLUMNS = ["book_id", "title", "chapter_number"];
const REQUIRED_VERSE_COLUMNS = ["chapter_id", "verse_number", "content"];

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required for the Analects import script.`);
  }

  return value;
}

const parseOnly = process.env.ANALECTS_PARSE_ONLY === "1";
const debug = process.env.ANALECTS_DEBUG === "1";
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

function cleanText(value) {
  return value
    .replace(/^\uFEFF/, "")
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
    L: 50,
    C: 100,
  };
  let total = 0;
  let previous = 0;

  for (const character of value.toUpperCase().split("").reverse()) {
    const current = numerals[character];

    if (!current) {
      throw new Error(`Invalid Roman numeral in Analects text: ${value}`);
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

function normalizeSourceText(text) {
  return cleanText(
    text
      .replace(/\r/g, "")
      .replace(/\n+/g, " ")
      .replace(/\[[0-9]+\]/g, "")
  );
}

function findAnalectsBody(text) {
  const normalized = normalizeSourceText(text);
  const bodyStart = normalized.indexOf("CONFUCIAN ANALECTS. BOOK I.");
  const bodyEnd = normalized.indexOf(
    "*** END OF THE PROJECT GUTENBERG EBOOK THE ANALECTS OF CONFUCIUS"
  );

  if (bodyStart === -1) {
    throw new Error("Could not find the start of the Analects body text.");
  }

  if (bodyEnd === -1 || bodyEnd <= bodyStart) {
    throw new Error("Could not find the end of the Analects body text.");
  }

  return normalized.slice(bodyStart, bodyEnd).trim();
}

function parseBookHeading(heading) {
  const match = heading.match(/^BOOK\s+([IVXLCDM]+)\.\s*(.*?)\.$/i);

  if (!match) {
    throw new Error(`Invalid Analects book heading: ${heading}`);
  }

  const number = romanToNumber(match[1]);
  const title = cleanText(match[2]);

  return {
    number,
    displayTitle: title ? `Book ${number} - ${title}` : `Book ${number}`,
  };
}

function parseChapterPassages(bookText) {
  const chapterPattern = /\bCHAP\.\s*([IVXLCDM]+)\.?\s*/gi;
  const matches = [...bookText.matchAll(chapterPattern)];
  const passages = [];

  for (let index = 0; index < matches.length; index += 1) {
    const current = matches[index];
    const next = matches[index + 1];
    const start = current.index + current[0].length;
    const end = next ? next.index : bookText.length;
    const content = cleanText(bookText.slice(start, end));

    if (!content) continue;

    passages.push({
      sourceChapter: current[1].toUpperCase(),
      number: passages.length + 1,
      content,
    });
  }

  return passages;
}

function parseAnalects(text) {
  const body = findAnalectsBody(text);
  const bookPattern = /\bBOOK\s+[IVXLCDM]+\.\s*[^.]+\./gi;
  const bookMatches = [...body.matchAll(bookPattern)];

  if (bookMatches.length !== EXPECTED_BOOKS) {
    throw new Error(
      `Expected ${EXPECTED_BOOKS} Analects books, parsed ${bookMatches.length}.`
    );
  }

  const books = bookMatches.map((match, index) => {
    const heading = cleanText(match[0]);
    const { number, displayTitle } = parseBookHeading(heading);
    const next = bookMatches[index + 1];
    const start = match.index + match[0].length;
    const end = next ? next.index : body.length;
    const bookText = body.slice(start, end);

    return {
      number,
      displayTitle,
      verses: parseChapterPassages(bookText),
    };
  });

  validateParsedBooks(books);

  return books;
}

function printParseSummary(books) {
  const passageCount = books.reduce(
    (total, book) => total + book.verses.length,
    0
  );

  console.log(`Parsed book/chapter count: ${books.length}`);
  console.log(`Parsed passage row count: ${passageCount}`);

  if (!debug) return;

  for (const book of books) {
    console.log(
      `Book ${book.number}: ${book.displayTitle} (${book.verses.length} passages)`
    );
  }
}

function validateParsedBooks(books) {
  const passageCount = books.reduce(
    (total, book) => total + book.verses.length,
    0
  );

  if (books.length !== EXPECTED_BOOKS) {
    throw new Error(
      `Expected ${EXPECTED_BOOKS} Analects books, parsed ${books.length}.`
    );
  }

  const bookNumberSet = new Set(books.map((book) => book.number));
  for (let number = 1; number <= EXPECTED_BOOKS; number += 1) {
    if (!bookNumberSet.has(number)) {
      throw new Error(`Missing Analects book ${number}.`);
    }
  }

  if (bookNumberSet.size !== EXPECTED_BOOKS) {
    throw new Error("Duplicate Analects book number detected.");
  }

  for (const book of books) {
    if (!book.verses.length) {
      throw new Error(`Parsed ${book.displayTitle} with no passages.`);
    }
  }

  if (passageCount < MIN_EXPECTED_PASSAGES) {
    throw new Error(
      `Parsed only ${passageCount} Analects passages; expected at least ${MIN_EXPECTED_PASSAGES}.`
    );
  }

  if (passageCount > MAX_EXPECTED_PASSAGES) {
    throw new Error(
      `Parsed ${passageCount} Analects passages; expected no more than ${MAX_EXPECTED_PASSAGES}. Parser may be too broad.`
    );
  }

  const forbidden = /Project Gutenberg|Full Project Gutenberg|START OF THIS PROJECT|END OF THE PROJECT/i;
  for (const book of books) {
    for (const passage of book.verses) {
      if (forbidden.test(passage.content)) {
        throw new Error(
          `Detected Gutenberg/license text in ${book.displayTitle}, passage ${passage.number}.`
        );
      }
    }
  }

  if (passageCount < 480 || passageCount > 510) {
    console.warn(
      `Warning: parsed ${passageCount} Analects passage rows. Review before real import.`
    );
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
    verse_number: index + 1,
    verse_label: "Passage",
    sort_order: index + 1,
    content: verse.content,
  }));
}

async function importChapter(bookId, parsedBook) {
  const existingChapter = await findExistingChapter(bookId, parsedBook.number);

  if (existingChapter) {
    const verseCount = await countChapterVerses(existingChapter.id);

    if (verseCount > 0) {
      return {
        skipped: true,
        versesInserted: 0,
      };
    }

    const verses = buildVerses(existingChapter.id, parsedBook.verses);
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
      chapter_number: parsedBook.number,
      section_label: "Book",
      display_title: parsedBook.displayTitle,
      sort_order: parsedBook.number,
    },
    REQUIRED_CHAPTER_COLUMNS
  );

  const verses = buildVerses(chapter.id, parsedBook.verses);
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
      ? "Starting Analects parse-only validation..."
      : "Starting Analects import..."
  );
  console.log(`Downloading source: ${SOURCE_URL}`);

  const { data: text } = await axios.get(SOURCE_URL, {
    responseType: "text",
    timeout: 30000,
    headers: {
      "User-Agent": "RELIGIOUS/1.1 Analects importer",
    },
  });
  const parsedBooks = parseAnalects(text);
  printParseSummary(parsedBooks);

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

  for (const parsedBook of parsedBooks) {
    try {
      const result = await importChapter(book.id, parsedBook);
      summary.versesInserted += result.versesInserted;

      if (result.skipped) {
        summary.chaptersSkipped += 1;
        console.log(`Skipped book ${parsedBook.number}`);
      } else {
        summary.chaptersInserted += 1;
        console.log(`Inserted book ${parsedBook.number}`);
      }
    } catch (error) {
      summary.errors += 1;
      console.error(`Book ${parsedBook.number} failed:`);
      console.error(error);
    }
  }

  console.log("DONE! Analects import completed.");
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
