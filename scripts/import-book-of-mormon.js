require("dotenv").config({ path: ".env.local" });

const { createClient } = require("@supabase/supabase-js");
const axios = require("axios");

const SOURCE_URL = "https://www.gutenberg.org/cache/epub/17/pg17.txt";
const BOOK_METADATA = {
  title: "The Book of Mormon",
  description:
    "A sacred text of the Latter Day Saint movement, presented in the Project Gutenberg public-domain edition.",
  religion: "Christianity",
  tradition: "Latter Day Saint / Book of Mormon",
  language: "English",
  translator: "Joseph Smith Jr.",
  license: "Public domain in the USA",
  public_domain: true,
  source_url: "https://www.gutenberg.org/ebooks/17",
  text_type: "latter_day_saint_scripture",
};
const EXPECTED_BOOKS = [
  { name: "1 Nephi", chapters: 22 },
  { name: "2 Nephi", chapters: 33 },
  { name: "Jacob", chapters: 7 },
  { name: "Enos", chapters: 1 },
  { name: "Jarom", chapters: 1 },
  { name: "Omni", chapters: 1 },
  { name: "Words of Mormon", chapters: 1 },
  { name: "Mosiah", chapters: 29 },
  { name: "Alma", chapters: 63 },
  { name: "Helaman", chapters: 16 },
  { name: "3 Nephi", chapters: 30 },
  { name: "4 Nephi", chapters: 1 },
  { name: "Mormon", chapters: 9 },
  { name: "Ether", chapters: 15 },
  { name: "Moroni", chapters: 10 },
];
const EXPECTED_TOTAL_CHAPTERS = 239;
const EXPECTED_TOTAL_VERSES = 6604;

const REQUIRED_BOOK_COLUMNS = ["title", "description", "content"];
const REQUIRED_CHAPTER_COLUMNS = ["book_id", "title", "chapter_number"];
const REQUIRED_VERSE_COLUMNS = ["chapter_id", "verse_number", "content"];

