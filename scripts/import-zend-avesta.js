require("dotenv").config({ path: ".env.local" });

const { createClient } = require("@supabase/supabase-js");
const axios = require("axios");

const SOURCE_URL = "https://www.gutenberg.org/files/12894/12894-0.txt";
const MIN_EXPECTED_SECTIONS = 15;
const MAX_EXPECTED_SECTIONS = 25;
const MIN_EXPECTED_PASSAGES = 60;
const MAX_EXPECTED_PASSAGES = 220;
const EXPECTED_SECTION_TITLES = [
  "The Creation",
  "Myth of Yima",
  "The Earth",
  "Contracts and Outrages",
  "Uncleanness",
  "Funerals and Purification",
  "Cleansing the Unclean",
  "Spells Recited During the Cleansing",
  "To Fires, Waters, Plants",
  "To the Earth and the Sacred Waters",
  "Prayer for Helpers",
  "A Prayer for Sanctity and its Benefits",
  "To the Fire",
  "To the Bountiful Immortals",
  "Praise of the Holy Bull",
  "To Rain as a Healing Power",
  "To the Waters and Light of the Sun",
  "To the Waters and Light of the Moon",
  "To the Waters and Light of the Stars",
];
const BOOK_METADATA = {
  title: "Selections from the Zend-Avesta",
  description:
    "Selected Zoroastrian sacred texts from the Zend-Avesta, included in Sacred Books of the East, revised edition.",
  religion: "Zoroastrianism",
  tradition: "Zoroastrian",
  language: "English",
  translator: "James Darmesteter and Sacred Books of the East translators",
  license: "Public domain in the USA",
  public_domain: true,
  source_url: "https://www.gutenberg.org/ebooks/12894",
  text_type: "zoroastrian_selection",
};

