require("dotenv").config({ path: ".env.local" });

const { createClient } = require("@supabase/supabase-js");
const axios = require("axios");

const SOURCE_URL = "https://www.gutenberg.org/files/2388/2388-h/2388-h.htm";
const EXPECTED_CHAPTERS = 18;
const MIN_EXPECTED_VERSES = 400;
const MAX_EXPECTED_VERSES = 900;
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
];
const CONTENT_TITLES = [
  "THE DISTRESS OF ARJUNA",
  "THE BOOK OF DOCTRINES",
  "VIRTUE IN WORK",
  "THE RELIGION OF KNOWLEDGE",
  "RELIGION OF RENOUNCING WORKS",
  "RELIGION BY SELF-RESTRAINT",
  "RELIGION BY DISCERNMENT",
  "RELIGION BY SERVICE OF THE SUPREME",
  "RELIGION BY THE KINGLY KNOWLEDGE AND THE KINGLY MYSTERY",
  "RELIGION BY THE HEAVENLY PERFECTIONS",
  "THE MANIFESTING OF THE ONE AND MANIFOLD",
  "RELIGION OF FAITH",
  "RELIGION BY SEPARATION OF MATTER AND SPIRIT",
  "RELIGION BY SEPARATION FROM THE QUALITIES",
  "RELIGION BY ATTAINING THE SUPREME",
  "THE SEPARATENESS OF THE DIVINE AND UNDIVINE",
  "RELIGION BY THE THREEFOLD FAITH",
  "RELIGION BY DELIVERANCE AND RENUNCIATION",
];
const BOOK_METADATA = {
  title: "Bhagavad Gita",
  description:
    "A revered Hindu sacred text from the Mahabharata, presented as a dialogue between Arjuna and Krishna, translated into English by Sir Edwin Arnold.",
  religion: "Hinduism",
  tradition: "Hindu / Vedantic",
  language: "English",
  translator: "Sir Edwin Arnold",
  license: "Public domain in the USA",
  public_domain: true,
  source_url: "https://www.gutenberg.org/ebooks/2388",
  text_type: "verse_dialogue",
};