const parseOnly = process.env.BOOK_OF_MORMON_PARSE_ONLY === "1";
const debug = process.env.BOOK_OF_MORMON_DEBUG === "1";
let supabase = null;

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required for the Book of Mormon import script.`);
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
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function findScriptureBody(text) {
  const normalized = text.replace(/\r/g, "");
  const bodyStart = normalized.indexOf("\n1 Nephi Chapter 1\n");
  const bodyEnd = normalized.indexOf(
    "*** END OF THE PROJECT GUTENBERG EBOOK THE BOOK OF MORMON ***"
  );

  if (bodyStart === -1) {
    throw new Error("Could not find the start of the Book of Mormon body text.");
  }

  if (bodyEnd === -1 || bodyEnd <= bodyStart) {
    throw new Error("Could not find the end of the Book of Mormon body text.");
  }

  return normalized.slice(bodyStart, bodyEnd).trim();
}

function parseChapterHeading(block) {
  const match = block.match(/^(.+?)\s+Chapter\s+(\d+)$/);

  if (!match) return null;

  return {
    bookName: cleanText(match[1]),
    chapterNumber: Number(match[2]),
  };
}

function parseInnerBookHeading(block) {
  const normalized = cleanText(block).toUpperCase();
  const aliases = [
    ["THE SECOND BOOK OF NEPHI", "2 Nephi"],
    ["THE BOOK OF JACOB", "Jacob"],
    ["THE BOOK OF ENOS", "Enos"],
    ["THE BOOK OF JAROM", "Jarom"],
    ["THE BOOK OF OMNI", "Omni"],
    ["THE WORDS OF MORMON", "Words of Mormon"],
    ["THE BOOK OF MOSIAH", "Mosiah"],
    ["THE BOOK OF ALMA", "Alma"],
    ["THE BOOK OF HELAMAN", "Helaman"],
    ["THIRD BOOK OF NEPHI", "3 Nephi"],
    ["FOURTH NEPHI", "4 Nephi"],
    ["THE BOOK OF MORMON", "Mormon"],
    ["THE BOOK OF ETHER", "Ether"],
    ["THE BOOK OF MORONI", "Moroni"],
  ];

  const match = aliases.find(([heading]) => normalized === heading);

  return match ? match[1] : null;
}

function parseVerseBlock(block, currentChapter) {
  const normalized = cleanText(block);
  const markerPattern = /(?:^|\s)(\d+):(\d+)\s+/g;
  const matches = [...normalized.matchAll(markerPattern)];

  if (!matches.length) return [];

  return matches.map((match, index) => {
    const chapterNumber = Number(match[1]);
    const verseNumber = Number(match[2]);
    const contentStart = (match.index ?? 0) + match[0].length;
    const next = matches[index + 1];
    const contentEnd = next ? next.index : normalized.length;
    const content = cleanText(normalized.slice(contentStart, contentEnd));

    if (chapterNumber !== currentChapter.chapterNumber) {
      throw new Error(
        `Verse marker ${chapterNumber}:${verseNumber} appeared inside ${currentChapter.displayTitle}.`
      );
    }

    if (!content) {
      throw new Error(
        `Empty verse parsed in ${currentChapter.displayTitle}, verse ${verseNumber}.`
      );
    }

    return {
      number: verseNumber,
      content,
    };
  });
}

function parseBookOfMormon(text) {
  const body = findScriptureBody(text);
  const blocks = body
    .split(/\n\s*\n/g)
    .map((block) =>
      block
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .join(" ")
        .trim()
    )
    .filter(Boolean);
  const chapters = [];
  let currentChapter = null;
  let pendingBookName = "1 Nephi";
  let sortOrder = 1;

  function finishChapter() {
    if (!currentChapter) return;

    if (!currentChapter.verses.length) {
      currentChapter = null;
      return;
    }

    currentChapter.verses.sort((first, second) => first.number - second.number);
    chapters.push(currentChapter);
    currentChapter = null;
  }

  for (const block of blocks) {
    const innerBookName = parseInnerBookHeading(block);

    if (innerBookName) {
      finishChapter();
      pendingBookName = innerBookName;
      continue;
    }

    const heading = parseChapterHeading(block);

    if (heading) {
      finishChapter();
      pendingBookName = heading.bookName;
      currentChapter = {
        bookName: heading.bookName,
        chapterNumber: heading.chapterNumber,
        displayTitle: `${heading.bookName} ${heading.chapterNumber}`,
        sortOrder,
        verses: [],
      };
      sortOrder += 1;
      continue;
    }

    if (!currentChapter && pendingBookName && /(?:^|\s)\d+:\d+\s+/.test(block)) {
      currentChapter = {
        bookName: pendingBookName,
        chapterNumber: 1,
        displayTitle: `${pendingBookName} 1`,
        sortOrder,
        verses: [],
      };
      sortOrder += 1;
    }

    if (!currentChapter) continue;

    const verses = parseVerseBlock(block, currentChapter);
    currentChapter.verses.push(...verses);
  }

  finishChapter();
  validateParsedChapters(chapters);

  return chapters;
}

function validateParsedChapters(chapters) {
  const verseCount = chapters.reduce(
    (total, chapter) => total + chapter.verses.length,
    0
  );

  if (chapters.length !== EXPECTED_TOTAL_CHAPTERS) {
    throw new Error(
      `Expected ${EXPECTED_TOTAL_CHAPTERS} Book of Mormon chapters, parsed ${chapters.length}.`
    );
  }

  if (verseCount !== EXPECTED_TOTAL_VERSES) {
    throw new Error(
      `Expected ${EXPECTED_TOTAL_VERSES} Book of Mormon verses, parsed ${verseCount}.`
    );
  }

  const seenChapters = new Set();
  const expectedBookNames = new Set(EXPECTED_BOOKS.map((book) => book.name));
  const parsedBookNames = new Set(chapters.map((chapter) => chapter.bookName));

  for (const expectedBook of EXPECTED_BOOKS) {
    if (!parsedBookNames.has(expectedBook.name)) {
      throw new Error(`Missing Book of Mormon inner book: ${expectedBook.name}.`);
    }

    const bookChapters = chapters.filter(
      (chapter) => chapter.bookName === expectedBook.name
    );

    if (bookChapters.length !== expectedBook.chapters) {
      throw new Error(
        `Expected ${expectedBook.chapters} ${expectedBook.name} chapters, parsed ${bookChapters.length}.`
      );
    }

    for (
      let chapterNumber = 1;
      chapterNumber <= expectedBook.chapters;
      chapterNumber += 1
    ) {
      if (
        !bookChapters.some((chapter) => chapter.chapterNumber === chapterNumber)
      ) {
        throw new Error(`Missing ${expectedBook.name} chapter ${chapterNumber}.`);
      }
    }
  }

  for (const bookName of parsedBookNames) {
    if (!expectedBookNames.has(bookName)) {
      throw new Error(`Unexpected Book of Mormon inner book parsed: ${bookName}.`);
    }
  }

  const forbidden = /Project Gutenberg|START OF THE PROJECT|END OF THE PROJECT|Contents|Transcriber's Notes|License|Updated editions|Gutenberg eBook/i;

  for (const chapter of chapters) {
    const chapterKey = `${chapter.bookName}:${chapter.chapterNumber}`;

    if (seenChapters.has(chapterKey)) {
      throw new Error(`Duplicate Book of Mormon chapter parsed: ${chapterKey}.`);
    }

    seenChapters.add(chapterKey);

    if (!chapter.verses.length) {
      throw new Error(`Parsed ${chapter.displayTitle} with no verses.`);
    }

    const seenVerses = new Set(chapter.verses.map((verse) => verse.number));
    const maxVerse = Math.max(...chapter.verses.map((verse) => verse.number));

    if (seenVerses.size !== chapter.verses.length) {
      throw new Error(`Duplicate verse number parsed in ${chapter.displayTitle}.`);
    }

    for (let verseNumber = 1; verseNumber <= maxVerse; verseNumber += 1) {
      if (!seenVerses.has(verseNumber)) {
        throw new Error(`Missing ${chapter.displayTitle} verse ${verseNumber}.`);
      }
    }

    for (const verse of chapter.verses) {
      if (!verse.content || verse.content.length < 2) {
        throw new Error(
          `Parsed empty/short verse in ${chapter.displayTitle}:${verse.number}.`
        );
      }

      if (forbidden.test(verse.content)) {
        throw new Error(
          `Detected non-scripture text in ${chapter.displayTitle}, verse ${verse.number}.`
        );
      }
    }
  }
}

function printParseSummary(chapters) {
  const verseCount = chapters.reduce(
    (total, chapter) => total + chapter.verses.length,
    0
  );
  const parsedBookNames = [...new Set(chapters.map((chapter) => chapter.bookName))];

  console.log(`Parsed inner book count: ${parsedBookNames.length}`);
  console.log(`Parsed chapter count: ${chapters.length}`);
  console.log(`Parsed verse count: ${verseCount}`);
  console.log(`Parsed book list: ${parsedBookNames.join(", ")}`);

  if (!debug) return;

  for (const bookName of parsedBookNames) {
    const bookChapters = chapters.filter((chapter) => chapter.bookName === bookName);
    const bookVerseCount = bookChapters.reduce(
      (total, chapter) => total + chapter.verses.length,
      0
    );

    console.log(
      `${bookName}: ${bookChapters.length} chapters, ${bookVerseCount} verses`
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

async function findExistingChapter(bookId, parsedChapter) {
  if (!supabase) {
    throw new Error("Supabase client is unavailable in parse-only mode.");
  }

  const { data, error } = await supabase
    .from("chapters")
    .select("id")
    .eq("book_id", bookId)
    .eq("title", parsedChapter.bookName)
    .eq("chapter_number", parsedChapter.chapterNumber)
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
    verse_label: "Verse",
    sort_order: verse.number,
    content: verse.content,
  }));
}

async function importChapter(bookId, parsedChapter) {
  const existingChapter = await findExistingChapter(bookId, parsedChapter);

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
      title: parsedChapter.bookName,
      chapter_number: parsedChapter.chapterNumber,
      section_label: "Chapter",
      display_title: parsedChapter.displayTitle,
      sort_order: parsedChapter.sortOrder,
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
      ? "Starting Book of Mormon parse-only validation..."
      : "Starting Book of Mormon import..."
  );
  console.log(`Downloading source: ${SOURCE_URL}`);

  const { data: text } = await axios.get(SOURCE_URL, {
    responseType: "text",
    timeout: 30000,
    headers: {
      "User-Agent": "RELIGIOUS/1.1 Book of Mormon importer",
    },
  });

  const parsedChapters = parseBookOfMormon(text);
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
        console.log(`Skipped ${parsedChapter.displayTitle}`);
      } else {
        summary.chaptersInserted += 1;
        console.log(`Inserted ${parsedChapter.displayTitle}`);
      }
    } catch (error) {
      summary.errors += 1;
      console.error(`${parsedChapter.displayTitle} failed:`);
      console.error(error);
    }
  }

  console.log("DONE! Book of Mormon import completed.");
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
