import {
  EmptyState,
  FeatureCard,
  GlassCard,
  GoldButton,
  HeroPanel,
  PageShell,
  SectionHeader,
} from "../components/DesignSystem";
import { dictionaries } from "../lib/i18n";
import { getServerLocale } from "../lib/i18n-server";
import { supabase } from "../lib/supabase";

export const dynamic = "force-dynamic";

type MaybeArray<T> = T | T[] | null;

type DailyPrayer = {
  id: string;
  title: string | null;
  content: string | null;
  category: string | null;
  religions: MaybeArray<{ name: string | null }>;
};

type DailyVerse = {
  id: string;
  chapter_id: string | null;
  verse_number: number | null;
  content: string | null;
  chapters: MaybeArray<{
    id: string | null;
    title: string | null;
    chapter_number: number | null;
  }>;
};

type DailyEvent = {
  id: string;
  religion: string | null;
  title: string | null;
  description: string | null;
  event_date: string | null;
  country: string | null;
  is_global: boolean | null;
};

type DailyTemple = {
  id: string;
  name: string | null;
  religion: string | null;
  country: string | null;
  city: string | null;
  description: string | null;
  image_url: string | null;
};

function firstValue<T>(value: MaybeArray<T> | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function dailyIndex(count: number, salt: string) {
  const dateKey = new Date().toISOString().slice(0, 10);
  const input = `${dateKey}:${salt}`;
  let hash = 0;

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }

  return count > 0 ? hash % count : 0;
}

async function getDailyPrayer() {
  const { count } = await supabase
    .from("prayers")
    .select("id", { count: "exact", head: true });

  if (!count) return null;

  const index = dailyIndex(count, "prayer");
  const { data } = await supabase
    .from("prayers")
    .select("id, title, content, category, religions(name)")
    .order("created_at", { ascending: true })
    .range(index, index)
    .maybeSingle();

  return data as unknown as DailyPrayer | null;
}

async function getDailyVerse() {
  const { count } = await supabase
    .from("verses")
    .select("id", { count: "exact", head: true });

  if (!count) return null;

  const index = dailyIndex(count, "verse");
  const { data } = await supabase
    .from("verses")
    .select(
      "id, chapter_id, verse_number, content, chapters(id, title, chapter_number)"
    )
    .order("id", { ascending: true })
    .range(index, index)
    .maybeSingle();

  return data as unknown as DailyVerse | null;
}

async function getDailyEvent() {
  const { count } = await supabase
    .from("religious_events")
    .select("id", { count: "exact", head: true });

  if (!count) return null;

  const index = dailyIndex(count, "event");
  const { data } = await supabase
    .from("religious_events")
    .select("id, religion, title, description, event_date, country, is_global")
    .order("event_date", { ascending: true })
    .range(index, index)
    .maybeSingle();

  return data as unknown as DailyEvent | null;
}

async function getDailyTemple() {
  const { count } = await supabase
    .from("temples")
    .select("id", { count: "exact", head: true });

  if (!count) return null;

  const index = dailyIndex(count, "temple");
  const { data } = await supabase
    .from("temples")
    .select("id, name, religion, country, city, description, image_url")
    .order("name", { ascending: true })
    .range(index, index)
    .maybeSingle();

  return data as unknown as DailyTemple | null;
}

