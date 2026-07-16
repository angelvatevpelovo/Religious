require("dotenv").config({ path: ".env.local" });

const { createClient } = require("@supabase/supabase-js");
const axios = require("axios");

const HTML_URL = "https://www.gutenberg.org/files/64623/64623-h/64623-h.htm";
const SOURCE_URL = "https://www.gutenberg.org/ebooks/64623";
const EXPECTED_SECTIONS = 31;
const MIN_EXPECTED_PASSAGES = 35;
const MAX_EXPECTED_PASSAGES = 120;
const BOOK_METADATA = {
  title: "The Diamond Sutra: Gemmell Translation",
  description:
    "A central Mahayana Buddhist Prajnaparamita sutra, translated into English by William Gemmell.",
  religion: "Buddhism",
  tradition: "Mahayana Buddhist / Prajnaparamita",
  language: "English",
  translator: "William Gemmell",
  license: "Public domain in the USA",
  public_domain: true,
  source_url: SOURCE_URL,
  text_type: "mahayana_sutra",
};

const REQUIRED_BOOK_COLUMNS = ["title", "description", "content"];
const REQUIRED_CHAPTER_COLUMNS = ["book_id", "title", "chapter_number"];
const REQUIRED_VERSE_COLUMNS = ["chapter_id", "verse_number", "content"];

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required for the Diamond Sutra import script.`);
  }

  return value;
}

const parseOnly = process.env.DIAMOND_SUTRA_PARSE_ONLY === "1";
const debug = process.env.DIAMOND_SUTRA_DEBUG === "1";
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
    hellip: "...",
    lt: "<",
    mdash: "-",
    nbsp: " ",
    ndash: "-",
    quot: '"',
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
      .replace(/<sup[\s\S]*?<\/sup>/gi, "")
      .replace(/<a[^>]+class=["']fnanchor["'][\s\S]*?<\/a>/gi, "")
      .replace(/<img[^>]*>/gi, "")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  );
}

async function downloadHtml() {
  const { data } = await axios.get(HTML_URL, {
    responseType: "text",
    timeout: 30000,
    headers: {
      "User-Agent": "RELIGIOUS/1.1 Diamond Sutra importer",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  return data;
}

function extractSutraBody(html) {
  const startMatch = html.match(/<h2>\s*THE DIAMOND SUTRA\s*<\/h2>/i);
  const endIndex = html.search(/\*\*\* END OF THE PROJECT GUTENBERG EBOOK/i);

  if (!startMatch || startMatch.index === undefined) {
    throw new Error("Could not find the start of the Diamond Sutra body.");
  }

  if (endIndex === -1 || endIndex <= startMatch.index) {
    throw new Error("Could not find the end of the Diamond Sutra body.");
  }

  return html.slice(startMatch.index, endIndex);
}

function parseSectionTitle(label) {
  return cleanText(label);
}

function parsePassages(sectionHtml) {
  const beforeFootnotes = sectionHtml.split(/<div[^>]+class=["']footnote["'][^>]*>/i)[0];
  const paragraphMatches = [
    ...beforeFootnotes.matchAll(/<p(?:\s+[^>]*)?>([\s\S]*?)<\/p>/gi),
  ];
  const passages = [];

  for (const match of paragraphMatches) {
    const paragraphHtml = match[1];
    const content = stripHtml(paragraphHtml);

    if (!content) continue;
    if (/^\[Chapter/i.test(content)) continue;
    if (content.length < 2) continue;

    passages.push({
      number: passages.length + 1,
      content,
    });
  }

  return passages;
}

function parseDiamondSutra(html) {
  const body = extractSutraBody(html);
  const sectionPattern =
    /<p\s+id=["']Ch_(\d+(?:_\d+)?)["']\s+class=["']chapter["']>\s*\[(Chapter(?:s)?\s+[^\]]+)\]\s*<\/p>/gi;
  const matches = [...body.matchAll(sectionPattern)];

  if (matches.length !== EXPECTED_SECTIONS) {
    throw new Error(
      `Expected ${EXPECTED_SECTIONS} Diamond Sutra sections, parsed ${matches.length}.`
    );
  }

  const sections = matches.map((match, index) => {
    const next = matches[index + 1];
    const sectionStart = match.index + match[0].length;
    const sectionEnd = next ? next.index : body.length;
    const label = parseSectionTitle(match[2]);
    const passages = parsePassages(body.slice(sectionStart, sectionEnd));

    return {
      number: index + 1,
      sourceId: match[1],
      displayTitle: label,
      verses: passages,
    };
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
  console.log(
    `Selected section titles: ${sections.map((section) => section.displayTitle).join(", ")}`
  );

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

  if (sections.length !== EXPECTED_SECTIONS) {
    throw new Error(
      `Expected ${EXPECTED_SECTIONS} Diamond Sutra sections, parsed ${sections.length}.`
    );
  }

  const sectionNumberSet = new Set(sections.map((section) => section.number));
  for (let number = 1; number <= EXPECTED_SECTIONS; number += 1) {
    if (!sectionNumberSet.has(number)) {
      throw new Error(`Missing Diamond Sutra section ${number}.`);
    }
  }

  if (sectionNumberSet.size !== EXPECTED_SECTIONS) {
    throw new Error("Duplicate Diamond Sutra section number detected.");
  }

  for (const section of sections) {
    if (!section.verses.length) {
      throw new Error(`Parsed ${section.displayTitle} with no passages.`);
    }
  }

  if (passageCount < MIN_EXPECTED_PASSAGES) {
    throw new Error(
      `Parsed only ${passageCount} Diamond Sutra passages; expected at least ${MIN_EXPECTED_PASSAGES}.`
    );
  }

  if (passageCount > MAX_EXPECTED_PASSAGES) {
    throw new Error(
      `Parsed ${passageCount} Diamond Sutra passages; expected no more than ${MAX_EXPECTED_PASSAGES}. Parser may be too broad.`
    );
  }

  const forbidden = /Project Gutenberg|START OF THE PROJECT|END OF THE PROJECT|Preface|Introduction|Transcriber|License|Full Project Gutenberg|Footnote|Chinese Annotation|Handbook of Chinese Buddhism|Kin-Kong-King/i;
  for (const section of sections) {
    for (const passage of section.verses) {
      if (forbidden.test(passage.content)) {
        throw new Error(
          `Detected notes/commentary/license text in ${section.displayTitle}, passage ${passage.number}.`
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

async function importSection(bookId, parsedSection) {
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
      title: "The Diamond Sutra",
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
      ? "Starting Diamond Sutra parse-only validation..."
      : "Starting Diamond Sutra import..."
  );
  console.log(`Downloading source: ${HTML_URL}`);

  const html = await downloadHtml();
  const parsedSections = parseDiamondSutra(html);
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
      const result = await importSection(book.id, parsedSection);
      summary.passagesInserted += result.versesInserted;

      if (result.skipped) {
        summary.sectionsSkipped += 1;
        console.log(`Skipped ${parsedSection.displayTitle}`);
      } else {
        summary.sectionsInserted += 1;
        console.log(`Inserted ${parsedSection.displayTitle}`);
      }
    } catch (error) {
      summary.errors += 1;
      console.error(`${parsedSection.displayTitle} failed:`);
      console.error(error);
    }
  }

  console.log("DONE! Diamond Sutra import completed.");
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
