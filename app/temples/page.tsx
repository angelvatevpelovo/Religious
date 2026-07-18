import Link from "next/link";
import type { Metadata } from "next";
import { supabase } from "../../lib/supabase";
import TemplesExplorerClient from "./TemplesExplorerClient";
import { getTempleReligionSearchTerms } from "./templeDisplay";
import type { TempleListTemple } from "./types";

const PAGE_SIZE = 24;
const FETCH_PAGE_SIZE = 1000;

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sacred Places Explorer",
  description:
    "Explore temples, churches, mosques, synagogues, monasteries, shrines and sacred places with filters and an interactive map.",
  alternates: {
    canonical: "/temples",
  },
};

type TempleFilter = {
  country: string;
  city: string;
  religion: string;
};

async function fetchAllFilteredTemples(filters: TempleFilter) {
  const temples: TempleListTemple[] = [];
  let from = 0;

  while (true) {
    const to = from + FETCH_PAGE_SIZE - 1;
    let query = supabase
      .from("temples")
      .select(
        "id, name, religion, denomination, country, city, address, latitude, longitude, description, image_url, website_url, created_at"
      )
      .order("name", { ascending: true })
      .range(from, to);

    if (filters.country) query = query.eq("country", filters.country);
    if (filters.city) query = query.ilike("city", `%${filters.city}%`);
    if (filters.religion) {
      const religionTerms = getTempleReligionSearchTerms(filters.religion);

      query = query.or(
        religionTerms
          .map((term) => `religion.ilike.%${term.replace(/[%(),]/g, "")}%`)
          .join(",")
      );
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    temples.push(...((data ?? []) as TempleListTemple[]));

    if (!data || data.length < FETCH_PAGE_SIZE) break;

    from += FETCH_PAGE_SIZE;
  }

  return temples;
}

export default async function TemplesPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    country?: string;
    city?: string;
    religion?: string;
  }>;
}) {
  const params = await searchParams;

  const page = Number(params?.page || "1");
  const country = params?.country || "";
  const city = params?.city || "";
  const religion = params?.religion || "";

  const currentPage = Number.isFinite(page) && page > 0 ? page : 1;
  const filters = { country, city, religion };
  const temples = await fetchAllFilteredTemples(filters);

  const { data: countries } = await supabase
    .from("temples")
    .select("country")
    .not("country", "is", null)
    .order("country");

  const uniqueCountries = Array.from(
    new Set((countries || []).map((item) => item.country).filter(Boolean))
  );

  return (
    <main className="temples-shell relative min-h-screen overflow-hidden px-4 pb-32 pt-4 text-[#F8FAFC] sm:px-8 sm:pt-6 lg:px-10">
      <div className="temples-atmosphere pointer-events-none absolute inset-0" aria-hidden="true" />

      <section className="relative mx-auto max-w-7xl">
        <Link
          href="/"
          className="inline-flex items-center rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-[#F5D76E] backdrop-blur transition hover:border-[#D4AF37]/60 hover:bg-white/10"
        >
          Back
        </Link>

        <section className="mt-8 overflow-hidden rounded-[2rem] border border-white/12 bg-[#061326]/72 p-6 shadow-2xl shadow-black/30 backdrop-blur-2xl sm:p-8 lg:p-10">
          <div className="max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#F5D76E]">
              Sacred Places
            </p>
            <h1 className="mt-4 text-5xl font-black leading-tight tracking-normal text-[#F8FAFC] sm:text-6xl">
              Sacred Places Explorer
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-[#DCE7F4]">
              Discover temples, churches, mosques, synagogues, monasteries,
              shrines, and sacred places around the world.
            </p>
            <p className="mt-4 max-w-3xl leading-7 text-[#AFC0D4]">
              Use the map and filters to explore sacred places by tradition,
              country, city, or distance.
            </p>
          </div>
        </section>

        <form
          action="/temples"
          className="mt-6 grid gap-4 rounded-[1.5rem] border border-white/12 bg-white/[0.045] p-4 shadow-2xl shadow-black/20 backdrop-blur-2xl md:grid-cols-4"
        >
          <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#F5D76E]">
            Country
            <select
              name="country"
              defaultValue={country}
              className="min-h-12 rounded-2xl border border-white/12 bg-[#030817]/72 px-4 py-3 text-sm normal-case tracking-normal text-[#F8FAFC] outline-none transition focus:border-[#D4AF37]/70"
            >
              <option value="">All countries</option>
              {uniqueCountries.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#F5D76E]">
            City
            <input
              name="city"
              defaultValue={city}
              placeholder="City"
              className="min-h-12 rounded-2xl border border-white/12 bg-[#030817]/72 px-4 py-3 text-sm normal-case tracking-normal text-[#F8FAFC] outline-none transition placeholder:text-[#7890AA] focus:border-[#D4AF37]/70"
            />
          </label>

          <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#F5D76E]">
            Religion
            <input
              name="religion"
              defaultValue={religion}
              placeholder="Religion"
              className="min-h-12 rounded-2xl border border-white/12 bg-[#030817]/72 px-4 py-3 text-sm normal-case tracking-normal text-[#F8FAFC] outline-none transition placeholder:text-[#7890AA] focus:border-[#D4AF37]/70"
            />
          </label>

          <button
            type="submit"
            className="min-h-12 self-end rounded-2xl bg-[#D4AF37] px-5 py-3 text-sm font-black text-[#071A2F] transition hover:bg-[#F5D76E]"
          >
            Search
          </button>
        </form>

        <TemplesExplorerClient
          temples={temples}
          initialPage={currentPage}
          pageSize={PAGE_SIZE}
        />
      </section>
    </main>
  );
}
