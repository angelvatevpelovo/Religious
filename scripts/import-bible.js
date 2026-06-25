require("dotenv").config({ path: ".env.local" });

const { createClient } = require("@supabase/supabase-js");
const axios = require("axios");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const BASE_URL = "https://raw.githubusercontent.com/aruljohn/Bible-kjv/master";

const books = [
  "Genesis",
  "Exodus",
  "Leviticus",
  "Numbers",
  "Deuteronomy",
  "Joshua",
  "Judges",
  "Ruth",
  "1 Samuel",
  "2 Samuel",
  "1 Kings",
  "2 Kings",
  "1 Chronicles",
  "2 Chronicles",
  "Ezra",
  "Nehemiah",
  "Esther",
  "Job",
  "Psalms",
  "Proverbs",
  "Ecclesiastes",
  "Song of Solomon",
  "Isaiah",
  "Jeremiah",
  "Lamentations",
  "Ezekiel",
  "Daniel",
  "Hosea",
  "Joel",
  "Amos",
  "Obadiah",
  "Jonah",
  "Micah",
  "Nahum",
  "Habakkuk",
  "Zephaniah",
  "Haggai",
  "Zechariah",
  "Malachi",
  "Matthew",
  "Mark",
  "Luke",
  "John",
  "Acts",
  "Romans",
  "1 Corinthians",
  "2 Corinthians",
  "Galatians",
  "Ephesians",
  "Philippians",
  "Colossians",
  "1 Thessalonians",
  "2 Thessalonians",
  "1 Timothy",
  "2 Timothy",
  "Titus",
  "Philemon",
  "Hebrews",
  "James",
  "1 Peter",
  "2 Peter",
  "1 John",
  "2 John",
  "3 John",
  "Jude",
  "Revelation",
];

function getBookFileName(bookTitle) {
  return `${bookTitle.replace(/\s+/g, "")}.json`;
}

async function insertInChunks(table, rows, size = 500) {
  for (let i = 0; i < rows.length; i += size) {
    const chunk = rows.slice(i, i + size);
    const { error } = await supabase.from(table).insert(chunk);

    if (error) throw error;
  }
}

async function getHolyBible() {
  const { data, error } = await supabase
    .from("holy_books")
    .select("id, title")
    .ilike("title", "%Bible%")
    .limit(1)
    .single();

  if (error) throw error;
  if (!data) throw new Error("Holy Bible record was not found in holy_books.");

  return data;
}

async function deleteChapter(chapterId) {
  const { error: deleteVersesError } = await supabase
    .from("verses")
    .delete()
    .eq("chapter_id", chapterId);

  if (deleteVersesError) throw deleteVersesError;

  const { error: deleteChapterError } = await supabase
    .from("chapters")
    .delete()
    .eq("id", chapterId);

  if (deleteChapterError) throw deleteChapterError;
}

async function prepareChapterForImport(bookId, title, chapterNumber, expectedVerseCount) {
  const { data: chapters, error } = await supabase
    .from("chapters")
    .select("id, created_at")
    .eq("book_id", bookId)
    .eq("title", title)
    .eq("chapter_number", chapterNumber)
    .order("created_at", { ascending: true });

  if (error) throw error;

  let completeChapterId = null;

  for (const chapter of chapters) {
    const { count, error: countError } = await supabase
      .from("verses")
      .select("id", { count: "exact", head: true })
      .eq("chapter_id", chapter.id);

    if (countError) throw countError;

    if (count === expectedVerseCount && !completeChapterId) {
      completeChapterId = chapter.id;
      continue;
    }

    await deleteChapter(chapter.id);
  }

  return {
    shouldImport: !completeChapterId,
    removedDuplicates: chapters.length > 1 || (chapters.length === 1 && !completeChapterId),
  };
}

async function countVersesForBook(bookId) {
  const chapterIds = [];

  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("chapters")
      .select("id")
      .eq("book_id", bookId)
      .range(from, from + 999);

    if (error) throw error;

    chapterIds.push(...data.map((chapter) => chapter.id));
    if (data.length < 1000) break;
  }

  let verseCount = 0;

  for (let i = 0; i < chapterIds.length; i += 100) {
    const { count, error } = await supabase
      .from("verses")
      .select("id", { count: "exact", head: true })
      .in("chapter_id", chapterIds.slice(i, i + 100));

    if (error) throw error;
    verseCount += count;
  }

  return verseCount;
}

async function main() {
  console.log("Starting KJV Bible import...");

  const holyBible = await getHolyBible();
  console.log(`Using holy_books record: ${holyBible.title} (${holyBible.id})`);

  const bibleDataByTitle = new Map();

  for (const title of books) {
    const bookFileName = getBookFileName(title);
    const bookUrl = `${BASE_URL}/${encodeURIComponent(bookFileName)}`;

    console.log(`Downloading ${title} from ${bookFileName}...`);

    const { data } = await axios.get(bookUrl);
    bibleDataByTitle.set(title, data);
  }

  const summary = {
    books: books.length,
    chaptersImported: 0,
    chaptersSkipped: 0,
    duplicateOrPartialChaptersRemoved: 0,
    versesImported: 0,
  };

  for (const title of books) {
    const bookData = bibleDataByTitle.get(title);

    for (const chapter of bookData.chapters) {
      const chapterNumber = Number(chapter.chapter);
      const expectedVerseCount = chapter.verses.length;
      const chapterState = await prepareChapterForImport(
        holyBible.id,
        title,
        chapterNumber,
        expectedVerseCount
      );

      if (chapterState.removedDuplicates) {
        summary.duplicateOrPartialChaptersRemoved += 1;
      }

      if (!chapterState.shouldImport) {
        summary.chaptersSkipped += 1;
        console.log(`Skipped ${title} chapter ${chapterNumber}`);
        continue;
      }

      const { data: insertedChapter, error: chapterError } = await supabase
        .from("chapters")
        .insert({
          book_id: holyBible.id,
          title,
          chapter_number: chapterNumber,
        })
        .select()
        .single();

      if (chapterError) throw chapterError;

      const verses = chapter.verses.map((verse) => ({
        chapter_id: insertedChapter.id,
        verse_number: Number(verse.verse),
        content: verse.text,
      }));

      await insertInChunks("verses", verses);

      summary.chaptersImported += 1;
      summary.versesImported += verses.length;

      console.log(`Imported ${title} chapter ${chapterNumber}`);
    }
  }

  const { count: totalChapters, error: totalChaptersError } = await supabase
    .from("chapters")
    .select("id", { count: "exact", head: true })
    .eq("book_id", holyBible.id);

  if (totalChaptersError) throw totalChaptersError;

  const totalVerses = await countVersesForBook(holyBible.id);

  console.log("DONE! KJV Bible import completed.");
  console.log("Import summary:");
  console.log(`Books supported: ${summary.books}`);
  console.log(`Chapters imported this run: ${summary.chaptersImported}`);
  console.log(`Chapters skipped as already complete: ${summary.chaptersSkipped}`);
  console.log(`Duplicate or partial chapters cleaned: ${summary.duplicateOrPartialChaptersRemoved}`);
  console.log(`Verses imported this run: ${summary.versesImported}`);
  console.log(`Database totals for ${holyBible.title}: ${totalChapters} chapters, ${totalVerses} verses`);
}

main().catch((error) => {
  console.error("IMPORT FAILED:");
  console.error(error.response?.data || error);
  process.exitCode = 1;
});
