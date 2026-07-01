import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AIGuideLocation } from "./types";

type MaybeArray<T> = T | T[] | null;

type ReligionRow = {
  name: string | null;
  description: string | null;
};

type HolyBookRow = {
  title: string | null;
  description: string | null;
};

type PrayerRow = {
  title: string | null;
  content: string | null;
  category: string | null;
};

type VerseRow = {
  verse_number: number | null;
  content: string | null;
  chapters: MaybeArray<{
    title: string | null;
    chapter_number: number | null;
  }>;
};

type TempleRow = {
  name: string | null;
  religion: string | null;
  country: string | null;
  city: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  description: string | null;
};

type FavoriteVerseRow = {
  verses: MaybeArray<{
    verse_number: number | null;
    content: string | null;
    chapters: MaybeArray<{
      title: string | null;
      chapter_number: number | null;
    }>;
  }>;
};

function firstValue<T>(value: MaybeArray<T> | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function compactLine(parts: Array<string | number | null | undefined>) {
  return parts
    .filter((part) => part !== null && part !== undefined && `${part}`.trim())
    .join(" - ");
}

function extractSearchTerm(message: string) {
  const stopWords = new Set([
    "about",
    "what",
    "where",
    "when",
    "which",
    "religion",
    "prayer",
    "temple",
    "holy",
    "book",
    "verse",
    "near",
    "nearby",
    "please",
  ]);

  const words = message
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !stopWords.has(word));

  return words[0] ?? "";
}

function toCoordinate(value: number | string | null) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function distanceKm(first: AIGuideLocation, second: AIGuideLocation) {
  const earthRadiusKm = 6371;
  const lat1 = (first.latitude * Math.PI) / 180;
  const lat2 = (second.latitude * Math.PI) / 180;
  const deltaLat = ((second.latitude - first.latitude) * Math.PI) / 180;
  const deltaLon = ((second.longitude - first.longitude) * Math.PI) / 180;
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

async function safeQuery<T>(query: PromiseLike<{ data: unknown; error: unknown }>) {
  const { data, error } = await query;

  if (error) {
    return [] as T[];
  }

  return (data ?? []) as T[];
}

async function getFavoriteVerseContext(supabase: SupabaseClient, userId?: string | null) {
  if (!userId) return [];

  const favoriteVerses = await safeQuery<FavoriteVerseRow>(
    supabase
      .from("favorite_verses")
      .select(
        `
        verses (
          verse_number,
          content,
          chapters (
            title,
            chapter_number
          )
        )
      `
      )
      .eq("user_id", userId)
      .limit(5)
  );

  return favoriteVerses
    .map((favorite) => {
      const verse = firstValue(favorite.verses);
      const chapter = firstValue(verse?.chapters);
      const reference = `${chapter?.title ?? "Holy book"} ${chapter?.chapter_number ?? ""}:${
        verse?.verse_number ?? ""
      }`.trim();

      return verse?.content ? `${reference} - ${verse.content}` : null;
    })
    .filter(Boolean) as string[];
}

async function getNearbyTempleContext(
  supabase: SupabaseClient,
  location?: AIGuideLocation | null
) {
  if (!location) return [];

  const temples = await safeQuery<TempleRow>(
    supabase
      .from("temples")
      .select("name, religion, country, city, latitude, longitude, description")
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .limit(500)
  );

  return temples
    .map((temple) => {
      const latitude = toCoordinate(temple.latitude);
      const longitude = toCoordinate(temple.longitude);

      if (latitude === null || longitude === null) return null;

      return {
        temple,
        distance: distanceKm(location, { latitude, longitude }),
      };
    })
    .filter((item): item is { temple: TempleRow; distance: number } => Boolean(item))
    .sort((first, second) => first.distance - second.distance)
    .slice(0, 6)
    .map(({ temple, distance }) =>
      compactLine([
        temple.name,
        temple.religion,
        [temple.city, temple.country].filter(Boolean).join(", "),
        `${distance.toFixed(1)} km away`,
      ])
    );
}

export async function buildReligiousGuideContext({
  supabase,
  message,
  userId,
  location,
}: {
  supabase: SupabaseClient;
  message: string;
  userId?: string | null;
  location?: AIGuideLocation | null;
}) {
  const searchTerm = extractSearchTerm(message);
  const verseQuery = searchTerm
    ? supabase
        .from("verses")
        .select("verse_number, content, chapters(title, chapter_number)")
        .ilike("content", `%${searchTerm}%`)
        .limit(8)
    : supabase
        .from("verses")
        .select("verse_number, content, chapters(title, chapter_number)")
        .limit(8);

  const [religions, holyBooks, prayers, verses, temples, nearbyTemples, favorites] =
    await Promise.all([
      safeQuery<ReligionRow>(
        supabase.from("religions").select("name, description").order("name").limit(10)
      ),
      safeQuery<HolyBookRow>(
        supabase.from("holy_books").select("title, description").order("title").limit(10)
      ),
      safeQuery<PrayerRow>(supabase.from("prayers").select("title, content, category").limit(8)),
      safeQuery<VerseRow>(verseQuery),
      safeQuery<TempleRow>(
        supabase
          .from("temples")
          .select("name, religion, country, city, latitude, longitude, description")
          .limit(10)
      ),
      getNearbyTempleContext(supabase, location),
      getFavoriteVerseContext(supabase, userId),
    ]);

  const sections = [
    {
      title: "Religions",
      lines: religions.map((item) => compactLine([item.name, item.description?.slice(0, 180)])),
    },
    {
      title: "Holy Books",
      lines: holyBooks.map((item) => compactLine([item.title, item.description?.slice(0, 180)])),
    },
    {
      title: "Relevant Verses",
      lines: verses.map((item) => {
        const chapter = firstValue(item.chapters);
        const reference = `${chapter?.title ?? "Holy book"} ${chapter?.chapter_number ?? ""}:${
          item.verse_number ?? ""
        }`.trim();

        return compactLine([reference, item.content?.slice(0, 240)]);
      }),
    },
    {
      title: "Prayers",
      lines: prayers.map((item) =>
        compactLine([item.title, item.category, item.content?.slice(0, 220)])
      ),
    },
    {
      title: "Temples and Sacred Places",
      lines: temples.map((item) =>
        compactLine([
          item.name,
          item.religion,
          [item.city, item.country].filter(Boolean).join(", "),
          item.description?.slice(0, 150),
        ])
      ),
    },
    {
      title: "Nearby Temples",
      lines: nearbyTemples,
    },
    {
      title: "User Favorites",
      lines: favorites,
    },
  ];

  return sections
    .map((section) => {
      const lines = section.lines.filter(Boolean);

      if (!lines.length) return null;

      return `### ${section.title}\n${lines.map((line) => `- ${line}`).join("\n")}`;
    })
    .filter(Boolean)
    .join("\n\n");
}
