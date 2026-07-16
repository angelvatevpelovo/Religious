require("dotenv").config({ path: ".env.local" });

const { createClient } = require("@supabase/supabase-js");
const axios = require("axios");

const SOURCE_URL = "https://www.gutenberg.org/files/3283/3283-8.txt";
const EXPECTED_SECTIONS = ["Isa-Upanishad", "Katha-Upanishad", "Kena-Upanishad"];
const MIN_EXPECTED_PASSAGES = 80;
const MAX_EXPECTED_PASSAGES = 200;
const BOOK_METADATA = {
  title: "The Upanishads: Isa, Katha, Kena",
  description:
    "Selected Hindu philosophical and spiritual texts from the Upanishads, including Isa-Upanishad, Katha-Upanishad, and Kena-Upanishad, translated and commentated by Swami Paramananda.",
  religion: "Hinduism",
  tradition: "Hindu / Vedantic",
  language: "English",
  translator: "Swami Paramananda",
  license: "Public domain in the USA",
  public_domain: true,
  source_url: "https://www.gutenberg.org/ebooks/3283",
  text_type: "upanishad_selection",
};

const REQUIRED_BOOK_COLUMNS = ["title", "description", "content"];
const REQUIRED_CHAPTER_COLUMNS = ["book_id", "title", "chapter_number"];
const REQUIRED_VERSE_COLUMNS = ["chapter_id", "verse_number", "content"];

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required for the Upanishads import script.`);
  }

  return value;
}

const parseOnly = process.env.UPANISHADS_PARSE_ONLY === "1";
const debug = process.env.UPANISHADS_DEBUG === "1";
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
      throw new Error(`Invalid Roman numeral in Upanishads text: ${value}`);
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

function isRomanMarker(line) {
  return /^[IVXLCDM]+$/.test(line);
}

function isPartMarker(line) {
  return /^Part\s+/i.test(line);
}

function isSectionHeading(line) {
  return EXPECTED_SECTIONS.some(
    (title) => title.toLowerCase() === line.toLowerCase()
  );
}

function isStopLine(line) {
  return (
    isRomanMarker(line) ||
    isPartMarker(line) ||
    /^Here ends this Upanishad\.?$/i.test(line) ||
    isSectionHeading(line) ||
    /^\*\*\*\s*END OF/i.test(line) ||
    /^End of (the )?Project Gutenberg/i.test(line) ||
    /^PROJECT GUTENBERG/i.test(line)
  );
}

function looksLikeCommentary(line) {
  return /^(This|Here|By|Thus|In this|The idea|The wise|Self-realization|Knowledge of|These two|The next|To the|There are|This Mantram|This Upanishad)\b/.test(
    line
  );
}

function findBodySectionStart(lines, title) {
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].toLowerCase() !== title.toLowerCase()) continue;

    const nearby = lines.slice(index + 1, index + 8).join("\n");
    if (/Peace Chant/i.test(nearby) || /Part First/i.test(nearby)) {
      return index;
    }
  }

  throw new Error(`Could not find body section for ${title}.`);
}

function parsePassage(lines, markerIndex) {
  const marker = lines[markerIndex];
  const passageLines = [];

  for (let index = markerIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];

    if (isStopLine(line)) break;
    if (looksLikeCommentary(line) && passageLines.length > 0) break;
    if (/^Peace Chant$/i.test(line)) continue;
    if (!line) continue;

    passageLines.push(line);
  }

  const content = cleanText(passageLines.join(" "));

  if (!content) return null;

  return {
    marker,
    markerNumber: romanToNumber(marker),
    content,
  };
}

function parseSection(lines, title, startIndex, endIndex, sectionNumber) {
  const passages = [];
  let currentPart = "";

  for (let index = startIndex + 1; index < endIndex; index += 1) {
    const line = lines[index];

    if (isPartMarker(line)) {
      currentPart = line;
      continue;
    }

    if (!isRomanMarker(line)) continue;

    const passage = parsePassage(lines, index);
    if (!passage) continue;

    const label = currentPart
      ? `${currentPart}, Mantram ${passage.marker}`
      : `Mantram ${passage.marker}`;

    passages.push({
      number: passages.length + 1,
      label,
      content: passage.content,
    });
  }

  return {
    number: sectionNumber,
    displayTitle: title,
    verses: passages,
  };
}

function parseUpanishads(text) {
  const lines = text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => cleanText(line))
    .filter(Boolean);
  const starts = EXPECTED_SECTIONS.map((title) => ({
    title,
    startIndex: findBodySectionStart(lines, title),
  })).sort((first, second) => first.startIndex - second.startIndex);
  const sections = starts.map((section, index) => {
    const next = starts[index + 1];
    const endIndex = next?.startIndex ?? lines.findIndex((line, lineIndex) =>
      lineIndex > section.startIndex && /^\*\*\*\s*END OF/i.test(line)
    );

    return parseSection(
      lines,
      section.title,
      section.startIndex,
      endIndex > section.startIndex ? endIndex : lines.length,
      index + 1
    );
  });

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

  if (sections.length !== EXPECTED_SECTIONS.length) {
    throw new Error(
      `Expected ${EXPECTED_SECTIONS.length} Upanishads sections, parsed ${sections.length}.`
    );
  }

  for (const expectedTitle of EXPECTED_SECTIONS) {
    if (!sections.some((section) => section.displayTitle === expectedTitle)) {
      throw new Error(`Missing Upanishads section: ${expectedTitle}.`);
    }
  }

  for (const section of sections) {
    if (!section.verses.length) {
      throw new Error(`Parsed ${section.displayTitle} with no passages.`);
    }
  }

  if (passageCount < MIN_EXPECTED_PASSAGES) {
    throw new Error(
      `Parsed only ${passageCount} Upanishads passage rows; expected at least ${MIN_EXPECTED_PASSAGES}.`
    );
  }

  if (passageCount > MAX_EXPECTED_PASSAGES) {
    throw new Error(
      `Parsed ${passageCount} Upanishads passage rows; expected no more than ${MAX_EXPECTED_PASSAGES}. Parser may be too broad.`
    );
  }

  const forbidden = /Project Gutenberg|License|START OF THIS PROJECT|END OF THIS PROJECT/i;
  for (const section of sections) {
    for (const passage of section.verses) {
      if (forbidden.test(passage.content)) {
        throw new Error(
          `Detected Gutenberg/license text in ${section.displayTitle}, passage ${passage.number}.`
        );
      }
    }
  }

  if (passageCount < 90 || passageCount > 180) {
    console.warn(
      `Warning: parsed ${passageCount} Upanishads passage rows. This should be reviewed before import.`
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
    chaptersInserted: 0,
    chaptersSkipped: 0,
    versesInserted: 0,
    errors: 0,
  };

  console.log(
    parseOnly
      ? "Starting Upanishads parse-only validation..."
      : "Starting Upanishads import..."
  );
  console.log(`Downloading source: ${SOURCE_URL}`);

  const { data: text } = await axios.get(SOURCE_URL, {
    responseType: "text",
    timeout: 30000,
    headers: {
      "User-Agent": "RELIGIOUS/1.1 Upanishads importer",
    },
  });
  const parsedSections = parseUpanishads(text);
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
      summary.versesInserted += result.versesInserted;

      if (result.skipped) {
        summary.chaptersSkipped += 1;
        console.log(`Skipped section ${parsedSection.number}`);
      } else {
        summary.chaptersInserted += 1;
        console.log(`Inserted section ${parsedSection.number}`);
      }
    } catch (error) {
      summary.errors += 1;
      console.error(`Section ${parsedSection.number} failed:`);
      console.error(error);
    }
  }

  console.log("DONE! Upanishads import completed.");
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
