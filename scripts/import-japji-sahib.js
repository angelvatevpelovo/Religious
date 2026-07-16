require("dotenv").config({ path: ".env.local" });

const { createClient } = require("@supabase/supabase-js");
const axios = require("axios");

const SOURCE_URL = "https://sacred-texts.com/skh/tsr1/tsr121.htm";
const READER_URL = "https://r.jina.ai/http://https://sacred-texts.com/skh/tsr1/tsr121.htm";
const EXPECTED_PAURIS = 38;
const MIN_EXPECTED_PASSAGES = 40;
const MAX_EXPECTED_PASSAGES = 60;
const BOOK_METADATA = {
  title: "Japji Sahib: Macauliffe Translation",
  description:
    "A Sikh morning prayer and foundational composition attributed to Guru Nanak, translated into English by Max Arthur MacAuliffe.",
  religion: "Sikhism",
  tradition: "Sikh / Guru Nanak",
  language: "English",
  translator: "Max Arthur MacAuliffe",
  license: "Public domain in the USA",
  public_domain: true,
  source_url: SOURCE_URL,
  text_type: "sikh_prayer",
};

const REQUIRED_BOOK_COLUMNS = ["title", "description", "content"];
const REQUIRED_CHAPTER_COLUMNS = ["book_id", "title", "chapter_number"];
const REQUIRED_VERSE_COLUMNS = ["chapter_id", "verse_number", "content"];

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required for the Japji Sahib import script.`);
  }

  return value;
}

const parseOnly = process.env.JAPJI_PARSE_ONLY === "1";
const debug = process.env.JAPJI_DEBUG === "1";
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
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/\u00a0/g, " ")
    .replace(/_/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function htmlToText(html) {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|h1|h2|h3|h4|li)>/gi, "\n")
      .replace(/<h([1-4])[^>]*>/gi, "\n### ")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function downloadText(url) {
  const { data } = await axios.get(url, {
    responseType: "text",
    timeout: 30000,
    headers: {
      "User-Agent": "RELIGIOUS/1.1 Japji Sahib importer",
      Accept: "text/html,text/markdown,text/plain,*/*;q=0.8",
    },
  });

  return data;
}

async function downloadSource() {
  try {
    console.log(`Downloading Sacred Texts source: ${SOURCE_URL}`);
    const direct = await downloadText(SOURCE_URL);

    if (/THE JAPJI/i.test(direct) && /###\s+XXXVIII/i.test(direct) && /SLOK/i.test(direct) && !/Enable JavaScript and cookies/i.test(direct)) {
      return {
        text: direct,
        source: "sacred-texts",
      };
    }

    console.warn("Warning: direct Sacred Texts response was blocked or not parser-ready; using reader fallback.");
  } catch (error) {
    console.warn(
      `Warning: direct Sacred Texts download unavailable (${error.response?.status || error.message}); using reader fallback.`
    );
  }

  console.log(`Downloading reader fallback: ${READER_URL}`);
  return {
    text: await downloadText(READER_URL),
    source: "reader-fallback",
  };
}

function normalizeSourceToLines(rawText) {
  const text = /<html|<body|<p|<h\d/i.test(rawText) ? htmlToText(rawText) : rawText;

  return text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => cleanText(line))
    .filter(Boolean);
}

function stripInlineNoise(line) {
  return cleanText(
    line
      .replace(/\[[0-9]+\]/g, "")
      .replace(/\{p\.\s*\d+\}/gi, "")
      .replace(/\{footnote\s+p\.\s*\d+\}/gi, "")
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
  );
}

function removeFootnotesAndNavigation(lines) {
  const cleaned = [];
  let inFootnote = false;

  for (const rawLine of lines) {
    if (inFootnote && (/^\s*\{p\.\s*\d+\}/i.test(rawLine) || /^\s*###\s+/i.test(rawLine) || /^\s*SLOK\s*$/i.test(rawLine))) {
      inFootnote = false;
    }

    const line = stripInlineNoise(rawLine);

    if (!line) continue;
    if (/^Title:|^URL Source:|^Published Time:|^Markdown Content:/i.test(line)) continue;
    if (/^Sacred Texts\s*Sikhism\s*Index\s*Previous\s*Next$/i.test(line)) continue;
    if (/^\* \* \*$/.test(line)) continue;
    if (/^Next:|^Previous:|^Index$|^Sikhism$|^Sacred Texts$/i.test(line)) continue;

    if (/^\[\d+\./.test(line)) {
      inFootnote = !/\]$/.test(line);
      continue;
    }

    if (inFootnote) {
      if (/\]$/.test(line)) inFootnote = false;
      continue;
    }

    if (/^\d+\./.test(line)) continue;
    if (/^Also translated/i.test(line)) continue;
    if (/^\([a-z]\)/i.test(line)) continue;

    cleaned.push(line);
  }

  return cleaned;
}

function romanToNumber(value) {
  const numerals = {
    I: 1,
    V: 5,
    X: 10,
    L: 50,
  };
  let total = 0;
  let previous = 0;

  for (const character of value.toUpperCase().split("").reverse()) {
    const current = numerals[character];
    if (!current) throw new Error(`Invalid Japji Roman section: ${value}`);

    if (current < previous) {
      total -= current;
    } else {
      total += current;
      previous = current;
    }
  }

  return total;
}

function makeSection(number, displayTitle, lines) {
  const content = cleanText(
    lines
      .map(stripInlineNoise)
      .filter(Boolean)
      .filter((line) => !/^##?\s+/i.test(line))
      .filter((line) => !/^\d+\./.test(line))
      .filter((line) => !/^Also translated/i.test(line))
      .join(" ")
  );
  const verses = content
    ? [
        {
          number: 1,
          content,
        },
      ]
    : [];

  return {
    number,
    displayTitle,
    verses,
  };
}

function parseJapji(rawText) {
  const lines = removeFootnotesAndNavigation(normalizeSourceToLines(rawText));
  const startIndex = lines.findIndex((line) => /THE JAPJI/i.test(line));
  const endIndex = lines.findIndex((line) => /Next:\s*Asa Ki War|Asa Ki War/i.test(line));

  if (startIndex === -1) {
    throw new Error("Could not find THE JAPJI heading.");
  }

  const bodyLines = lines.slice(startIndex + 1, endIndex > startIndex ? endIndex : lines.length);
  const sections = [];
  let currentTitle = "Opening";
  let currentNumber = 1;
  let currentLines = [];
  let pauriCount = 0;
  let finalSalokDetected = false;

  function finishSection() {
    if (!currentTitle) return;
    const section = makeSection(currentNumber, currentTitle, currentLines);
    if (section.verses.length) sections.push(section);
    currentLines = [];
  }

  for (const rawLine of bodyLines) {
    const line = stripInlineNoise(rawLine);
    if (!line) continue;

    const pauriMatch = line.match(/^###\s+([IVXLCDM]+)\.?(?:\[\d+\])?$/i) || line.match(/^([IVXLCDM]+)\.?(?:\[\d+\])?$/i);
    if (pauriMatch) {
      finishSection();

      const pauriNumber = romanToNumber(pauriMatch[1]);
      if (pauriNumber < 1 || pauriNumber > EXPECTED_PAURIS) {
        throw new Error(`Unexpected Japji pauri number: ${pauriNumber}.`);
      }

      currentNumber = pauriNumber + 1;
      currentTitle = `Pauri ${pauriNumber}`;
      pauriCount += 1;
      continue;
    }

    if (currentTitle === "Pauri 26" && /^That God is ever true/i.test(line)) {
      finishSection();
      currentNumber = 28;
      currentTitle = "Pauri 27";
      pauriCount += 1;
      currentLines.push(line);
      continue;
    }

    if (/^SLOK$/i.test(line)) {
      finishSection();
      currentNumber = EXPECTED_PAURIS + 2;
      currentTitle = "Final Salok";
      finalSalokDetected = true;
      continue;
    }

    if (/^##\s+DIVINE SERVICES/i.test(line)) continue;
    if (/^##\s+THE JAPJI/i.test(line)) continue;

    currentLines.push(line);
  }

  finishSection();
  validateParsedSections(sections, pauriCount, finalSalokDetected);

  return sections;
}

function printParseSummary(sections) {
  const passageCount = sections.reduce(
    (total, section) => total + section.verses.length,
    0
  );
  const pauriCount = sections.filter((section) => /^Pauri\s+\d+$/i.test(section.displayTitle)).length;
  const finalSalokDetected = sections.some((section) => section.displayTitle === "Final Salok");

  console.log(`Parsed section count: ${sections.length}`);
  console.log(`Parsed passage row count: ${passageCount}`);
  console.log(`Detected pauris: ${pauriCount}`);
  console.log(`Final Salok detected: ${finalSalokDetected ? "yes" : "no"}`);

  if (!debug) return;

  for (const section of sections) {
    console.log(
      `Section ${section.number}: ${section.displayTitle} (${section.verses.length} passages)`
    );
  }
}

function validateParsedSections(sections, pauriCount, finalSalokDetected) {
  const passageCount = sections.reduce(
    (total, section) => total + section.verses.length,
    0
  );

  if (!sections.some((section) => section.displayTitle === "Opening")) {
    throw new Error("Missing Japji opening section.");
  }

  if (pauriCount !== EXPECTED_PAURIS) {
    throw new Error(`Expected ${EXPECTED_PAURIS} Japji pauris, detected ${pauriCount}.`);
  }

  if (!finalSalokDetected) {
    throw new Error("Final Salok was not detected.");
  }

  for (let number = 1; number <= EXPECTED_PAURIS; number += 1) {
    if (!sections.some((section) => section.displayTitle === `Pauri ${number}`)) {
      throw new Error(`Missing Japji Pauri ${number}.`);
    }
  }

  for (const section of sections) {
    if (!section.verses.length) {
      throw new Error(`Parsed ${section.displayTitle} with no passages.`);
    }
  }

  if (passageCount < MIN_EXPECTED_PASSAGES) {
    throw new Error(`Parsed only ${passageCount} Japji passages; expected at least ${MIN_EXPECTED_PASSAGES}.`);
  }

  if (passageCount > MAX_EXPECTED_PASSAGES) {
    throw new Error(`Parsed ${passageCount} Japji passages; expected no more than ${MAX_EXPECTED_PASSAGES}. Parser may be too broad.`);
  }

  const forbidden = /Sacred Texts Archive|Internet Sacred Text|Next:|Previous:|Asa Ki War|Rahiras|Sohila|footnote|URL Source|Published Time/i;
  for (const section of sections) {
    for (const passage of section.verses) {
      if (forbidden.test(passage.content)) {
        throw new Error(`Detected navigation/footnote/other text in ${section.displayTitle}, passage ${passage.number}.`);
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

  console.warn(`Warning: ${table} metadata columns are missing. Inserted required columns only.`);

  return fallbackData;
}

async function insertManyWithFallback(table, rows, requiredColumns, size = 500) {
  for (let index = 0; index < rows.length; index += size) {
    const chunk = rows.slice(index, index + size);
    const { error } = await supabase.from(table).insert(chunk);

    if (!error) continue;
    if (!isMissingColumnError(error)) throw error;

    const fallbackChunk = chunk.map((row) => keepKeys(row, requiredColumns));
    const { error: fallbackError } = await supabase.from(table).insert(fallbackChunk);

    if (fallbackError) throw fallbackError;

    console.warn(`Warning: ${table} metadata columns are missing. Inserted required columns only.`);
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
    return { book: existingBook, created: false };
  }

  const book = await insertSingleWithFallback(
    "holy_books",
    { ...BOOK_METADATA, content: null },
    REQUIRED_BOOK_COLUMNS
  );

  return { book, created: true };
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
      return { skipped: true, versesInserted: 0 };
    }

    const verses = buildVerses(existingChapter.id, parsedSection.verses);
    await insertManyWithFallback("verses", verses, REQUIRED_VERSE_COLUMNS);

    return { skipped: true, versesInserted: verses.length };
  }

  const chapter = await insertSingleWithFallback(
    "chapters",
    {
      book_id: bookId,
      title: "Japji Sahib",
      chapter_number: parsedSection.number,
      section_label: "Section",
      display_title: parsedSection.displayTitle,
      sort_order: parsedSection.number,
    },
    REQUIRED_CHAPTER_COLUMNS
  );

  const verses = buildVerses(chapter.id, parsedSection.verses);
  await insertManyWithFallback("verses", verses, REQUIRED_VERSE_COLUMNS);

  return { skipped: false, versesInserted: verses.length };
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

  console.log(parseOnly ? "Starting Japji Sahib parse-only validation..." : "Starting Japji Sahib import...");

  const { text, source } = await downloadSource();
  console.log(`Using source mode: ${source}`);

  const parsedSections = parseJapji(text);
  printParseSummary(parsedSections);

  if (parseOnly) {
    console.log("Parse-only mode enabled. No Supabase connection or import was attempted.");
    return;
  }

  const { book, created } = await getOrCreateBook();
  summary.bookCreated = created;
  summary.bookReused = !created;

  console.log(`${created ? "Created" : "Reused"} holy_books record: ${book.title} (${book.id})`);

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

  console.log("DONE! Japji Sahib import completed.");
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