function formatEventDate(value: string | null, locale: string, emptyLabel: string) {
  if (!value) return emptyLabel;

  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export default async function HomePage() {
  const locale = await getServerLocale();
  const t = dictionaries[locale].home;
  const [
    { data: religions },
    { data: holyBooks },
    prayerOfDay,
    verseOfDay,
    eventOfDay,
    templeOfDay,
  ] = await Promise.all([
    supabase.from("religions").select("*").order("name"),
    supabase.from("holy_books").select("*").order("title"),
    getDailyPrayer(),
    getDailyVerse(),
    getDailyEvent(),
    getDailyTemple(),
  ]);

  const prayerReligion = firstValue(prayerOfDay?.religions);
  const verseChapter = firstValue(verseOfDay?.chapters);

  return (
    <PageShell>
      <HeroPanel
        eyebrow={t.heroEyebrow}
        title={t.heroTitle}
        description={t.heroDescription}
        action={
          <>
            <GoldButton href="/search">{t.searchScripture}</GoldButton>
            <GoldButton
              href="/assistant"
              className="border border-white/12 bg-white/[0.06] text-[#F8FAFC] hover:bg-white/10"
            >
              {t.askAssistant}
            </GoldButton>
          </>
        }
      >
        <GlassCard className="p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#F5D76E]">
            {t.today}
          </p>
          <h2 className="mt-4 text-3xl font-bold text-[#F8FAFC]">
            {t.stillness}
          </h2>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <FeatureCard title={t.libraryTitle} href="/book" eyebrow={t.read} />
            <FeatureCard title={dictionaries[locale].nav.temples} href="/temples" eyebrow={t.explore} />
            <FeatureCard title={dictionaries[locale].nav.calendar} href="/calendar" eyebrow={t.observe} />
            <FeatureCard title={dictionaries[locale].nav.reminders} href="/reminders" eyebrow={t.return} />
          </div>
        </GlassCard>
      </HeroPanel>

      <section className="mt-16">
        <SectionHeader
          eyebrow={t.dailyEyebrow}
          title={t.dailyTitle}
          description={t.dailyDescription}
        />

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <FeatureCard
            eyebrow={t.prayerOfDay}
            title={prayerOfDay?.title ?? t.noPrayer}
            description={
              prayerOfDay?.content
                ? prayerOfDay.content.slice(0, 260)
                : t.noPrayerDescription
            }
            href={prayerOfDay?.id ? `/prayer/${prayerOfDay.id}` : "/book"}
          >
            <p className="mt-5 text-sm font-semibold text-[#F5D76E]">
              {prayerReligion?.name ?? prayerOfDay?.category ?? "Prayer"}
            </p>
          </FeatureCard>

          <FeatureCard
            eyebrow={t.verseOfDay}
            title={
              verseChapter
                ? `${verseChapter.title ?? "Bible"} ${
                    verseChapter.chapter_number ?? ""
                  }:${verseOfDay?.verse_number ?? ""}`.trim()
                : t.noVerse
            }
            description={
              verseOfDay?.content ??
              t.noVerseDescription
            }
            href={
              verseOfDay?.chapter_id ? `/chapter/${verseOfDay.chapter_id}` : "/book"
            }
          />

          <FeatureCard
            eyebrow={t.eventOfDay}
            title={eventOfDay?.title ?? t.noEvent}
            description={
              eventOfDay?.description ??
              t.noEventDescription
            }
            href="/calendar"
          >
            <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold">
              <span className="rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-3 py-1 text-[#F5D76E]">
                {eventOfDay?.religion ?? "Calendar"}
              </span>
              <span className="rounded-full border border-white/12 bg-white/[0.06] px-3 py-1 text-[#CBD5E1]">
                {formatEventDate(eventOfDay?.event_date ?? null, locale, t.dateNotSet)}
              </span>
              {eventOfDay && (
                <span className="rounded-full border border-white/12 bg-white/[0.06] px-3 py-1 text-[#CBD5E1]">
                  {eventOfDay.is_global ? t.global : eventOfDay.country ?? t.regional}
                </span>
              )}
            </div>
          </FeatureCard>

          <FeatureCard
            eyebrow={t.placeOfDay}
            title={templeOfDay?.name ?? t.noPlace}
            description={
              templeOfDay?.description ??
              t.noPlaceDescription
            }
            href={templeOfDay?.id ? `/temple/${templeOfDay.id}` : "/temples"}
            className="overflow-hidden"
          >
            {templeOfDay?.image_url && (
              <div
                className="mt-5 h-44 rounded-[1.5rem] border border-white/12 bg-cover bg-center"
                style={{ backgroundImage: `url(${templeOfDay.image_url})` }}
                aria-label={`Image of ${templeOfDay.name ?? "sacred place"}`}
              />
            )}
            <p className="mt-5 text-sm font-semibold text-[#F5D76E]">
              {[templeOfDay?.city, templeOfDay?.country]
                .filter(Boolean)
                .join(", ") || templeOfDay?.religion || t.sacredPlace}
            </p>
          </FeatureCard>
        </div>
      </section>

      <section className="mt-16">
        <SectionHeader
          eyebrow={t.libraryEyebrow}
          title={t.libraryTitle}
          description={t.libraryDescription}
        />

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {!holyBooks || holyBooks.length === 0 ? (
            <div className="md:col-span-2 xl:col-span-3">
              <EmptyState title={t.noBooks} />
            </div>
          ) : (
            holyBooks.map((book) => (
              <FeatureCard
                key={book.id}
                href={`/book/${book.id}`}
                eyebrow={t.sacredText}
                title={book.title}
                description={book.description}
              />
            ))
          )}
        </div>
      </section>

      <section className="mt-16">
        <SectionHeader
          eyebrow={t.traditionsEyebrow}
          title={t.traditionsTitle}
          description={t.traditionsDescription}
        />

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {!religions || religions.length === 0 ? (
            <div className="md:col-span-2 xl:col-span-3">
              <EmptyState title={t.noReligions} />
            </div>
          ) : (
            religions.map((religion) => (
              <FeatureCard
                key={religion.id}
                href={`/religion/${religion.id}`}
                title={religion.name}
                description={religion.description}
              />
            ))
          )}
        </div>
      </section>
    </PageShell>
  );
}