const REQUIRED_BOOK_COLUMNS = ["title", "description", "content"];
const REQUIRED_CHAPTER_COLUMNS = ["book_id", "title", "chapter_number"];
const REQUIRED_VERSE_COLUMNS = ["chapter_id", "verse_number", "content"];

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required for the Zend-Avesta import script.`);
  }

  return value;
}

const parseOnly = process.env.ZEND_AVESTA_PARSE_ONLY === "1";
const debug = process.env.ZEND_AVESTA_DEBUG === "1";
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

function normalizeTitle(value) {
  return cleanText(value)
    .replace(/\[[0-9]+\]/g, "")
    .replace(/\.$/, "")
    .toLowerCase();
}

function toDisplayTitle(value) {
  const compact = cleanText(value).replace(/\[[0-9]+\]/g, "");
  return compact
    .toLowerCase()
    .split(" ")
    .map((word) => {
      if (["and", "of", "the", "to", "as", "a"].includes(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function findZendAvestaBody(text) {
  const normalized = text.replace(/\r/g, "");
  const startMarker = "SELECTIONS FROM THE ZEND-AVESTA";
  const endMarker = "THE DHAMMAPADA";
  const start = normalized.indexOf(startMarker);
  const end = normalized.indexOf(endMarker, start + startMarker.length);

  if (start === -1) {
    throw new Error("Could not find the start of the Zend-Avesta selections.");
  }

  if (end === -1 || end <= start) {
    throw new Error("Could not find the end of the Zend-Avesta selections.");
  }

  return normalized.slice(start + startMarker.length, end).trim();
}

function isExpectedHeading(line) {
  const normalizedLine = normalizeTitle(line);
  return EXPECTED_SECTION_TITLES.some(
    (title) => normalizeTitle(title) === normalizedLine
  );
}

function removeFootnoteBlocks(lines) {
  const cleaned = [];
  let skippingFootnote = false;

  for (const rawLine of lines) {
    const line = cleanText(rawLine);

    if (/^\[Footnote\s+\d+:/i.test(line)) {
      skippingFootnote = !/\]$/.test(line);
      continue;
    }

    if (skippingFootnote) {
      if (/\]$/.test(line)) skippingFootnote = false;
      continue;
    }

    const withoutInlineFootnote = cleanText(
      line.replace(/\[Footnote\s+\d+:[\s\S]*?\]/gi, "")
    );

    if (withoutInlineFootnote) cleaned.push(withoutInlineFootnote);
  }

  return cleaned;
}

function splitPassages(lines) {
  const passages = [];
  let buffer = [];

  function flush() {
    const content = cleanText(buffer.join(" "));
    buffer = [];

    if (!content) return;
    passages.push({
      number: passages.length + 1,
      content,
    });
  }

  for (const line of lines) {
    if (!line) {
      flush();
      continue;
    }

    if (/^(O Maker|Ahura Mazda answered|Zarathustra asked|And now|I pray|I offer|I would worship|Hail,|Up!|As the sea|Come, come on)/.test(line)) {
      flush();
    }

    buffer.push(line);
  }

  flush();

  return passages;
}

function parseZendAvesta(text) {
  const body = findZendAvestaBody(text);
  const lines = removeFootnoteBlocks(
    body
      .split("\n")
      .map((line) => cleanText(line))
      .filter(Boolean)
  );
  const sections = [];
  let currentSection = null;
  let currentLines = [];

  function finishSection() {
    if (!currentSection) return;

    const verses = splitPassages(currentLines);
    sections.push({
      number: sections.length + 1,
      displayTitle: currentSection,
      verses,
    });

    currentSection = null;
    currentLines = [];
  }

  for (const line of lines) {
    if (isExpectedHeading(line)) {
      finishSection();
      currentSection = toDisplayTitle(line);
      continue;
    }

    if (!currentSection) continue;

    currentLines.push(line);
  }

  finishSection();
  validateParsedSections(sections);

  return sections;
}

function printParseSummary(sections) {
  const passageCount = sections.reduce(
    (total, section) => total + section.verses.length,
    0
  );

  console.log(`Parsed section count: ${sections.length}`);
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

  if (sections.length < MIN_EXPECTED_SECTIONS) {
    throw new Error(
      `Parsed only ${sections.length} Zend-Avesta sections; expected at least ${MIN_EXPECTED_SECTIONS}.`
    );
  }

  if (sections.length > MAX_EXPECTED_SECTIONS) {
    throw new Error(
      `Parsed ${sections.length} Zend-Avesta sections; expected no more than ${MAX_EXPECTED_SECTIONS}. Parser may be too broad.`
    );
  }

  for (const expectedTitle of EXPECTED_SECTION_TITLES) {
    if (!sections.some((section) => normalizeTitle(section.displayTitle) === normalizeTitle(expectedTitle))) {
      throw new Error(`Missing Zend-Avesta section: ${expectedTitle}.`);
    }
  }

  for (const section of sections) {
    if (!section.verses.length) {
      throw new Error(`Parsed ${section.displayTitle} with no passages.`);
    }
  }

  if (passageCount < MIN_EXPECTED_PASSAGES) {
    throw new Error(
      `Parsed only ${passageCount} Zend-Avesta passages; expected at least ${MIN_EXPECTED_PASSAGES}.`
    );
  }

  if (passageCount > MAX_EXPECTED_PASSAGES) {
    throw new Error(
      `Parsed ${passageCount} Zend-Avesta passages; expected no more than ${MAX_EXPECTED_PASSAGES}. Parser may be too broad.`
    );
  }

  const forbidden = /Project Gutenberg|Full Project Gutenberg|Dhammapada|Upanishad|Koran|Life of Buddha|Vedic Hymns|START OF THE PROJECT|END OF THE PROJECT/i;
  for (const section of sections) {
    for (const passage of section.verses) {
      if (forbidden.test(passage.content)) {
        throw new Error(
          `Detected non-Zend or license text in ${section.displayTitle}, passage ${passage.number}.`
        );
      }
    }
  }

  if (passageCount < 80 || passageCount > 210) {
    console.warn(
      `Warning: parsed ${passageCount} Zend-Avesta passage rows. Review before real import.`
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

async function importChapter(bookId, parsedSection) {
  const existingChapter = await findExistingChapter(bookId, parsedSection.number);

  if (existingChapter) {
    const verseCount = await countChapterVerses(existingChapter.id);

    if (verseCount > 0) {
      return {
        skipped: true,
        versesInserted: 0,
      };
    }

    const verses = buildVerses(existingChapter.id, parsedSection.verses);
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
      chapter_number: parsedSection.number,
      section_label: "Section",
      display_title: parsedSection.displayTitle,
      sort_order: parsedSection.number,
    },
    REQUIRED_CHAPTER_COLUMNS
  );

  const verses = buildVerses(chapter.id, parsedSection.verses);
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
      ? "Starting Zend-Avesta parse-only validation..."
      : "Starting Zend-Avesta import..."
  );
  console.log(`Downloading source: ${SOURCE_URL}`);

  const { data: text } = await axios.get(SOURCE_URL, {
    responseType: "text",
    timeout: 30000,
    headers: {
      "User-Agent": "RELIGIOUS/1.1 Zend-Avesta importer",
    },
  });
  const parsedSections = parseZendAvesta(text);
  printParseSummary(parsedSections);

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

  for (const parsedSection of parsedSections) {
    try {
      const result = await importChapter(book.id, parsedSection);
      summary.passagesInserted += result.versesInserted;

      if (result.skipped) {
        summary.sectionsSkipped += 1;
        console.log(`Skipped section ${parsedSection.number}`);
      } else {
        summary.sectionsInserted += 1;
        console.log(`Inserted section ${parsedSection.number}`);
      }
    } catch (error) {
      summary.errors += 1;
      console.error(`Section ${parsedSection.number} failed:`);
      console.error(error);
    }
  }

  console.log("DONE! Zend-Avesta import completed.");
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