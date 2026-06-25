"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BackLink,
  EmptyState,
  GlassCard,
  HeroPanel,
  PageShell,
} from "../../components/DesignSystem";
import { supabase } from "../../lib/supabase";
import TempleMapWrapper from "./TempleMapWrapper";

type Temple = {
  id: string;
  name: string | null;
  religion: string | null;
  denomination: string | null;
  country: string | null;
  city: string | null;
  address: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  description: string | null;
  image_url: string | null;
  website_url: string | null;
  created_at: string | null;
};

const RELIGION_FILTERS = [
  "All",
  "Christianity",
  "Islam",
  "Judaism",
  "Buddhism",
  "Hinduism",
  "Sikhism",
  "Bahai Faith",
  "Shinto",
  "Zoroastrianism",
  "Cao Dai",
];

function matchesSearch(temple: Temple, query: string) {
  const searchText = [
    temple.name,
    temple.religion,
    temple.country,
    temple.city,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return searchText.includes(query.toLowerCase());
}

function hasCoordinates(temple: Temple) {
  return temple.latitude !== null && temple.longitude !== null;
}

function TempleImage({ temple }: { temple: Temple }) {
  if (temple.image_url) {
    return (
      <div
        className="h-48 bg-cover bg-center"
        style={{ backgroundImage: `url(${temple.image_url})` }}
        aria-label={temple.name ? `Image of ${temple.name}` : "Temple image"}
      />
    );
  }

  return (
    <div className="flex h-48 items-center justify-center bg-[#081a2f]">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 rounded-full border-2 border-[#D4AF37]/70" />
        <p className="mt-4 text-sm font-bold uppercase tracking-wide text-[#D4AF37]">
          Sacred Place
        </p>
      </div>
    </div>
  );
}

export default function TemplesClient() {
  const [temples, setTemples] = useState<Temple[]>([]);
  const [query, setQuery] = useState("");
  const [selectedReligion, setSelectedReligion] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadTemples() {
      const { data, error: templesError } = await supabase
        .from("temples")
        .select(
          "id, name, religion, denomination, country, city, address, latitude, longitude, description, image_url, website_url, created_at"
        )
        .order("name", { ascending: true });

      if (!isActive) return;

      if (templesError) {
        setTemples([]);
        setError("Could not load temples.");
      } else {
        setTemples((data ?? []) as Temple[]);
        setError("");
      }

      setLoading(false);
    }

    void loadTemples();

    return () => {
      isActive = false;
    };
  }, []);

  const filteredTemples = useMemo(() => {
    const cleanQuery = query.trim();

    return temples.filter((temple) => {
      const matchesReligion =
        selectedReligion === "All" || temple.religion === selectedReligion;

      const matchesQuery = !cleanQuery || matchesSearch(temple, cleanQuery);

      return matchesReligion && matchesQuery;
    });
  }, [query, selectedReligion, temples]);

  return (
    <PageShell>
      <BackLink>Back Home</BackLink>

      <HeroPanel
        className="mt-10"
        eyebrow="Sacred Places"
        title="Temples"
        description="Find churches, mosques, synagogues, temples and other sacred places around the world."
      />

      <label htmlFor="temple-search" className="sr-only">
        Search temples
      </label>
      <input
        id="temple-search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by name, religion, country or city..."
        className="mt-8 w-full rounded-[1.5rem] border border-[#D4AF37]/40 bg-white/[0.06] px-5 py-4 text-lg text-[#F8FAFC] outline-none backdrop-blur transition placeholder:text-[#CBD5E1]/60 focus:border-[#D4AF37] focus:bg-white/[0.09]"
      />

      <div
        className="mt-5 flex gap-3 overflow-x-auto pb-2"
        aria-label="Filter temples by religion"
      >
        {RELIGION_FILTERS.map((religion) => {
          const isActive = selectedReligion === religion;

          return (
            <button
              key={religion}
              type="button"
              onClick={() => setSelectedReligion(religion)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition ${
                isActive
                  ? "border-[#D4AF37] bg-[#D4AF37] text-[#071A2F]"
                  : "border-white/12 bg-white/[0.06] text-[#CBD5E1] hover:border-[#D4AF37]/60 hover:text-[#F5D76E]"
              }`}
            >
              {religion}
            </button>
          );
        })}
      </div>

      <section className="mt-8" aria-live="polite">
        {loading && (
          <GlassCard className="p-5 text-[#CBD5E1]">
            Loading temples...
          </GlassCard>
        )}

        {!loading && error && (
          <p className="rounded-2xl border border-red-300/30 bg-red-500/10 p-5 text-red-100">
            {error}
          </p>
        )}

        {!loading && !error && filteredTemples.length === 0 && (
          <EmptyState
            title="No temples found"
            description="Try a different name, religion, country or city."
          />
        )}

        {!loading && !error && filteredTemples.length > 0 && (
          <div className="grid gap-8">
            <TempleMapWrapper temples={filteredTemples} />

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredTemples.map((temple) => (
                <article
                  key={temple.id}
                  className="overflow-hidden rounded-[2rem] border border-white/12 bg-white/[0.06] shadow-2xl shadow-black/20 backdrop-blur-xl transition hover:-translate-y-1 hover:border-[#D4AF37]/50 hover:bg-white/[0.09]"
                >
                  <TempleImage temple={temple} />

                  <div className="flex h-full flex-col p-6">
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-[#D4AF37]">
                        {temple.name ?? "Unnamed temple"}
                      </h2>

                      <div className="mt-4 grid gap-2 text-sm text-[#CBD5E1]">
                        {temple.religion && <p>Religion: {temple.religion}</p>}
                        {temple.denomination && (
                          <p>Denomination: {temple.denomination}</p>
                        )}
                        {temple.country && <p>Country: {temple.country}</p>}
                        {temple.city && <p>City: {temple.city}</p>}
                        {temple.address && <p>Address: {temple.address}</p>}
                      </div>

                      {temple.description && (
                        <p className="mt-5 leading-relaxed text-white/90">
                          {temple.description}
                        </p>
                      )}

                      {hasCoordinates(temple) && (
                        <p className="mt-5 text-sm text-[#CBD5E1]/75">
                          Latitude: {temple.latitude}
                          <br />
                          Longitude: {temple.longitude}
                        </p>
                      )}
                    </div>

                    <div className="mt-6 flex flex-wrap gap-3">
                      <Link
                        href={`/temple/${temple.id}`}
                        className="rounded-2xl bg-[#D4AF37] px-4 py-2 text-sm font-bold text-[#071A2F] transition hover:bg-[#F5D76E]"
                      >
                        View Details
                      </Link>

                      {temple.website_url && (
                        <a
                          href={temple.website_url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-bold text-[#F5D76E] transition hover:bg-white/10"
                        >
                          Website
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>
    </PageShell>
  );
}