const REQUIRED_BOOK_COLUMNS = ["title", "description", "content"];
const REQUIRED_CHAPTER_COLUMNS = ["book_id", "title", "chapter_number"];
const REQUIRED_VERSE_COLUMNS = ["chapter_id", "verse_number", "content"];

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required for the Bhagavad Gita import script.`);
  }

  return value;
}

const parseOnly = process.env.BHAGAVAD_GITA_PARSE_ONLY === "1";
const debug = process.env.BHAGAVAD_GITA_DEBUG === "1";
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

function htmlToBlocks(html) {
  const text = decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|h1|h2|h3|h4|pre|li)>/gi, "\n\n")
      .replace(/<[^>]+>/g, "")
  )
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text
    .split(/\n\s*\n/)
    .map((block) =>
      block
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .join("\n")
        .trim()
    )
    .filter(Boolean);
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
      throw new Error(`Invalid Roman numeral in Bhagavad Gita chapter: ${value}`);
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
    .replace(/\[FN#\d+\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isSpeakerLine(value) {
  return /^(Dhritirashtra|Sanjaya|Krishna|Arjuna)\.?[:]?$/.test(value.trim());
}

function groupTextRowsIntoStanzas(rows) {
  const stanzas = [];
  let pendingSpeaker = "";
  let pendingLines = [];

  function flush() {
    if (!pendingLines.length) return;

    const content = [pendingSpeaker, pendingLines.join(" ")]
      .filter(Boolean)
      .join(" ");

    stanzas.push({
      number: stanzas.length + 1,
      content: cleanText(content),
    });
    pendingSpeaker = "";
    pendingLines = [];
  }

  for (const row of rows) {
    const line = cleanText(row.content);

    if (!line || /^\.\s*\.\s*\./.test(line)) continue;

    if (isSpeakerLine(line)) {
      flush();
      pendingSpeaker = line;
      continue;
    }

    pendingLines.push(line);

    if (pendingLines.length >= 4) {
      flush();
    }
  }

  flush();

  return stanzas;
}

function normalizeTitle(value) {
  return value.replace(/[^A-Z0-9]+/g, " ").trim();
}

function findBodyStart(blocks) {
  for (let index = 0; index < blocks.length; index += 1) {
    if (!/^CHAPTER I$/i.test(blocks[index])) continue;

    const before = blocks.slice(Math.max(0, index - 25), index).join("\n");
    const after = blocks.slice(index + 1, index + 8).join("\n");

    if (
      /XVIII\.\s+RELIGION BY DELIVERANCE AND RENUNCIATION/.test(before) &&
      /Dhritirashtra:/i.test(after)
    ) {
      return index;
    }
  }

  throw new Error("Could not find the start of the Bhagavad Gita body text.");
}

function parseBhagavadGita(html) {
  const blocks = htmlToBlocks(html);
  const startIndex = findBodyStart(blocks);
  const chapters = [];
  let currentChapter = null;
  let expectedChapterIndex = 0;
  let skippingChapterEnding = false;

  function finishChapter() {
    if (currentChapter) {
      currentChapter.verses = groupTextRowsIntoStanzas(
        currentChapter.verses.filter((verse) => verse.content)
      );
      chapters.push(currentChapter);
      currentChapter = null;
    }
  }

  for (const rawBlock of blocks.slice(startIndex)) {
    if (/^\*\*\*\s*END OF/i.test(rawBlock)) break;
    if (/^End of (the )?Project Gutenberg/i.test(rawBlock)) break;
    if (/^PROJECT GUTENBERG/i.test(rawBlock)) break;
    if (/^HERE ENDS, WITH CHAPTER XVIII/i.test(rawBlock)) {
      finishChapter();
      break;
    }

    const chapterMatch = rawBlock.match(/^CHAPTER\s+([IVXLCDM]+)$/i);
    if (chapterMatch) {
      const romanChapter = chapterMatch[1].toUpperCase();
      const expectedRomanChapter = EXPECTED_ROMAN_CHAPTERS[expectedChapterIndex];

      if (romanChapter !== expectedRomanChapter) {
        throw new Error(
          `Unexpected Bhagavad Gita chapter sequence: found ${romanChapter}, expected ${expectedRomanChapter}.`
        );
      }

      finishChapter();

      const chapterNumber = romanToNumber(romanChapter);
      const contentTitle = CONTENT_TITLES[chapterNumber - 1];
      currentChapter = {
        number: chapterNumber,
        displayTitle: contentTitle
          ? `Chapter ${chapterNumber}. ${contentTitle}`
          : `Chapter ${chapterNumber}`,
        verses: [],
      };
      expectedChapterIndex += 1;
      skippingChapterEnding = false;
      continue;
    }

    if (!currentChapter) continue;

    if (/^HERE ENDETH CHAPTER/i.test(rawBlock)) {
      skippingChapterEnding = true;
      continue;
    }

    if (skippingChapterEnding) {
      continue;
    }

    if (/^\[FN#\d+\]/.test(rawBlock)) continue;
    if (/^Entitled\s+/i.test(rawBlock)) continue;
    if (/^Or\s+/i.test(rawBlock)) continue;
    if (/^THE BHAGAVAD-GITA\.?$/i.test(rawBlock)) continue;

    const content = cleanText(rawBlock);

    if (!content) continue;

    currentChapter.verses.push({
      number: currentChapter.verses.length + 1,
      content,
    });
  }

  validateParsedChapters(chapters);

  return chapters;
}

function printParseSummary(chapters) {
  const verseCount = chapters.reduce(
    (total, chapter) => total + chapter.verses.length,
    0
  );

  console.log(`Parsed chapter count: ${chapters.length}`);
  console.log(`Parsed verse/stanza count: ${verseCount}`);

  if (!debug) return;

  for (const chapter of chapters) {
    console.log(
      `Chapter ${chapter.number}: ${chapter.displayTitle} (${chapter.verses.length} verses/stanzas)`
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
      `Expected ${EXPECTED_CHAPTERS} Bhagavad Gita chapters, parsed ${chapters.length}.`
    );
  }

  if (verseCount < MIN_EXPECTED_VERSES) {
    throw new Error(
      `Parsed only ${verseCount} Bhagavad Gita verses/stanzas; expected at least ${MIN_EXPECTED_VERSES}.`
    );
  }

  if (verseCount > MAX_EXPECTED_VERSES) {
    throw new Error(
      `Parsed ${verseCount} Bhagavad Gita verses/stanzas; expected no more than ${MAX_EXPECTED_VERSES}. Parser may be too granular.`
    );
  }

  const chapterNumberSet = new Set(chapters.map((chapter) => chapter.number));
  for (let number = 1; number <= EXPECTED_CHAPTERS; number += 1) {
    if (!chapterNumberSet.has(number)) {
      throw new Error(`Missing Bhagavad Gita chapter ${number}.`);
    }
  }

  for (const chapter of chapters) {
    if (!chapter.verses.length) {
      throw new Error(`Parsed chapter ${chapter.number} with no text rows.`);
    }

    const expectedTitle = CONTENT_TITLES[chapter.number - 1];
    if (
      expectedTitle &&
      !normalizeTitle(chapter.displayTitle).includes(normalizeTitle(expectedTitle))
    ) {
      throw new Error(`Chapter ${chapter.number} title did not match contents.`);
    }
  }

  if (verseCount < 500 || verseCount > 800) {
    console.warn(
      `Warning: parsed ${verseCount} Bhagavad Gita verses/stanzas. This is valid but should be reviewed before import.`
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
      ? "Starting Bhagavad Gita parse-only validation..."
      : "Starting Bhagavad Gita import..."
  );
  console.log(`Downloading source: ${SOURCE_URL}`);

  const { data: html } = await axios.get(SOURCE_URL, {
    responseType: "text",
    timeout: 30000,
    headers: {
      "User-Agent": "RELIGIOUS/1.1 Bhagavad Gita importer",
    },
  });
  const parsedChapters = parseBhagavadGita(html);
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

  console.log("DONE! Bhagavad Gita import completed.");
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
