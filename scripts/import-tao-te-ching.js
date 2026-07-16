require("dotenv").config({ path: ".env.local" });

const { createClient } = require("@supabase/supabase-js");
const axios = require("axios");

const SOURCE_URL = "https://www.gutenberg.org/files/216/216-h/216-h.htm";
const BOOK_METADATA = {
  title: "Tao Te Ching",
  description:
    "A foundational Taoist sacred text traditionally attributed to Laozi, translated into English by James Legge.",
  religion: "Taoism",
  tradition: "Taoist",
  language: "English",
  translator: "James Legge",
  license: "Public domain in the USA",
  public_domain: true,
  source_url: "https://www.gutenberg.org/ebooks/216",
  text_type: "sectioned_text",
};

const REQUIRED_BOOK_COLUMNS = ["title", "description", "content"];
const REQUIRED_CHAPTER_COLUMNS = ["book_id", "title", "chapter_number"];
const REQUIRED_VERSE_COLUMNS = ["chapter_id", "verse_number", "content"];

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required for the Tao Te Ching import script.`);
  }

  return value;
}

const supabase = createClient(
  process.env.SUPABASE_URL || requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

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

function findMainTextStart(lines) {
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index] !== "PART 1.") continue;

    const nearby = lines.slice(index, index + 8).join("\n");
    if (/Ch\.\s*1\./.test(nearby)) {
      return index;
    }
  }

  throw new Error("Could not find the start of PART 1 in the Gutenberg text.");
}

function isChapterStart(line, expectedChapter) {
  const match = line.match(/^(?:Ch\.\s*)?(\d{1,2})\.\s*(.*)$/);

  if (!match) return false;

  const chapterNumber = Number(match[1]);
  const rest = match[2].trim();

  if (chapterNumber !== expectedChapter) return false;

  return (
    line.startsWith("Ch.") ||
    rest === "" ||
    rest.startsWith("1.") ||
    chapterNumber >= 11
  );
}

function stripChapterPrefix(line, chapterNumber) {
  return line
    .replace(new RegExp(`^(?:Ch\\.\\s*)?${chapterNumber}\\.\\s*`), "")
    .trim();
}

function cleanLine(line) {
  return line
    .replace(/^\d+\.\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseTaoTeChing(html) {
  const lines = htmlToText(html)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const startIndex = findMainTextStart(lines);
  const chapters = [];
  let currentChapter = null;
  let expectedChapter = 1;

  for (const rawLine of lines.slice(startIndex)) {
    if (/^\*\*\*\s*END OF/i.test(rawLine)) break;
    if (/^End of (the )?Project Gutenberg/i.test(rawLine)) break;
    if (/^PROJECT GUTENBERG/i.test(rawLine)) break;
    if (/^PART II\.$/.test(rawLine)) continue;
    if (/^PART 1\.$/.test(rawLine)) continue;

    if (expectedChapter <= 81 && isChapterStart(rawLine, expectedChapter)) {
      if (currentChapter) {
        chapters.push(currentChapter);
      }

      currentChapter = {
        number: expectedChapter,
        lines: [],
      };

      const remainder = cleanLine(stripChapterPrefix(rawLine, expectedChapter));
      if (remainder) {
        currentChapter.lines.push(remainder);
      }

      expectedChapter += 1;
      continue;
    }

    if (currentChapter && expectedChapter <= 82) {
      const line = cleanLine(rawLine);
      if (line) {
        currentChapter.lines.push(line);
      }
    }

    if (expectedChapter > 82) break;
  }

  if (currentChapter) {
    chapters.push(currentChapter);
  }

  const cleanChapters = chapters.map((chapter) => ({
    ...chapter,
    lines: chapter.lines.filter(Boolean),
  }));

  if (cleanChapters.length !== 81) {
    throw new Error(
      `Expected 81 Tao Te Ching chapters, parsed ${cleanChapters.length}.`
    );
  }

  const emptyChapter = cleanChapters.find((chapter) => chapter.lines.length === 0);
  if (emptyChapter) {
    throw new Error(`Parsed chapter ${emptyChapter.number} with no text.`);
  }

  return cleanChapters;
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
  const { count, error } = await supabase
    .from("verses")
    .select("id", { count: "exact", head: true })
    .eq("chapter_id", chapterId);

  if (error) throw error;

  return count ?? 0;
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

    const verses = buildVerses(existingChapter.id, parsedChapter.lines);
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
      display_title: `Chapter ${parsedChapter.number}`,
      sort_order: parsedChapter.number,
    },
    REQUIRED_CHAPTER_COLUMNS
  );

  const verses = buildVerses(chapter.id, parsedChapter.lines);
  await insertManyWithFallback("verses", verses, REQUIRED_VERSE_COLUMNS);

  return {
    skipped: false,
    versesInserted: verses.length,
  };
}

function buildVerses(chapterId, lines) {
  return lines.map((line, index) => ({
    chapter_id: chapterId,
    verse_number: index + 1,
    verse_label: "Line",
    sort_order: index + 1,
    content: line,
  }));
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

  console.log("Starting Tao Te Ching import preview...");
  console.log(`Downloading source: ${SOURCE_URL}`);

  const { data: html } = await axios.get(SOURCE_URL, {
    responseType: "text",
    timeout: 30000,
    headers: {
      "User-Agent": "RELIGIOUS/1.1 Tao Te Ching importer",
    },
  });
  const parsedChapters = parseTaoTeChing(html);

  console.log(`Parsed ${parsedChapters.length} Tao Te Ching chapters.`);

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

  console.log("DONE! Tao Te Ching import completed.");
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
