require("dotenv").config({ path: ".env.local" });

const { createClient } = require("@supabase/supabase-js");
const axios = require("axios");

const BOOKS = [
  {
    metadata: {
      title: "The Great Learning: Legge Translation",
      description:
        "A foundational Confucian classic from the Four Books, translated into English by James Legge.",
      religion: "Confucianism",
      tradition: "Confucian / Four Books",
      language: "English",
      translator: "James Legge",
      license: "Public domain in the USA",
      public_domain: true,
      source_url:
        "https://en.wikisource.org/wiki/The_Chinese_Classics/Volume_1/The_Great_Learning",
      text_type: "confucian_classic",
    },
    rawUrl:
      "https://en.wikisource.org/w/index.php?title=The_Chinese_Classics/Volume_1/The_Great_Learning&action=raw",
    sourceTitle: "The Great Learning",
    chapterTitle: "The Great Learning",
    minPassages: 10,
    maxPassages: 30,
  },
  {
    metadata: {
      title: "The Doctrine of the Mean: Legge Translation",
      description:
        "A foundational Confucian classic from the Four Books, translated into English by James Legge.",
      religion: "Confucianism",
      tradition: "Confucian / Four Books",
      language: "English",
      translator: "James Legge",
      license: "Public domain in the USA",
      public_domain: true,
      source_url:
        "https://en.wikisource.org/wiki/The_Chinese_Classics/Volume_1/The_Doctrine_of_the_Mean",
      text_type: "confucian_classic",
    },
    rawUrl:
      "https://en.wikisource.org/w/index.php?title=The_Chinese_Classics/Volume_1/The_Doctrine_of_the_Mean&action=raw",
    sourceTitle: "The Doctrine of the Mean",
    chapterTitle: "The Doctrine of the Mean",
    minPassages: 15,
    maxPassages: 50,
  },
];

const REQUIRED_BOOK_COLUMNS = ["title", "description", "content"];
const REQUIRED_CHAPTER_COLUMNS = ["book_id", "title", "chapter_number"];
const REQUIRED_VERSE_COLUMNS = ["chapter_id", "verse_number", "content"];

