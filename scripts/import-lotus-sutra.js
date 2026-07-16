require("dotenv").config({ path: ".env.local" });

const { createClient } = require("@supabase/supabase-js");
const axios = require("axios");

const INDEX_URL = "https://sacred-texts.com/bud/lotus/index.htm";
const BASE_URL = "https://sacred-texts.com/bud/lotus/";
const EXPECTED_CHAPTERS = 27;
const MIN_EXPECTED_PASSAGES = 1200;
const MAX_EXPECTED_PASSAGES = 2200;
const BOOK_METADATA = {
  title: "The Lotus Sutra: H. Kern Translation",
  description:
    "A major Mahayana Buddhist scripture, known as the Saddharma-Pundarika or Lotus of the True Law, translated into English by H. Kern.",
  religion: "Buddhism",
  tradition: "Mahayana Buddhist / Lotus Sutra",
  language: "English",
  translator: "H. Kern",
  license: "Public domain in the USA",
  public_domain: true,
  source_url: INDEX_URL,
  text_type: "mahayana_sutra",
};

const REQUIRED_BOOK_COLUMNS = ["title", "description", "content"];
const REQUIRED_CHAPTER_COLUMNS = ["book_id", "title", "chapter_number"];
const REQUIRED_VERSE_COLUMNS = ["chapter_id", "verse_number", "content"];

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required for the Lotus Sutra import script.`);
  }

  return value;
}

const parseOnly = process.env.LOTUS_SUTRA_PARSE_ONLY === "1";
const debug = process.env.LOTUS_SUTRA_DEBUG === "1";
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

const REQUEST_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: INDEX_URL,
};

function decodeHtmlEntities(value) {
  const namedEntities = {
    AElig: "AE",
    aelig: "ae",
    amp: "&",
    apos: "'",
    Acirc: "A",
    acirc: "a",
    Ecirc: "E",
    ecirc: "e",
    Icirc: "I",
    icirc: "i",
    Ocirc: "O",
    ocirc: "o",
    Ucirc: "U",
    ucirc: "u",
    Ccedil: "C",
    ccedil: "c",
    eacute: "e",
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
    .replace(/&([a-zA-Z]+);/g, (match, name) => namedEntities[name] ?? match);
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
      throw new Error(`Invalid Roman numeral in Lotus Sutra text: ${value}`);
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

function stripHtml(value) {
  return cleanText(
    value
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
      .replace(/<sup[\s\S]*?<\/sup>/gi, "")
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

function parseIndexLinks(html) {
  const linkPattern = /href=["'](lot(\d{2})\.htm)["'][^>]*>\s*Chapter\s+(\d+)\s*<\/a>/gi;
  const linksByNumber = new Map();
  let match;

  while ((match = linkPattern.exec(html)) !== null) {
    const file = match[1];
    const fileNumber = Number(match[2]);
    const chapterNumber = Number(match[3]);

    if (!Number.isInteger(chapterNumber) || chapterNumber < 1) continue;
    if (fileNumber !== chapterNumber) continue;
    if (chapterNumber > EXPECTED_CHAPTERS) continue;

    linksByNumber.set(chapterNumber, {
      number: chapterNumber,
      url: `${BASE_URL}${file}`,
    });
  }

  const links = [...linksByNumber.values()].sort(
    (first, second) => first.number - second.number
  );

  if (links.length !== EXPECTED_CHAPTERS) {
    throw new Error(
      `Expected ${EXPECTED_CHAPTERS} Lotus Sutra chapter links, found ${links.length}.`
    );
  }

  return links;
}

function extractMainHtml(html, chapterNumber) {
  const h1Matches = [...html.matchAll(/<H1[^>]*>([\s\S]*?)<\/H1>/gi)];
  const chapterHeadingIndex = h1Matches.findIndex((match) =>
    /^CHAPTER\s+[IVXLCDM]+\.?$/i.test(stripHtml(match[1]))
  );

  if (chapterHeadingIndex === -1) {
    throw new Error(`Could not find Lotus Sutra chapter heading for chapter ${chapterNumber}.`);
  }

  const start = h1Matches[chapterHeadingIndex].index;
  const navIndex = html.search(/<nav\s+role=["']navigation["']/i);
  const oldNavIndex = html.search(/<A\s+HREF=["']lot\d{2}\.htm["'][^>]*>\s*(Next|Previous):/i);
  const endCandidates = [navIndex, oldNavIndex].filter((index) => index > start);
  const end = endCandidates.length ? Math.min(...endCandidates) : html.length;

  return html.slice(start, end);
}

function parseChapterHtml(html, expectedNumber) {
  const mainHtml = extractMainHtml(html, expectedNumber);
  const h1Matches = [...mainHtml.matchAll(/<H1[^>]*>([\s\S]*?)<\/H1>/gi)];
  const chapterHeading = h1Matches.find((match) =>
    /^CHAPTER\s+[IVXLCDM]+\.?$/i.test(stripHtml(match[1]))
  );

  if (!chapterHeading) {
    throw new Error(`Could not parse Lotus Sutra chapter heading for ${expectedNumber}.`);
  }

  const chapterHeadingText = stripHtml(chapterHeading[1]);
  const romanMatch = chapterHeadingText.match(/^CHAPTER\s+([IVXLCDM]+)\.?$/i);
  const chapterNumber = romanToNumber(romanMatch[1]);

  if (chapterNumber !== expectedNumber) {
    throw new Error(
      `Expected Lotus Sutra chapter ${expectedNumber}, parsed chapter ${chapterNumber}.`
    );
  }

  const titleHeading = h1Matches
    .map((match) => stripHtml(match[1]))
    .find((heading) => !/^CHAPTER\s+[IVXLCDM]+\.?$/i.test(heading));
  const centeredTitleMatch = mainHtml.match(/<P\s+ALIGN=["']CENTER["'][^>]*>([\s\S]*?)<\/P>/i);
  const title = cleanText(titleHeading || (centeredTitleMatch ? stripHtml(centeredTitleMatch[1]) : ""));
  const displayTitle = title
    ? `Chapter ${chapterNumber} - ${title.replace(/\.$/, "")}`
    : `Chapter ${chapterNumber}`;
  const paragraphMatches = [
    ...mainHtml.matchAll(/<P(?:\s+[^>]*)?>([\s\S]*?)<\/P>/gi),
  ];
  const passages = [];

  for (const match of paragraphMatches) {
    const content = stripHtml(match[1]);

    if (!content) continue;
    if (/^Sacred Texts|^Buddhism$|^Index$|^Next:?|^Previous:?/i.test(content)) continue;
    if (title && content.replace(/\.$/, "").toLowerCase() === title.replace(/\.$/, "").toLowerCase()) continue;
    if (content.length < 2) continue;

    passages.push({
      number: passages.length + 1,
      content,
    });
  }

  if (!passages.length) {
    throw new Error(`Parsed ${displayTitle} with no passages.`);
  }

  return {
    number: chapterNumber,
    displayTitle,
    verses: passages,
  };
}

async function parseLotusSutra() {
  console.log(`Using canonical Lotus Sutra chapter list from: ${INDEX_URL}`);
  const links = Array.from({ length: EXPECTED_CHAPTERS }, (_, index) => {
    const number = index + 1;
    return {
      number,
      url: `${BASE_URL}lot${String(number).padStart(2, "0")}.htm`,
    };
  });
  const chapters = [];

  for (const link of links) {
    console.log(`Parsing Lotus Sutra chapter ${link.number}: ${link.url}`);
    const html = await downloadHtml(link.url);
    chapters.push(parseChapterHtml(html, link.number));
  }

  validateParsedChapters(chapters);

  return chapters;
}

function printParseSummary(chapters) {
  const passageCount = chapters.reduce(
    (total, chapter) => total + chapter.verses.length,
    0
  );

  console.log(`Parsed chapter count: ${chapters.length}`);
  console.log(`Parsed passage row count: ${passageCount}`);
  console.log(
    `Selected chapter titles: ${chapters.map((chapter) => chapter.displayTitle).join(", ")}`
  );

  if (!debug) return;

  for (const chapter of chapters) {
    console.log(
      `Chapter ${chapter.number}: ${chapter.displayTitle} (${chapter.verses.length} passages)`
    );
  }
}

function validateParsedChapters(chapters) {
  const passageCount = chapters.reduce(
    (total, chapter) => total + chapter.verses.length,
    0
  );

  if (chapters.length !== EXPECTED_CHAPTERS) {
    throw new Error(
      `Expected ${EXPECTED_CHAPTERS} Lotus Sutra chapters, parsed ${chapters.length}.`
    );
  }

  const chapterNumberSet = new Set(chapters.map((chapter) => chapter.number));
  for (let number = 1; number <= EXPECTED_CHAPTERS; number += 1) {
    if (!chapterNumberSet.has(number)) {
      throw new Error(`Missing Lotus Sutra chapter ${number}.`);
    }
  }

  if (chapterNumberSet.size !== EXPECTED_CHAPTERS) {
    throw new Error("Duplicate Lotus Sutra chapter number detected.");
  }

  for (const chapter of chapters) {
    if (!chapter.verses.length) {
      throw new Error(`Parsed ${chapter.displayTitle} with no passages.`);
    }
  }

  if (passageCount < MIN_EXPECTED_PASSAGES) {
    throw new Error(
      `Parsed only ${passageCount} Lotus Sutra passages; expected at least ${MIN_EXPECTED_PASSAGES}.`
    );
  }

  if (passageCount > MAX_EXPECTED_PASSAGES) {
    throw new Error(
      `Parsed ${passageCount} Lotus Sutra passages; expected no more than ${MAX_EXPECTED_PASSAGES}. Parser may be too broad.`
    );
  }

  const forbidden = /Sacred Texts|Internet Sacred Text Archive|Google tag|Cloudflare|cf_chl|challenge-platform|Page navigation|Previous:|Next:|Full Project Gutenberg|license|copyright/i;
  for (const chapter of chapters) {
    for (const passage of chapter.verses) {
      const forbiddenMatch = passage.content.match(forbidden);
      if (forbiddenMatch) {
        throw new Error(
          `Detected navigation/footer/source text (${forbiddenMatch[0]}) in ${chapter.displayTitle}, passage ${passage.number}: ${passage.content.slice(0, 160)}`
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
      title: "The Lotus Sutra",
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
    passagesInserted: 0,
    errors: 0,
  };

  console.log(
    parseOnly
      ? "Starting Lotus Sutra parse-only validation..."
      : "Starting Lotus Sutra import..."
  );

  const parsedChapters = await parseLotusSutra();
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
      summary.passagesInserted += result.versesInserted;

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

  console.log("DONE! Lotus Sutra import completed.");
  console.log("Import summary:");
  console.log(`Book created: ${summary.bookCreated ? "yes" : "no"}`);
  console.log(`Book reused: ${summary.bookReused ? "yes" : "no"}`);
  console.log(`Chapters inserted: ${summary.chaptersInserted}`);
  console.log(`Chapters skipped: ${summary.chaptersSkipped}`);
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
