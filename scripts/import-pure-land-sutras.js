require("dotenv").config({ path: ".env.local" });

const { createClient } = require("@supabase/supabase-js");
const axios = require("axios");

const INDEX_URL = "https://sacred-texts.com/bud/sbe49/index.htm";
const BOOKS = [
  {
    url: "https://sacred-texts.com/bud/sbe49/sbe4924.htm",
    metadata: {
      title: "The Larger Sukhavati-vyuha Sutra",
      description:
        "A Pure Land Mahayana Buddhist sutra describing the vows and realm of Amitabha Buddha, translated into English by F. Max Muller.",
      religion: "Buddhism",
      tradition: "Mahayana Buddhist / Pure Land",
      language: "English",
      translator: "F. Max Muller",
      license: "Public domain in the USA",
      public_domain: true,
      source_url: INDEX_URL,
      text_type: "pure_land_sutra",
    },
    chapterTitle: "The Larger Sukhavati-vyuha Sutra",
    expectedSectionsMin: 40,
    expectedSectionsMax: 55,
    expectedPassagesMin: 120,
    expectedPassagesMax: 500,
  },
  {
    url: "https://sacred-texts.com/bud/sbe49/sbe4927.htm",
    metadata: {
      title: "The Smaller Sukhavati-vyuha Sutra",
      description:
        "A concise Pure Land Mahayana Buddhist sutra focused on Amitabha Buddha and the land of Sukhavati, translated into English by F. Max Muller.",
      religion: "Buddhism",
      tradition: "Mahayana Buddhist / Pure Land",
      language: "English",
      translator: "F. Max Muller",
      license: "Public domain in the USA",
      public_domain: true,
      source_url: INDEX_URL,
      text_type: "pure_land_sutra",
    },
    chapterTitle: "The Smaller Sukhavati-vyuha Sutra",
    expectedSectionsMin: 18,
    expectedSectionsMax: 25,
    expectedPassagesMin: 30,
    expectedPassagesMax: 120,
  },
  {
    url: "https://sacred-texts.com/bud/sbe49/sbe4933.htm",
    metadata: {
      title: "The Amitayur-dhyana Sutra",
      description:
        "A Pure Land Mahayana Buddhist meditation sutra concerning Amitayus/Amitabha Buddha, translated into English by J. Takakusu.",
      religion: "Buddhism",
      tradition: "Mahayana Buddhist / Pure Land",
      language: "English",
      translator: "J. Takakusu",
      license: "Public domain in the USA",
      public_domain: true,
      source_url: INDEX_URL,
      text_type: "pure_land_sutra",
    },
    chapterTitle: "The Amitayur-dhyana Sutra",
    expectedSectionsMin: 25,
    expectedSectionsMax: 40,
    expectedPassagesMin: 60,
    expectedPassagesMax: 250,
  },
];

const REQUIRED_BOOK_COLUMNS = ["title", "description", "content"];
const REQUIRED_CHAPTER_COLUMNS = ["book_id", "title", "chapter_number"];
const REQUIRED_VERSE_COLUMNS = ["chapter_id", "verse_number", "content"];

