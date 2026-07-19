"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import TempleMapWrapper from "./TempleMapWrapper";
import { getTempleMarkerStyle, normalizeTempleReligionLabel } from "./templeDisplay";
import type { TempleListTemple } from "./types";

type UserLocation = {
  latitude: number;
  longitude: number;
};

type TempleWithDistance = TempleListTemple & {
  distanceKm: number | null;
};

type QualityFilterKey = "image" | "website" | "type" | "city" | "description";

type QualityFilters = Record<QualityFilterKey, boolean>;

type SortMode = "quality" | "name" | "nearest";

const radiusOptions = [5, 10, 25, 50];

const qualityFilterOptions: Array<{
  key: QualityFilterKey;
  label: string;
  matches: (temple: TempleListTemple) => boolean;
}> = [
  {
    key: "image",
    label: "With images",
    matches: (temple) => isNonEmptyString(temple.image_url),
  },
  {
    key: "website",
    label: "With website",
    matches: (temple) => isNonEmptyString(temple.website_url),
  },
  {
    key: "type",
    label: "With type",
    matches: (temple) => isNonEmptyString(temple.denomination),
  },
  {
    key: "city",
    label: "With city",
    matches: (temple) => isNonEmptyString(temple.city),
  },
  {
    key: "description",
    label: "With description",
    matches: (temple) => isNonEmptyString(temple.description),
  },
];

const emptyQualityFilters: QualityFilters = {
  image: false,
  website: false,
  type: false,
  city: false,
  description: false,
};

function coordinate(value: number | string | null) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function hasCoordinates(temple: TempleListTemple) {
  return coordinate(temple.latitude) !== null && coordinate(temple.longitude) !== null;
}

function templeQualityScore(temple: TempleListTemple) {
  let score = 0;

  if (isNonEmptyString(temple.image_url)) score += 3;
  if (isNonEmptyString(temple.description)) score += 2;
  if (isNonEmptyString(temple.website_url)) score += 2;
  if (isNonEmptyString(temple.denomination)) score += 1;
  if (isNonEmptyString(temple.city)) score += 1;
  if (isNonEmptyString(temple.address)) score += 1;
  if (isNonEmptyString(temple.religion)) score += 1;
  if (hasCoordinates(temple)) score += 1;

  return score;
}

function compareTempleNames(first: TempleListTemple, second: TempleListTemple) {
  return (first.name || "Unnamed temple").localeCompare(
    second.name || "Unnamed temple"
  );
}

