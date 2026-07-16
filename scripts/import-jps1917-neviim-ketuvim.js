require("dotenv").config({ path: ".env.local" });

const { createClient } = require("@supabase/supabase-js");
const axios = require("axios");

const MECHON_BASE_URL = "https://www.mechon-mamre.org/e/et";
const SOURCE_URL = "https://archive.org/details/holyscripturesac00jewiuoft";
const EXPECTED_TOTAL_BOOKS = 34;
const EXPECTED_TOTAL_CHAPTERS = 742;
const MIN_EXPECTED_VERSES = 17000;
const MAX_EXPECTED_VERSES = 18000;
const TORAH_BOOK_NAMES = new Set([
  "Genesis",
  "Exodus",
  "Leviticus",
  "Numbers",
  "Deuteronomy",
]);
const NEVIIM_KETUVIM_BOOKS = [
  { code: "06", name: "Joshua", chapters: 24 },
  { code: "07", name: "Judges", chapters: 21 },
  { code: "08a", name: "1 Samuel", heading: "I Samuel", chapters: 31 },
  { code: "08b", name: "2 Samuel", heading: "II Samuel", chapters: 24 },
  { code: "09a", name: "1 Kings", heading: "I Kings", chapters: 22 },
  { code: "09b", name: "2 Kings", heading: "II Kings", chapters: 25 },
  { code: "10", name: "Isaiah", chapters: 66 },
  { code: "11", name: "Jeremiah", chapters: 52 },
  { code: "12", name: "Ezekiel", chapters: 48 },
  { code: "13", name: "Hosea", chapters: 14 },
  { code: "14", name: "Joel", chapters: 4 },
  { code: "15", name: "Amos", chapters: 9 },
  { code: "16", name: "Obadiah", chapters: 1 },
  { code: "17", name: "Jonah", chapters: 4 },
  { code: "18", name: "Micah", chapters: 7 },
  { code: "19", name: "Nahum", chapters: 3 },
  { code: "20", name: "Habakkuk", chapters: 3 },
  { code: "21", name: "Zephaniah", chapters: 3 },
  { code: "22", name: "Haggai", chapters: 2 },
  { code: "23", name: "Zechariah", chapters: 14 },
  { code: "24", name: "Malachi", chapters: 3 },
  { code: "25a", name: "1 Chronicles", heading: "I Chronicles", chapters: 29 },
  { code: "25b", name: "2 Chronicles", heading: "II Chronicles", chapters: 36 },
  { code: "26", name: "Psalms", chapters: 150 },
  { code: "27", name: "Job", chapters: 42 },
  { code: "28", name: "Proverbs", chapters: 31 },
  { code: "29", name: "Ruth", chapters: 4 },
  { code: "30", name: "Song of Songs", chapters: 8 },
  { code: "31", name: "Ecclesiastes", chapters: 12 },
  { code: "32", name: "Lamentations", chapters: 5 },
  { code: "33", name: "Esther", chapters: 10 },
  { code: "34", name: "Daniel", chapters: 12 },
  { code: "35a", name: "Ezra", chapters: 10 },
  { code: "35b", name: "Nehemiah", chapters: 13 },
];
const BOOK_METADATA = {
  title: "Nevi'im and Ketuvim: JPS 1917",
  description:
    "The Prophets and Writings from the 1917 Jewish Publication Society English translation of the Hebrew Bible according to the Masoretic Text.",
  religion: "Judaism",
  tradition: "Jewish / Masoretic Text",
  language: "English",
  translator: "Jewish Publication Society of America",
  license: "Public domain in the USA",
  public_domain: true,
  source_url: SOURCE_URL,
  text_type: "tanakh_prophets_writings",
};

const REQUIRED_BOOK_COLUMNS = ["title", "description", "content"];
const REQUIRED_CHAPTER_COLUMNS = ["book_id", "title", "chapter_number"];
const REQUIRED_VERSE_COLUMNS = ["chapter_id", "verse_number", "content"];

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required for the Nevi'im/Ketuvim import script.`);
  }

  return value;
}

const parseOnly = process.env.NEVIIM_KETUVIM_PARSE_ONLY === "1";
const debug = process.env.NEVIIM_KETUVIM_DEBUG === "1";
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
    .replace(/[вЂњвЂќ]/g, '"')
    .replace(/[вЂвЂ™]/g, "'")
    .replace(/[вЂ“вЂ”]/g, "-")
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
      .replace(/<B>\s*<a[^>]+>\{[PS]\}<\/a>\s*<\/B>/gi, "")
      .replace(/<a[^>]+>\{[PS]\}<\/a>/gi, "")
      .replace(/<[^>]+>/g, " ")
  );
}