const parseOnly = process.env.PURE_LAND_PARSE_ONLY === "1";
const debug = process.env.PURE_LAND_DEBUG === "1";
let supabase = null;

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required for the Pure Land sutras import script.`);
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
  "User-Agent": "RELIGIOUS/1.1 Pure Land sutras importer",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

function decodeHtmlEntities(value) {
  const namedEntities = {
    AElig: "AE",
    aelig: "ae",
    Acirc: "A",
    acirc: "a",
    Agrave: "A",
    agrave: "a",
    amp: "&",
    apos: "'",
    Ccedil: "C",
    ccedil: "c",
    Eacute: "E",
    eacute: "e",
    Ecirc: "E",
    ecirc: "e",
    egrave: "e",
    Egrave: "E",
    gt: ">",
    Icirc: "I",
    icirc: "i",
    ldquo: '"',
    lsquo: "'",
    lt: "<",
    mdash: "-",
    nbsp: " ",
    ndash: "-",
    Ocirc: "O",
    ocirc: "o",
    ouml: "o",
    quot: '"',
    rdquo: '"',
    rsquo: "'",
    sect: "§",
    Ucirc: "U",
    ucirc: "u",
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
    .replace(/\{p\.\s*\d+\}/gi, "")
    .replace(/\[(\d+)\]/g, "")
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

async function downloadHtml(url) {
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

function extractMainHtml(html, bookConfig) {
  const bodyStart = html.search(/<BODY|<body/i);
  const navStart = html.search(/<nav\s+role=["']navigation["']|<HR>\s*<CENTER><A HREF=/i);

  if (bodyStart === -1) {
    throw new Error(`Could not find body for ${bookConfig.metadata.title}.`);
  }

  if (navStart === -1 || navStart <= bodyStart) {
    throw new Error(`Could not find navigation boundary for ${bookConfig.metadata.title}.`);
  }

  return html.slice(bodyStart, navStart);
}

function paragraphBlocks(html) {
  return [...html.matchAll(/<p(?:\s+[^>]*)?>([\s\S]*?)<\/p>/gi)]
    .map((match) => stripHtml(match[1]))
    .filter(Boolean);
}

function isHeadingOrNavigation(value) {
  return (
    /^Sacred Texts$/i.test(value) ||
    /^Buddhism$/i.test(value) ||
    /^Index$/i.test(value) ||
    /^Previous$/i.test(value) ||
    /^Next$/i.test(value) ||
    /^THE (LARGER|SMALLER)$/i.test(value) ||
    /^SUKHAVATI-VYUHA\.?$/i.test(value) ||
    /^DESCRIPTION OF SUKHAVATI/i.test(value) ||
    /^THE LAND OF BLISS\.?$/i.test(value) ||
    /^MEDITATION$/i.test(value) ||
    /^BUDDHA AMITAYUS/i.test(value)
  );
}

function isFootnote(value) {
  return /^\[\d+[\s.]/.test(value) || /^[*.]\s/.test(value);
}

function normalizePassage(value) {
  return cleanText(
    value
      .replace(/\[\d+[\s.][^\]]+\]/g, "")
      .replace(/\s+\[\d+[\s.][^\]]+$/g, "")
  );
}

function parseSutra(bookConfig, html) {
  const mainHtml = extractMainHtml(html, bookConfig);
  const paragraphs = paragraphBlocks(mainHtml)
    .map(normalizePassage)
    .filter(Boolean)
    .filter((paragraph) => !isHeadingOrNavigation(paragraph))
    .filter((paragraph) => !isFootnote(paragraph));
  const sections = [];
  let currentSection = null;
  let openingPassages = [];

  function pushOpening() {
    if (!openingPassages.length) return;

    sections.push({
      number: sections.length + 1,
      sourceNumber: 0,
      displayTitle: "Opening",
      verses: openingPassages.map((content, index) => ({
        number: index + 1,
        content,
      })),
    });
    openingPassages = [];
  }

  function pushSection(section) {
    if (!section) return;
    if (!section.verses.length) {
      throw new Error(`Parsed ${bookConfig.metadata.title} ${section.displayTitle} with no passages.`);
    }

    sections.push({
      ...section,
      number: sections.length + 1,
    });
  }

  for (const paragraph of paragraphs) {
    const sectionMatch = paragraph.match(/^§\s*(\d+)\.\s*(.*)$/);

    if (sectionMatch) {
      pushOpening();
      pushSection(currentSection);

      const sourceNumber = Number(sectionMatch[1]);
      const firstContent = normalizePassage(sectionMatch[2]);
      currentSection = {
        number: 0,
        sourceNumber,
        displayTitle: `Section ${sourceNumber}`,
        verses: [],
      };

      if (firstContent) {
        currentSection.verses.push({
          number: 1,
          content: firstContent,
        });
      }

      continue;
    }

    if (currentSection) {
      currentSection.verses.push({
        number: currentSection.verses.length + 1,
        content: paragraph,
      });
    } else if (paragraph.length > 12) {
      openingPassages.push(paragraph);
    }
  }

  pushSection(currentSection);

  validateParsedSutra(bookConfig, sections);

  return {
    metadata: bookConfig.metadata,
    chapterTitle: bookConfig.chapterTitle,
    sections,
  };
}

function validateParsedSutra(bookConfig, sections) {
  const passageCount = sections.reduce(
    (total, section) => total + section.verses.length,
    0
  );

  if (
    sections.length < bookConfig.expectedSectionsMin ||
    sections.length > bookConfig.expectedSectionsMax
  ) {
    throw new Error(
      `${bookConfig.metadata.title}: parsed ${sections.length} sections; expected ${bookConfig.expectedSectionsMin}-${bookConfig.expectedSectionsMax}.`
    );
  }

  if (
    passageCount < bookConfig.expectedPassagesMin ||
    passageCount > bookConfig.expectedPassagesMax
  ) {
    throw new Error(
      `${bookConfig.metadata.title}: parsed ${passageCount} passages; expected ${bookConfig.expectedPassagesMin}-${bookConfig.expectedPassagesMax}.`
    );
  }

  const forbidden = /Sacred Texts|Internet Sacred Text Archive|Google tag|Cloudflare|cf_chl|challenge-platform|Page navigation|Previous:|Next:|Index of|Indices|Copyright|Project Gutenberg|license/i;

  for (const section of sections) {
    if (!section.verses.length) {
      throw new Error(`${bookConfig.metadata.title}: ${section.displayTitle} has no passages.`);
    }

    for (const passage of section.verses) {
      if (forbidden.test(passage.content)) {
        throw new Error(
          `${bookConfig.metadata.title}: detected navigation/footer/source text in ${section.displayTitle}, passage ${passage.number}.`
        );
      }
    }
  }
}

function printParseSummary(parsedBooks) {
  console.log(`Parsed sutra count: ${parsedBooks.length}`);

  for (const parsedBook of parsedBooks) {
    const passageCount = parsedBook.sections.reduce(
      (total, section) => total + section.verses.length,
      0
    );

    console.log(`Sutra: ${parsedBook.metadata.title}`);
    console.log(`Sections: ${parsedBook.sections.length}`);
    console.log(`Passages: ${passageCount}`);
    console.log(
      `Selected section titles: ${parsedBook.sections
        .slice(0, 6)
        .map((section) => section.displayTitle)
        .join(", ")}`
    );

    if (!debug) continue;

    for (const section of parsedBook.sections) {
      console.log(
        `${parsedBook.metadata.title} - ${section.displayTitle}: ${section.verses.length} passages`
      );
    }
  }
}

async function parsePureLandSutras() {
  const parsedBooks = [];

  for (const bookConfig of BOOKS) {
    console.log(`Downloading ${bookConfig.metadata.title}: ${bookConfig.url}`);
    const html = await downloadHtml(bookConfig.url);
    parsedBooks.push(parseSutra(bookConfig, html));
  }

  if (parsedBooks.length !== BOOKS.length) {
    throw new Error(`Expected ${BOOKS.length} Pure Land sutras, parsed ${parsedBooks.length}.`);
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

async function importSection(bookId, parsedBook, section) {
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
      title: parsedBook.chapterTitle,
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

async function importParsedBook(parsedBook) {
  const summary = {
    bookCreated: false,
    bookReused: false,
    sectionsInserted: 0,
    sectionsSkipped: 0,
    passagesInserted: 0,
    errors: 0,
  };
  const { book, created } = await getOrCreateBook(parsedBook.metadata);
  summary.bookCreated = created;
  summary.bookReused = !created;

  console.log(
    `${created ? "Created" : "Reused"} holy_books record: ${book.title} (${book.id})`
  );

  for (const section of parsedBook.sections) {
    try {
      const result = await importSection(book.id, parsedBook, section);
      summary.passagesInserted += result.versesInserted;

      if (result.skipped) {
        summary.sectionsSkipped += 1;
        console.log(`Skipped ${parsedBook.metadata.title} - ${section.displayTitle}`);
      } else {
        summary.sectionsInserted += 1;
        console.log(`Inserted ${parsedBook.metadata.title} - ${section.displayTitle}`);
      }
    } catch (error) {
      summary.errors += 1;
      console.error(`${parsedBook.metadata.title} - ${section.displayTitle} failed:`);
      console.error(error);
    }
  }

  console.log(`Summary for ${parsedBook.metadata.title}:`);
  console.log(`Book created: ${summary.bookCreated ? "yes" : "no"}`);
  console.log(`Book reused: ${summary.bookReused ? "yes" : "no"}`);
  console.log(`Sections inserted: ${summary.sectionsInserted}`);
  console.log(`Sections skipped: ${summary.sectionsSkipped}`);
  console.log(`Passages inserted: ${summary.passagesInserted}`);
  console.log(`Errors: ${summary.errors}`);

  return summary;
}

async function main() {
  console.log(
    parseOnly
      ? "Starting Pure Land sutras parse-only validation..."
      : "Starting Pure Land sutras import..."
  );

  const parsedBooks = await parsePureLandSutras();
  printParseSummary(parsedBooks);

  if (parseOnly) {
    console.log("Parse-only mode enabled. No Supabase connection or import was attempted.");
    return;
  }

  let totalErrors = 0;
  for (const parsedBook of parsedBooks) {
    const summary = await importParsedBook(parsedBook);
    totalErrors += summary.errors;
  }

  console.log("DONE! Pure Land sutras import completed.");

  if (totalErrors > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("IMPORT FAILED:");
  console.error(error.response?.data || error);
  process.exitCode = 1;
});