function distanceKm(userLocation: UserLocation, temple: TempleListTemple) {
  const templeLatitude = coordinate(temple.latitude);
  const templeLongitude = coordinate(temple.longitude);

  if (templeLatitude === null || templeLongitude === null) {
    return null;
  }

  const earthRadiusKm = 6371;
  const userLatRad = (userLocation.latitude * Math.PI) / 180;
  const templeLatRad = (templeLatitude * Math.PI) / 180;
  const deltaLat = ((templeLatitude - userLocation.latitude) * Math.PI) / 180;
  const deltaLng = ((templeLongitude - userLocation.longitude) * Math.PI) / 180;
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(userLatRad) *
      Math.cos(templeLatRad) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

function googleMapsUrl(temple: TempleListTemple) {
  const latitude = coordinate(temple.latitude);
  const longitude = coordinate(temple.longitude);

  if (latitude === null || longitude === null) {
    return null;
  }

  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
}

function isNonEmptyString(value: string | null): value is string {
  return Boolean(value && value.trim());
}

function uniqueSortedValues(temples: TempleListTemple[], field: "religion" | "country" | "city") {
  return Array.from(
    new Set(temples.map((temple) => temple[field]).filter(isNonEmptyString))
  ).sort((first, second) => first.localeCompare(second));
}

function uniqueSortedReligionLabels(temples: TempleListTemple[]) {
  return Array.from(
    new Set(temples.map((temple) => normalizeTempleReligionLabel(temple.religion)))
  ).sort((first, second) => first.localeCompare(second));
}

function matchesTextSearch(temple: TempleListTemple, search: string) {
  const normalizedSearch = search.trim().toLowerCase();

  if (!normalizedSearch) return true;

  const searchableText = [
    temple.name,
    temple.religion,
    normalizeTempleReligionLabel(temple.religion),
    temple.denomination,
    temple.country,
    temple.city,
    temple.address,
    temple.description,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return searchableText.includes(normalizedSearch);
}

function TempleCard({ temple }: { temple: TempleWithDistance }) {
  const navigationUrl = googleMapsUrl(temple);
  const markerStyle = getTempleMarkerStyle(temple.religion);

  return (
    <article className="group overflow-hidden rounded-[1.5rem] border border-white/12 bg-[#061326]/58 p-5 shadow-2xl shadow-black/24 backdrop-blur-2xl transition hover:-translate-y-1 hover:border-[#D4AF37]/50 hover:bg-[#08182D]/68">
      <Link href={`/temple/${temple.id}`}>
        {temple.image_url && (
          <div
            className="mb-5 h-44 rounded-[1.25rem] border border-white/10 bg-cover bg-center"
            style={{ backgroundImage: `url(${temple.image_url})` }}
            aria-hidden="true"
          />
        )}

        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-[#D4AF37]/35 bg-[#D4AF37]/10 px-3 py-1 text-xs font-bold text-[#F5D76E]">
            {markerStyle.symbol} {markerStyle.label}
          </span>
          {temple.denomination && (
            <span className="rounded-full border border-white/12 bg-white/[0.06] px-3 py-1 text-xs font-bold text-[#CBD5E1]">
              {temple.denomination}
            </span>
          )}
        </div>

        <h2 className="mt-4 text-2xl font-black leading-tight text-[#F8FAFC]">
          {temple.name ?? "Unnamed temple"}
        </h2>

        <p className="mt-3 text-sm font-semibold text-[#AFC0D4]">
          {[temple.city, temple.country].filter(Boolean).join(", ") ||
            "Location not available"}
        </p>

        {temple.distanceKm !== null && (
          <p className="mt-3 text-sm font-bold text-[#F5D76E]">
            {temple.distanceKm.toFixed(1)} km away
          </p>
        )}

        {temple.address && (
          <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#CBD5E1]">
            {temple.address}
          </p>
        )}

        {temple.description && (
          <p className="mt-4 line-clamp-3 text-sm leading-6 text-[#AFC0D4]">
            {temple.description}
          </p>
        )}
      </Link>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href={`/temple/${temple.id}`}
          className="rounded-2xl bg-[#D4AF37] px-4 py-2 text-sm font-black text-[#071A2F] transition hover:bg-[#F5D76E]"
        >
          View Details
        </Link>

        {navigationUrl && (
          <a
            href={navigationUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-2xl border border-[#D4AF37]/40 px-4 py-2 text-sm font-bold text-[#F5D76E] transition hover:bg-white/10"
          >
            Navigate
          </a>
        )}
      </div>
    </article>
  );
}

export default function TemplesExplorerClient({
  temples,
  initialPage,
  pageSize,
}: {
  temples: TempleListTemple[];
  initialPage: number;
  pageSize: number;
}) {
  const [page, setPage] = useState(initialPage);
  const [search, setSearch] = useState("");
  const [selectedReligion, setSelectedReligion] = useState("All");
  const [selectedCountry, setSelectedCountry] = useState("All");
  const [selectedCity, setSelectedCity] = useState("All");
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [radiusKm, setRadiusKm] = useState(25);
  const [nearMeEnabled, setNearMeEnabled] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  const [qualityFilters, setQualityFilters] =
    useState<QualityFilters>(emptyQualityFilters);
  const [sortMode, setSortMode] = useState<SortMode>("quality");

  const religionOptions = useMemo(
    () => uniqueSortedReligionLabels(temples),
    [temples]
  );

  const countryOptions = useMemo(
    () => uniqueSortedValues(temples, "country"),
    [temples]
  );

  const cityOptions = useMemo(() => {
    const countryFilteredTemples =
      selectedCountry === "All"
        ? temples
        : temples.filter((temple) => temple.country === selectedCountry);

    return uniqueSortedValues(countryFilteredTemples, "city");
  }, [selectedCountry, temples]);

  async function findNearbyTemples() {
    setLocationMessage("");

    if (!navigator.geolocation) {
      setLocationMessage("Your browser does not support location access.");
      return;
    }

    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setNearMeEnabled(true);
        setSortMode("nearest");
        setPage(1);
        setLocating(false);
      },
      () => {
        setLocationMessage("Location access was denied or unavailable.");
        setLocating(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000 * 60 * 5,
        timeout: 10000,
      }
    );
  }

  const filteredTemples = useMemo(() => {
    return temples.filter((temple) => {
      const matchesReligion =
        selectedReligion === "All" ||
        normalizeTempleReligionLabel(temple.religion) === selectedReligion;
      const matchesCountry =
        selectedCountry === "All" || temple.country === selectedCountry;
      const matchesCity = selectedCity === "All" || temple.city === selectedCity;
      const matchesQuality = qualityFilterOptions.every((option) => {
        return !qualityFilters[option.key] || option.matches(temple);
      });

      return (
        matchesReligion &&
        matchesCountry &&
        matchesCity &&
        matchesQuality &&
        matchesTextSearch(temple, search)
      );
    });
  }, [qualityFilters, search, selectedCity, selectedCountry, selectedReligion, temples]);

  const templesWithDistance = useMemo<TempleWithDistance[]>(() => {
    return filteredTemples.map((temple) => ({
      ...temple,
      distanceKm: userLocation ? distanceKm(userLocation, temple) : null,
    }));
  }, [filteredTemples, userLocation]);

  const visibleTemples = useMemo(() => {
    const result = templesWithDistance.filter((temple) => {
      if (!nearMeEnabled || !userLocation) return true;

      return temple.distanceKm !== null && temple.distanceKm <= radiusKm;
    });

    return [...result].sort((first, second) => {
      if (sortMode === "nearest") {
        const firstDistance = first.distanceKm ?? Number.POSITIVE_INFINITY;
        const secondDistance = second.distanceKm ?? Number.POSITIVE_INFINITY;
        const distanceComparison = firstDistance - secondDistance;

        if (distanceComparison !== 0) return distanceComparison;

        return compareTempleNames(first, second);
      }

      if (sortMode === "name") {
        return compareTempleNames(first, second);
      }

      const qualityComparison =
        templeQualityScore(second) - templeQualityScore(first);

      if (qualityComparison !== 0) return qualityComparison;

      return compareTempleNames(first, second);
    });
  }, [nearMeEnabled, radiusKm, sortMode, templesWithDistance, userLocation]);

  const mapTemples = useMemo(
    () => visibleTemples.filter((temple) => hasCoordinates(temple)),
    [visibleTemples]
  );

  const totalPages = Math.max(1, Math.ceil(visibleTemples.length / pageSize));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const start = (currentPage - 1) * pageSize;
  const paginatedTemples = visibleTemples.slice(start, start + pageSize);
  const hasActiveFilters =
    search.trim() !== "" ||
    selectedReligion !== "All" ||
    selectedCountry !== "All" ||
    selectedCity !== "All" ||
    sortMode !== "quality" ||
    qualityFilterOptions.some((option) => qualityFilters[option.key]) ||
    nearMeEnabled;

  function updateFilter(update: () => void) {
    update();
    setPage(1);
  }

  function updateRadius(nextRadius: number) {
    setRadiusKm(nextRadius);
    setPage(1);
  }

  function resetFilters() {
    setSearch("");
    setSelectedReligion("All");
    setSelectedCountry("All");
    setSelectedCity("All");
    setQualityFilters(emptyQualityFilters);
    setSortMode("quality");
    setNearMeEnabled(false);
    setRadiusKm(25);
    setPage(1);
    setLocationMessage("");
  }

  function toggleQualityFilter(key: QualityFilterKey) {
    setQualityFilters((current) => ({
      ...current,
      [key]: !current[key],
    }));
    setPage(1);
  }

  return (
    <section className="mt-8">
      <div className="rounded-[1.5rem] border border-white/12 bg-white/[0.045] p-5 shadow-2xl shadow-black/20 backdrop-blur-2xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-black text-[#F8FAFC]">Explore sacred places</h2>
            <p className="mt-2 text-sm text-[#AFC0D4]">
              Filter the loaded sacred places. The cards and map update together.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:justify-end">
            <label
              className="col-span-2 grid gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#F5D76E] sm:col-span-1"
              htmlFor="temple-sort-mode"
            >
              Sort
              <select
                id="temple-sort-mode"
                value={sortMode}
                onChange={(event) => {
                  setSortMode(event.target.value as SortMode);
                  setPage(1);
                }}
                className="min-h-12 rounded-2xl border border-white/12 bg-[#030817]/72 px-4 py-3 text-sm normal-case tracking-normal text-[#F8FAFC] outline-none transition focus:border-[#D4AF37]/70"
              >
                <option value="quality">Best quality</option>
                <option value="name">Name A-Z</option>
                <option value="nearest" disabled={!userLocation}>
                  Nearest first
                </option>
              </select>
            </label>
            <div className="rounded-2xl border border-white/10 bg-[#030817]/62 px-4 py-3">
              <p className="text-xs font-bold uppercase text-[#7890AA]">Total loaded</p>
              <p className="mt-1 text-2xl font-bold text-[#D4AF37]">{temples.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#030817]/62 px-4 py-3">
              <p className="text-xs font-bold uppercase text-[#7890AA]">Showing filtered</p>
              <p className="mt-1 text-2xl font-bold text-[#D4AF37]">{visibleTemples.length}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-[1.35fr_1fr_1fr_1fr_auto] xl:items-end">
          <label className="grid gap-2 text-sm font-bold text-[#F5D76E]" htmlFor="temple-text-search">
            Search
            <input
              id="temple-text-search"
              value={search}
              onChange={(event) => updateFilter(() => setSearch(event.target.value))}
              placeholder="Search by name, city, religion..."
              className="min-h-12 w-full rounded-2xl border border-white/12 bg-[#030817]/72 px-4 py-3 text-base text-[#F8FAFC] outline-none transition placeholder:text-[#7890AA] focus:border-[#D4AF37]/70"
            />
          </label>

          <label className="grid gap-2 text-sm font-bold text-[#F5D76E]" htmlFor="temple-religion-filter">
            Religion
            <select
              id="temple-religion-filter"
              value={selectedReligion}
              onChange={(event) => updateFilter(() => setSelectedReligion(event.target.value))}
              className="min-h-12 w-full rounded-2xl border border-white/12 bg-[#030817]/72 px-4 py-3 text-base text-[#F8FAFC] outline-none transition focus:border-[#D4AF37]/70"
            >
              <option value="All">All religions</option>
              {religionOptions.map((religion) => (
                <option key={religion} value={religion}>
                  {religion}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-bold text-[#F5D76E]" htmlFor="temple-country-filter">
            Country
            <select
              id="temple-country-filter"
              value={selectedCountry}
              onChange={(event) =>
                updateFilter(() => {
                  setSelectedCountry(event.target.value);
                  setSelectedCity("All");
                })
              }
              className="min-h-12 w-full rounded-2xl border border-white/12 bg-[#030817]/72 px-4 py-3 text-base text-[#F8FAFC] outline-none transition focus:border-[#D4AF37]/70"
            >
              <option value="All">All countries</option>
              {countryOptions.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-bold text-[#F5D76E]" htmlFor="temple-city-filter">
            City
            <select
              id="temple-city-filter"
              value={selectedCity}
              onChange={(event) => updateFilter(() => setSelectedCity(event.target.value))}
              className="min-h-12 w-full rounded-2xl border border-white/12 bg-[#030817]/72 px-4 py-3 text-base text-[#F8FAFC] outline-none transition focus:border-[#D4AF37]/70"
            >
              <option value="All">All cities</option>
              {cityOptions.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={resetFilters}
            disabled={!hasActiveFilters}
            className="min-h-12 rounded-2xl border border-[#D4AF37]/40 px-5 py-3 font-bold text-[#F5D76E] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45 md:col-span-2 xl:col-span-1"
          >
            Reset filters
          </button>
        </div>

        <div className="mt-5 rounded-[1.25rem] border border-white/10 bg-[#030817]/42 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#F5D76E]">
                Quality
              </p>
              <p className="mt-1 text-sm text-[#AFC0D4]">
                Quality filters are applied to the visible loaded places.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {qualityFilterOptions.map((option) => {
                const active = qualityFilters[option.key];

                return (
                  <button
                    key={option.key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleQualityFilter(option.key)}
                    className={`min-h-10 rounded-full border px-4 py-2 text-sm font-bold transition ${
                      active
                        ? "border-[#D4AF37] bg-[#D4AF37] text-[#071A2F] shadow-lg shadow-[#D4AF37]/15"
                        : "border-white/15 bg-white/[0.035] text-[#F5D76E] hover:border-[#D4AF37]/45 hover:bg-white/[0.07]"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-[1.5rem] border border-white/12 bg-white/[0.045] p-5 shadow-2xl shadow-black/20 backdrop-blur-2xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-black text-[#F8FAFC]">
              Temples near me
            </h2>
            <p className="mt-2 text-sm text-[#AFC0D4]">
              Use your browser location to sort nearby sacred places first.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={findNearbyTemples}
              disabled={locating}
              className="rounded-2xl bg-[#D4AF37] px-5 py-3 font-black text-[#071A2F] transition hover:bg-[#F5D76E] disabled:opacity-60"
            >
              {locating ? "Finding location..." : "Temples near me"}
            </button>

            {nearMeEnabled && (
              <button
                type="button"
                onClick={() => {
                  setNearMeEnabled(false);
                  if (sortMode === "nearest") setSortMode("quality");
                  setPage(1);
                }}
                className="rounded-2xl border border-white/20 px-5 py-3 font-bold text-[#F5D76E] transition hover:bg-white/10"
              >
                Clear nearby
              </button>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {radiusOptions.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => updateRadius(option)}
              disabled={!nearMeEnabled}
              className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                radiusKm === option
                  ? "border-[#D4AF37] bg-[#D4AF37] text-[#0F2744]"
                  : "border-white/15 text-[#F5D76E] hover:bg-white/10"
              } disabled:cursor-not-allowed disabled:opacity-45`}
            >
              {option} km
            </button>
          ))}
        </div>

        {locationMessage && (
          <p className="mt-4 rounded-xl border border-red-300/30 bg-red-500/10 p-3 text-sm text-red-100">
            {locationMessage}
          </p>
        )}

        <div className="mt-5 flex flex-col gap-2 text-sm text-white/70 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Showing <span className="text-[#F5D76E]">{visibleTemples.length}</span>{" "}
            of <span className="text-[#F5D76E]">{temples.length}</span> loaded temples
          </p>
          <p>
            Page {currentPage} of {totalPages}
          </p>
        </div>
      </div>

      <div className="mt-8">
        <TempleMapWrapper temples={mapTemples} />
      </div>

      {visibleTemples.length === 0 ? (
        <div className="mt-8 rounded-[1.5rem] border border-white/12 bg-white/[0.045] p-8 text-center text-[#CBD5E1] shadow-2xl shadow-black/20 backdrop-blur-2xl">
          <h2 className="text-2xl font-bold text-[#F8FAFC]">
            No sacred places match your filters.
          </h2>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="mt-5 rounded-2xl bg-[#D4AF37] px-5 py-3 text-sm font-black text-[#071A2F] transition hover:bg-[#F5D76E]"
            >
              Reset filters
            </button>
          )}
        </div>
      ) : (
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {paginatedTemples.map((temple) => (
            <TempleCard key={temple.id} temple={temple} />
          ))}
        </div>
      )}

      <div className="mt-10 flex justify-between">
        {currentPage > 1 ? (
          <button
            type="button"
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            className="rounded-2xl border border-white/20 px-5 py-3 font-bold text-[#F5D76E] transition hover:bg-white/10"
          >
            Previous
          </button>
        ) : (
          <div />
        )}

        {currentPage < totalPages && (
          <button
            type="button"
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            className="rounded-2xl bg-[#D4AF37] px-5 py-3 font-black text-[#071A2F] transition hover:bg-[#F5D76E]"
          >
            Next
          </button>
        )}
      </div>
    </section>
  );
}