function padMechonChapter(base, chapterNumber) {
  if (chapterNumber < 100) {
    return `${base}${String(chapterNumber).padStart(2, "0")}.htm`;
  }

  const letterIndex = Math.floor((chapterNumber - 100) / 10);
  const letter = String.fromCharCode("a".charCodeAt(0) + letterIndex);

  return `${base}${letter}${chapterNumber % 10}.htm`;
}

function chapterUrl(bookCode, chapterNumber) {
  return `${MECHON_BASE_URL}/${padMechonChapter(`et${bookCode}`, chapterNumber)}`;
}

async function downloadHtml(url) {
  const { data } = await axios.get(url, {
    responseType: "text",
    timeout: 30000,
    headers: {
      "User-Agent": "RELIGIOUS/1.1 JPS1917 Neviim Ketuvim importer",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  return data;
}

function extractMainChapterHtml(html) {
  const h1Index = html.search(/<H1\b/i);
  const bodyEndIndex = html.search(/<\/DIV>|<HR|<script>\s*footer|<\/BODY>/i);

  if (h1Index === -1) {
    throw new Error("Could not find chapter heading in Mechon Mamre page.");
  }

  return html.slice(h1Index, bodyEndIndex > h1Index ? bodyEndIndex : html.length);
}

function parseChapterHtml(html, book, chapterNumber) {
  const mainHtml = extractMainChapterHtml(html);
  const headingMatch = mainHtml.match(/<H1[^>]*>([\s\S]*?)<\/H1>/i);
  const heading = headingMatch ? stripHtml(headingMatch[1]) : "";
  const expectedHeadingNames = [book.name, book.heading].filter(Boolean);
  const expectedHeading = `${book.name} ${chapterNumber}`;

  if (
    !expectedHeadingNames.some((name) =>
      heading.toLowerCase().includes(name.toLowerCase())
    )
  ) {
    throw new Error(
      `Unexpected chapter heading for ${expectedHeading}: ${heading || "missing"}`
    );
  }

  const anchorPattern = /<A\s+NAME=["'](\d+)["'][^>]*>\s*<\/A>/gi;
  const anchors = [...mainHtml.matchAll(anchorPattern)];
  const verses = [];

  for (let index = 0; index < anchors.length; index += 1) {
    const anchor = anchors[index];
    const nextAnchor = anchors[index + 1];
    const verseNumber = Number(anchor[1]);
    const segmentStart = anchor.index + anchor[0].length;
    const segmentEnd = nextAnchor ? nextAnchor.index : mainHtml.length;
    const segment = mainHtml.slice(segmentStart, segmentEnd);
    const verseNumberPattern = new RegExp(`<B>\\s*${verseNumber}\\s*<\\/B>`, "i");
    const numberMatch = segment.match(verseNumberPattern);

    if (!Number.isInteger(verseNumber) || verseNumber < 1 || !numberMatch) continue;

    const contentStart = (numberMatch.index ?? 0) + numberMatch[0].length;
    const content = stripHtml(segment.slice(contentStart));

    if (!content) continue;

    verses.push({
      number: verseNumber,
      content,
    });
  }

  if (!verses.length) {
    throw new Error(`No verses parsed for ${expectedHeading}.`);
  }

  const verseNumbers = new Set(verses.map((verse) => verse.number));
  if (verseNumbers.size !== verses.length) {
    throw new Error(`Duplicate verse number parsed in ${expectedHeading}.`);
  }

  const maxVerse = Math.max(...verses.map((verse) => verse.number));
  for (let number = 1; number <= maxVerse; number += 1) {
    if (!verseNumbers.has(number)) {
      throw new Error(`Missing verse ${number} in ${expectedHeading}.`);
    }
  }

  return verses.sort((first, second) => first.number - second.number);
}

async function parseNeviimKetuvim() {
  const chapters = [];
  let sortOrder = 1;

  for (const book of NEVIIM_KETUVIM_BOOKS) {
    if (TORAH_BOOK_NAMES.has(book.name)) {
      throw new Error(`Torah book configured by mistake: ${book.name}.`);
    }

    for (let chapterNumber = 1; chapterNumber <= book.chapters; chapterNumber += 1) {
      const url = chapterUrl(book.code, chapterNumber);
      console.log(`Parsing ${book.name} ${chapterNumber}: ${url}`);
      const html = await downloadHtml(url);
      const verses = parseChapterHtml(html, book, chapterNumber);

      chapters.push({
        bookName: book.name,
        chapterNumber,
        displayTitle: `${book.name} ${chapterNumber}`,
        sortOrder,
        verses,
      });
      sortOrder += 1;
    }
  }

  validateParsedNeviimKetuvim(chapters);

  return chapters;
}

function printParseSummary(chapters) {
  const verseCount = chapters.reduce(
    (total, chapter) => total + chapter.verses.length,
    0
  );

  console.log(`Parsed book count: ${NEVIIM_KETUVIM_BOOKS.length}`);
  console.log(`Parsed chapter count: ${chapters.length}`);
  console.log(`Parsed verse count: ${verseCount}`);
  console.log(
    `Parsed books: ${NEVIIM_KETUVIM_BOOKS.map((book) => book.name).join(", ")}`
  );

  if (!debug) return;

  for (const book of NEVIIM_KETUVIM_BOOKS) {
    const bookChapters = chapters.filter(
      (chapter) => chapter.bookName === book.name
    );
    const bookVerseCount = bookChapters.reduce(
      (total, chapter) => total + chapter.verses.length,
      0
    );

    console.log(
      `${book.name}: ${bookChapters.length} chapters, ${bookVerseCount} verses`
    );
  }
}

function validateParsedNeviimKetuvim(chapters) {
  const verseCount = chapters.reduce(
    (total, chapter) => total + chapter.verses.length,
    0
  );

  if (NEVIIM_KETUVIM_BOOKS.length !== EXPECTED_TOTAL_BOOKS) {
    throw new Error(
      `Expected ${EXPECTED_TOTAL_BOOKS} Prophets/Writings books, configured ${NEVIIM_KETUVIM_BOOKS.length}.`
    );
  }

  if (chapters.length !== EXPECTED_TOTAL_CHAPTERS) {
    throw new Error(
      `Expected ${EXPECTED_TOTAL_CHAPTERS} Prophets/Writings chapters, parsed ${chapters.length}.`
    );
  }

  const configuredBookNames = new Set(NEVIIM_KETUVIM_BOOKS.map((book) => book.name));
  for (const torahBookName of TORAH_BOOK_NAMES) {
    if (configuredBookNames.has(torahBookName)) {
      throw new Error(`Torah book must not be included: ${torahBookName}.`);
    }
  }

  const seen = new Set();
  for (const chapter of chapters) {
    const key = `${chapter.bookName}:${chapter.chapterNumber}`;
    if (seen.has(key)) {
      throw new Error(`Duplicate chapter parsed: ${key}.`);
    }

    seen.add(key);

    if (TORAH_BOOK_NAMES.has(chapter.bookName)) {
      throw new Error(`Parsed Torah chapter by mistake: ${chapter.displayTitle}.`);
    }

    if (!chapter.verses.length) {
      throw new Error(`Parsed ${chapter.displayTitle} with no verses.`);
    }

    for (const verse of chapter.verses) {
      if (!verse.content || verse.content.length < 2) {
        throw new Error(
          `Parsed empty/short verse in ${chapter.displayTitle}:${verse.number}.`
        );
      }
    }
  }

  for (const book of NEVIIM_KETUVIM_BOOKS) {
    const bookChapters = chapters.filter(
      (chapter) => chapter.bookName === book.name
    );

    if (bookChapters.length !== book.chapters) {
      throw new Error(
        `Expected ${book.chapters} ${book.name} chapters, parsed ${bookChapters.length}.`
      );
    }

    for (let chapterNumber = 1; chapterNumber <= book.chapters; chapterNumber += 1) {
      if (!seen.has(`${book.name}:${chapterNumber}`)) {
        throw new Error(`Missing ${book.name} chapter ${chapterNumber}.`);
      }
    }
  }

  if (verseCount < MIN_EXPECTED_VERSES) {
    throw new Error(
      `Parsed only ${verseCount} Prophets/Writings verses; expected at least ${MIN_EXPECTED_VERSES}.`
    );
  }

  if (verseCount > MAX_EXPECTED_VERSES) {
    throw new Error(
      `Parsed ${verseCount} Prophets/Writings verses; expected no more than ${MAX_EXPECTED_VERSES}. Parser may be too broad.`
    );
  }

  const forbidden = /Mechon Mamre|Javascript|This site requires|Copyright 2002|Hebrew Bible in English|chapters\(|footer\(/i;
  for (const chapter of chapters) {
    for (const verse of chapter.verses) {
      if (forbidden.test(verse.content)) {
        throw new Error(
          `Detected navigation/source text in ${chapter.displayTitle}, verse ${verse.number}.`
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
      ? "Starting Nevi'im and Ketuvim: JPS 1917 parse-only validation..."
      : "Starting Nevi'im and Ketuvim: JPS 1917 import..."
  );

  const parsedChapters = await parseNeviimKetuvim();
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

  console.log("DONE! Nevi'im and Ketuvim: JPS 1917 import completed.");
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
