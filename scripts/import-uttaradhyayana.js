require("dotenv").config({ path: ".env.local" });

const { createClient } = require("@supabase/supabase-js");
const axios = require("axios");

const SACRED_TEXTS_INDEX_URL = "https://www.sacred-texts.com/jai/sbe45/index.htm";
const WISDOMLIB_INDEX_URL = "https://www.wisdomlib.org/jainism/book/uttaradhyayana-sutra";
const WISDOMLIB_BASE_URL = "https://www.wisdomlib.org";
const EXPECTED_LECTURES = 36;
const MIN_EXPECTED_PASSAGES = 300;
const MAX_EXPECTED_PASSAGES = 1200;
const BOOK_METADATA = {
  title: "Uttaradhyayana Sutra",
  description:
    "A Jain sacred text from the Svetambara tradition, traditionally counted among the Mulasutras, translated into English by Hermann Jacobi.",
  religion: "Jainism",
  tradition: "Svetambara Jain / Mulasutra",
  language: "English",
  translator: "Hermann Jacobi",
  license: "Public domain in the USA",
  public_domain: true,
  source_url: SACRED_TEXTS_INDEX_URL,
  text_type: "jain_sutra",
};

const REQUIRED_BOOK_COLUMNS = ["title", "description", "content"];
const REQUIRED_CHAPTER_COLUMNS = ["book_id", "title", "chapter_number"];
const REQUIRED_VERSE_COLUMNS = ["chapter_id", "verse_number", "content"];

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required for the Uttaradhyayana import script.`);
  }

  return value;
}

const parseOnly = process.env.UTTARADHYAYANA_PARSE_ONLY === "1";
const debug = process.env.UTTARADHYAYANA_DEBUG === "1";
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
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
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

function htmlToText(html) {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<sup[\s\S]*?<\/sup>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|h1|h2|h3|h4|h5|li|blockquote)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function downloadText(url) {
  const { data } = await axios.get(url, {
    responseType: "text",
    timeout: 30000,
    headers: {
      "User-Agent": "RELIGIOUS/1.1 Uttaradhyayana importer",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  return data;
}

function parseSacredTextsLectureLinks(html) {
  const linkPattern = /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]*Lecture[^<]*)<\/a>/gi;
  const links = [];
  let match;

  while ((match = linkPattern.exec(html)) !== null) {
    const label = cleanText(decodeHtmlEntities(match[2]));
    if (!/Lecture/i.test(label)) continue;
    if (/Book\s+\d/i.test(label)) break;

    const number = links.length + 1;
    if (number > EXPECTED_LECTURES) break;

    links.push({
      number,
      title: label.replace(/\.$/, ""),
      url: new URL(match[1], SACRED_TEXTS_INDEX_URL).toString(),
      source: "sacred-texts",
    });
  }

  return links;
}

function parseWisdomLibLectureLinks(html) {
  const linkPattern = /<a[^>]+href=["']([^"']+)["'][^>]*>\s*Chapter\s+(\d+)\s+-\s*([\s\S]*?)<\/a>/gi;
  const links = [];
  let match;

  while ((match = linkPattern.exec(html)) !== null) {
    const number = Number(match[2]);
    if (!Number.isInteger(number) || number < 1 || number > EXPECTED_LECTURES) {
      continue;
    }

    links.push({
      number,
      title: `${ordinal(number)} Lecture. ${cleanText(htmlToText(match[3]))}`,
      url: new URL(match[1], WISDOMLIB_BASE_URL).toString(),
      source: "wisdomlib",
    });
  }

  return links.sort((first, second) => first.number - second.number);
}

function ordinal(number) {
  const words = [
    "",
    "First",
    "Second",
    "Third",
    "Fourth",
    "Fifth",
    "Sixth",
    "Seventh",
    "Eighth",
    "Ninth",
    "Tenth",
    "Eleventh",
    "Twelfth",
    "Thirteenth",
    "Fourteenth",
    "Fifteenth",
    "Sixteenth",
    "Seventeenth",
    "Eighteenth",
    "Nineteenth",
    "Twentieth",
    "Twenty-First",
    "Twenty-Second",
    "Twenty-Third",
    "Twenty-Fourth",
    "Twenty-Fifth",
    "Twenty-Sixth",
    "Twenty-Seventh",
    "Twenty-Eighth",
    "Twenty-Ninth",
    "Thirtieth",
    "Thirty-First",
    "Thirty-Second",
    "Thirty-Third",
    "Thirty-Fourth",
    "Thirty-Fifth",
    "Thirty-Sixth",
  ];

  return words[number] || `Lecture ${number}`;
}

function removeNoiseLines(lines) {
  return lines.filter((line) => {
    if (!line) return false;
    if (/^(Home|About|Contact|Newsletter|Shop|Links|TOOLS)$/i.test(line)) return false;
    if (/^(Resources|Comments|Last Updated|Like what you read|Let's grow together)/i.test(line)) return false;
    if (/^(Buy now|Source \d|Summary:|Alternative titles include)/i.test(line)) return false;
    if (/^(Next:|Previous:|Index|Contents|Start Reading|Sacred Texts|Jainism)$/i.test(line)) return false;
    if (/^(Become a Patreon|Buy me a Coffee|Liberapay|Why\?|Read more)/i.test(line)) return false;
    if (/copyright|privacy policy|support me on patreon/i.test(line)) return false;
    return true;
  });
}

function extractWisdomLibMainText(html, title) {
  const text = htmlToText(html);
  const titleParts = title.split(".").map((part) => cleanText(part)).filter(Boolean);
  const startCandidates = ["Next >", ...titleParts.filter((part) => part.length > 8)];
  let startIndex = -1;

  for (const candidate of startCandidates) {
    const index = text.toLowerCase().indexOf(candidate.toLowerCase());
    if (index !== -1) {
      startIndex = index + candidate.length;
    }
  }

  if (startIndex === -1) startIndex = 0;

  const endMarkers = [
    "Footnotes and references:",
    "Article published on",
    "Last Updated:",
    "Comments:",
  ];
  let endIndex = text.length;

  for (const marker of endMarkers) {
    const index = text.indexOf(marker, startIndex);
    if (index !== -1 && index < endIndex) endIndex = index;
  }

  const body = cleanText(text.slice(startIndex, endIndex));

  return body
    .split(/(?=\(\d+\)\s+)/g)
    .map((part) => cleanText(part.replace(/^\((\d+)\)\s*/, "")))
    .filter(Boolean);
}

function extractSacredTextsMainText(html) {
  const text = htmlToText(html);
  const lines = removeNoiseLines(
    text
      .split("\n")
      .map((line) => cleanText(line))
      .filter(Boolean)
  );
  const startIndex = lines.findIndex((line) => /Lecture/i.test(line));
  const stopIndex = lines.findIndex((line, index) =>
    index > startIndex && /^(Next:|Previous:|Sacred Texts|Index|Footnotes)/i.test(line)
  );

  return lines.slice(startIndex === -1 ? 0 : startIndex + 1, stopIndex === -1 ? lines.length : stopIndex);
}

function splitPassages(lines) {
  const passages = [];
  let buffer = [];

  function flush() {
    const content = cleanText(buffer.join(" "));
    buffer = [];

    if (!content) return;
    if (content.length < 3) return;

    passages.push({
      number: passages.length + 1,
      content,
    });
  }

  for (const line of lines) {
    if (/^\d+[.)]\s+/.test(line)) {
      flush();
      buffer.push(line.replace(/^\d+[.)]\s+/, ""));
      continue;
    }

    if (/^[IVXLCDM]+[.)]\s+/.test(line)) {
      flush();
      buffer.push(line.replace(/^[IVXLCDM]+[.)]\s+/, ""));
      continue;
    }

    if (line.length < 120 && /[.:;!?]$/.test(line) && buffer.length > 0) {
      buffer.push(line);
      flush();
      continue;
    }

    if (buffer.length > 0 && line.length > 140) {
      flush();
    }

    buffer.push(line);
  }

  flush();

  return passages;
}

async function getLectureLinks() {
  try {
    console.log(`Downloading Sacred Texts index: ${SACRED_TEXTS_INDEX_URL}`);
    const sacredHtml = await downloadText(SACRED_TEXTS_INDEX_URL);
    const sacredLinks = parseSacredTextsLectureLinks(sacredHtml);
    if (sacredLinks.length === EXPECTED_LECTURES) return sacredLinks;
    console.warn(
      `Warning: Sacred Texts returned ${sacredLinks.length} lecture links; falling back to Wisdom Library mirror.`
    );
  } catch (error) {
    console.warn(
      `Warning: Sacred Texts index unavailable (${error.response?.status || error.message}); falling back to Wisdom Library mirror.`
    );
  }

  console.log(`Downloading Wisdom Library index: ${WISDOMLIB_INDEX_URL}`);
  const wisdomHtml = await downloadText(WISDOMLIB_INDEX_URL);
  const wisdomLinks = parseWisdomLibLectureLinks(wisdomHtml);

  if (wisdomLinks.length !== EXPECTED_LECTURES) {
    throw new Error(
      `Expected ${EXPECTED_LECTURES} Uttaradhyayana lecture links, found ${wisdomLinks.length}.`
    );
  }

  return wisdomLinks;
}

async function parseLecture(link) {
  const html = await downloadText(link.url);
  const lines = link.source === "sacred-texts"
    ? extractSacredTextsMainText(html)
    : extractWisdomLibMainText(html, link.title);
  const verses = splitPassages(lines);

  return {
    number: link.number,
    displayTitle: link.title,
    source: link.source,
    verses,
  };
}

async function parseUttaradhyayana() {
  const links = await getLectureLinks();
  const sections = [];

  for (const link of links) {
    console.log(`Parsing lecture ${link.number}: ${link.title}`);
    sections.push(await parseLecture(link));
  }

  validateParsedSections(sections);

  return sections;
}

function printParseSummary(sections) {
  const passageCount = sections.reduce(
    (total, section) => total + section.verses.length,
    0
  );

  console.log(`Parsed lecture count: ${sections.length}`);
  console.log(`Parsed passage row count: ${passageCount}`);

  if (!debug) return;

  for (const section of sections) {
    console.log(
      `Lecture ${section.number}: ${section.displayTitle} (${section.verses.length} passages, source: ${section.source})`
    );
  }
}

function validateParsedSections(sections) {
  const passageCount = sections.reduce(
    (total, section) => total + section.verses.length,
    0
  );

  if (sections.length !== EXPECTED_LECTURES) {
    throw new Error(
      `Expected ${EXPECTED_LECTURES} Uttaradhyayana lectures, parsed ${sections.length}.`
    );
  }

  const sectionNumberSet = new Set(sections.map((section) => section.number));
  for (let number = 1; number <= EXPECTED_LECTURES; number += 1) {
    if (!sectionNumberSet.has(number)) {
      throw new Error(`Missing Uttaradhyayana lecture ${number}.`);
    }
  }

  if (sectionNumberSet.size !== EXPECTED_LECTURES) {
    throw new Error("Duplicate Uttaradhyayana lecture number detected.");
  }

  for (const section of sections) {
    if (!section.verses.length) {
      throw new Error(`Parsed ${section.displayTitle} with no passages.`);
    }
  }

  if (passageCount < MIN_EXPECTED_PASSAGES) {
    throw new Error(
      `Parsed only ${passageCount} Uttaradhyayana passages; expected at least ${MIN_EXPECTED_PASSAGES}.`
    );
  }

  if (passageCount > MAX_EXPECTED_PASSAGES) {
    throw new Error(
      `Parsed ${passageCount} Uttaradhyayana passages; expected no more than ${MAX_EXPECTED_PASSAGES}. Parser may be too broad.`
    );
  }

  const forbidden = /Sutrakritanga|Sutra-kritanga|Sacred Texts Archive|Project Gutenberg|Comments:|Last Updated|Privacy Policy|Become a Patreon|Buy me a Coffee|Index of Names|Index of Sanskrit/i;
  for (const section of sections) {
    for (const passage of section.verses) {
      if (forbidden.test(passage.content)) {
        throw new Error(
          `Detected non-Uttaradhyayana/navigation text in ${section.displayTitle}, passage ${passage.number}.`
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
      section_label: "Lecture",
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
    lecturesInserted: 0,
    lecturesSkipped: 0,
    passagesInserted: 0,
    errors: 0,
  };

  console.log(
    parseOnly
      ? "Starting Uttaradhyayana parse-only validation..."
      : "Starting Uttaradhyayana import..."
  );

  const parsedSections = await parseUttaradhyayana();
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
        summary.lecturesSkipped += 1;
        console.log(`Skipped lecture ${parsedSection.number}`);
      } else {
        summary.lecturesInserted += 1;
        console.log(`Inserted lecture ${parsedSection.number}`);
      }
    } catch (error) {
      summary.errors += 1;
      console.error(`Lecture ${parsedSection.number} failed:`);
      console.error(error);
    }
  }

  console.log("DONE! Uttaradhyayana import completed.");
  console.log("Import summary:");
  console.log(`Book created: ${summary.bookCreated ? "yes" : "no"}`);
  console.log(`Book reused: ${summary.bookReused ? "yes" : "no"}`);
  console.log(`Lectures inserted: ${summary.lecturesInserted}`);
  console.log(`Lectures skipped: ${summary.lecturesSkipped}`);
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