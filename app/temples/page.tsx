import Link from "next/link";
import type { Metadata } from "next";
import { supabase } from "../../lib/supabase";
import TemplesExplorerClient from "./TemplesExplorerClient";
import type { TempleListTemple } from "./types";

const PAGE_SIZE = 24;
const FETCH_PAGE_SIZE = 1000;

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Temples and Sacred Places",
  description:
    "Explore temples and sacred places with cards, search filters and an interactive map.",
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
      query = query.ilike("religion", `%${filters.religion}%`);
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
    <main className="min-h-screen bg-[#0F2744] p-6 text-white">
      <section className="mx-auto max-w-7xl">
        <Link href="/" className="text-[#D4AF37]">
          Back
        </Link>

        <h1 className="mt-8 text-4xl font-bold text-[#D4AF37]">
          Temples
        </h1>

        <p className="mt-2 text-white/70">
          Explore sacred places around the world.
        </p>

        <form
          action="/temples"
          className="mt-8 grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 md:grid-cols-4"
        >
          <select
            name="country"
            defaultValue={country}
            className="rounded-xl bg-white p-3 text-black"
          >
            <option value="">All countries</option>
            {uniqueCountries.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <input
            name="city"
            defaultValue={city}
            placeholder="City"
            className="rounded-xl bg-white p-3 text-black"
          />

          <input
            name="religion"
            defaultValue={religion}
            placeholder="Religion"
            className="rounded-xl bg-white p-3 text-black"
          />

          <button
            type="submit"
            className="rounded-xl bg-[#D4AF37] p-3 font-bold text-[#0F2744]"
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