const parseOnly = process.env.CONFUCIAN_EXTRA_PARSE_ONLY === "1";
const debug = process.env.CONFUCIAN_EXTRA_DEBUG === "1";
let supabase = null;

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required for the Confucian extra import script.`);
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
    .replace(/&mdash;/g, "-")
    .replace(/&ndash;/g, "-")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
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

function hasHanCharacters(value) {
  return /[\u3400-\u9FFF\uF900-\uFAFF]/.test(value);
}

function parseBookWikitext(bookConfig, wikitext) {
  const cleaned = stripWikisourceMarkup(wikitext);
  const passages = cleaned
    .split(/\n\s*\n/g)
    .map(cleanText)
    .filter(Boolean)
    .filter((paragraph) => paragraph !== bookConfig.sourceTitle)
    .filter((paragraph) => !/^category:/i.test(paragraph));

  const book = {
    metadata: bookConfig.metadata,
    sections: [
      {
        number: 1,
        displayTitle: bookConfig.chapterTitle,
        verses: passages.map((content, index) => ({
          number: index + 1,
          content,
        })),
      },
    ],
    minPassages: bookConfig.minPassages,
    maxPassages: bookConfig.maxPassages,
  };

  validateParsedBook(book);

  return book;
}

function validateParsedBook(book) {
  const passageCount = book.sections.reduce(
    (total, section) => total + section.verses.length,
    0
  );

  if (book.sections.length !== 1) {
    throw new Error(
      `Expected 1 section for ${book.metadata.title}, parsed ${book.sections.length}.`
    );
  }

  if (passageCount < book.minPassages) {
    throw new Error(
      `Parsed only ${passageCount} passages for ${book.metadata.title}; expected at least ${book.minPassages}.`
    );
  }

  if (passageCount > book.maxPassages) {
    throw new Error(
      `Parsed ${passageCount} passages for ${book.metadata.title}; expected no more than ${book.maxPassages}. Parser may be too broad.`
    );
  }

  const forbidden = /Wikisource|Creative Commons|Privacy policy|Disclaimers|Navigation|Retrieved from|Project Gutenberg|The Chinese Classics\/Volume/i;
  for (const section of book.sections) {
    if (!section.verses.length) {
      throw new Error(`Parsed ${section.displayTitle} with no passages.`);
    }

    for (const passage of section.verses) {
      if (hasHanCharacters(passage.content)) {
        throw new Error(
          `Detected Chinese original text in ${book.metadata.title}, passage ${passage.number}.`
        );
      }

      if (forbidden.test(passage.content)) {
        throw new Error(
          `Detected navigation/license text in ${book.metadata.title}, passage ${passage.number}.`
        );
      }
    }
  }
}

function printParseSummary(books) {
  console.log(`Parsed book count: ${books.length}`);

  for (const book of books) {
    const passageCount = book.sections.reduce(
      (total, section) => total + section.verses.length,
      0
    );

    console.log(`Book: ${book.metadata.title}`);
    console.log(`Sections: ${book.sections.length}`);
    console.log(`Passages: ${passageCount}`);

    if (!debug) continue;

    for (const section of book.sections) {
      console.log(
        `Section ${section.number}: ${section.displayTitle} (${section.verses.length} passages)`
      );
    }
  }
}

async function fetchBooks() {
  const parsedBooks = [];

  for (const bookConfig of BOOKS) {
    console.log(`Fetching ${bookConfig.metadata.title}...`);

    const { data } = await axios.get(bookConfig.rawUrl, {
      responseType: "text",
      timeout: 30000,
      headers: {
        "User-Agent": "RELIGIOUS/1.1 Confucian Four Books extra importer",
      },
    });

    const book = parseBookWikitext(bookConfig, data);
    const passageCount = book.sections.reduce(
      (total, section) => total + section.verses.length,
      0
    );
    console.log(`Fetched ${passageCount} passages for ${book.metadata.title}`);
    parsedBooks.push(book);
  }

  return parsedBooks;
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

async function getOrCreateBook(metadata) {
  if (!supabase) {
    throw new Error("Supabase client is unavailable in parse-only mode.");
  }

  const { data: existingBook, error: existingError } = await supabase
    .from("holy_books")
    .select("*")
    .eq("title", metadata.title)
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
      ...metadata,
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

async function importSection(bookId, bookTitle, section) {
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
      title: bookTitle,
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

async function importBook(parsedBook, summary) {
  const { book, created } = await getOrCreateBook(parsedBook.metadata);
  summary.booksCreated += created ? 1 : 0;
  summary.booksReused += created ? 0 : 1;

  console.log(
    `${created ? "Created" : "Reused"} holy_books record: ${book.title} (${book.id})`
  );

  for (const section of parsedBook.sections) {
    try {
      const result = await importSection(
        book.id,
        parsedBook.metadata.title.replace(": Legge Translation", ""),
        section
      );
      summary.passagesInserted += result.versesInserted;

      if (result.skipped) {
        summary.sectionsSkipped += 1;
        console.log(`Skipped ${book.title} - ${section.displayTitle}`);
      } else {
        summary.sectionsInserted += 1;
        console.log(`Inserted ${book.title} - ${section.displayTitle}`);
      }
    } catch (error) {
      summary.errors += 1;
      console.error(`${book.title} - ${section.displayTitle} failed:`);
      console.error(error);
    }
  }
}

async function main() {
  const summary = {
    booksCreated: 0,
    booksReused: 0,
    sectionsInserted: 0,
    sectionsSkipped: 0,
    passagesInserted: 0,
    errors: 0,
  };

  console.log(
    parseOnly
      ? "Starting Confucian extra parse-only validation..."
      : "Starting Confucian extra import..."
  );

  const books = await fetchBooks();
  printParseSummary(books);

  if (parseOnly) {
    console.log("Parse-only mode enabled. No Supabase connection or import was attempted.");
    return;
  }

  for (const book of books) {
    await importBook(book, summary);
  }

  console.log("DONE! Confucian extra import completed.");
  console.log("Import summary:");
  console.log(`Books created: ${summary.booksCreated}`);
  console.log(`Books reused: ${summary.booksReused}`);
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
