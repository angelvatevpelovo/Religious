"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import TempleMapWrapper from "./TempleMapWrapper";
import type { TempleListTemple } from "./types";

type UserLocation = {
  latitude: number;
  longitude: number;
};

type TempleWithDistance = TempleListTemple & {
  distanceKm: number | null;
};

const radiusOptions = [5, 10, 25, 50];

function coordinate(value: number | string | null) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function hasCoordinates(temple: TempleListTemple) {
  return coordinate(temple.latitude) !== null && coordinate(temple.longitude) !== null;
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

function matchesTextSearch(temple: TempleListTemple, search: string) {
  const normalizedSearch = search.trim().toLowerCase();

  if (!normalizedSearch) return true;

  const searchableText = [
    temple.name,
    temple.religion,
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

  return (
    <article className="rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:bg-white/10">
      <Link href={`/temple/${temple.id}`}>
        <h2 className="text-xl font-bold text-[#D4AF37]">
          {temple.name ?? "Unnamed temple"}
        </h2>

        <p className="mt-2 text-white/70">
          {temple.religion || "Religious place"}
        </p>

        <p className="mt-2 text-sm text-white/60">
          {[temple.city, temple.country].filter(Boolean).join(", ") ||
            "Location not available"}
        </p>

        {temple.distanceKm !== null && (
          <p className="mt-3 text-sm font-bold text-[#F5D76E]">
            {temple.distanceKm.toFixed(1)} km away
          </p>
        )}

        {temple.address && (
          <p className="mt-2 text-sm text-white/50">{temple.address}</p>
        )}
      </Link>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href={`/temple/${temple.id}`}
          className="rounded-xl bg-[#D4AF37] px-4 py-2 text-sm font-bold text-[#0F2744] transition hover:bg-[#F5D76E]"
        >
          View Details
        </Link>

        {navigationUrl && (
          <a
            href={navigationUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-[#D4AF37]/40 px-4 py-2 text-sm font-bold text-[#F5D76E] transition hover:bg-white/10"
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

  const religionOptions = useMemo(
    () => uniqueSortedValues(temples, "religion"),
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
        selectedReligion === "All" || temple.religion === selectedReligion;
      const matchesCountry =
        selectedCountry === "All" || temple.country === selectedCountry;
      const matchesCity = selectedCity === "All" || temple.city === selectedCity;

      return (
        matchesReligion &&
        matchesCountry &&
        matchesCity &&
        matchesTextSearch(temple, search)
      );
    });
  }, [search, selectedCity, selectedCountry, selectedReligion, temples]);

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

    if (!nearMeEnabled || !userLocation) return result;

    return [...result].sort((first, second) => {
      return (first.distanceKm ?? Number.POSITIVE_INFINITY) -
        (second.distanceKm ?? Number.POSITIVE_INFINITY);
    });
  }, [nearMeEnabled, radiusKm, templesWithDistance, userLocation]);

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
    setNearMeEnabled(false);
    setRadiusKm(25);
    setPage(1);
    setLocationMessage("");
  }

  return (
    <section className="mt-8">
      <div className="rounded-2xl border border-[#D4AF37]/25 bg-white/5 p-5 shadow-2xl shadow-black/10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-[#D4AF37]">Explore temples</h2>
            <p className="mt-2 text-sm text-white/70">
              Filter the loaded sacred places. The cards and map update together.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:justify-end">
            <div className="rounded-2xl border border-white/10 bg-[#0F2744]/80 px-4 py-3">
              <p className="text-xs font-bold uppercase text-white/50">Total loaded</p>
              <p className="mt-1 text-2xl font-bold text-[#D4AF37]">{temples.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#0F2744]/80 px-4 py-3">
              <p className="text-xs font-bold uppercase text-white/50">Showing filtered</p>
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
              className="min-h-12 w-full rounded-xl border border-[#D4AF37]/35 bg-[#071A2F] px-4 py-3 text-base text-white outline-none transition placeholder:text-white/40 focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
            />
          </label>

          <label className="grid gap-2 text-sm font-bold text-[#F5D76E]" htmlFor="temple-religion-filter">
            Religion
            <select
              id="temple-religion-filter"
              value={selectedReligion}
              onChange={(event) => updateFilter(() => setSelectedReligion(event.target.value))}
              className="min-h-12 w-full rounded-xl border border-[#D4AF37]/35 bg-[#071A2F] px-4 py-3 text-base text-white outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
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
              className="min-h-12 w-full rounded-xl border border-[#D4AF37]/35 bg-[#071A2F] px-4 py-3 text-base text-white outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
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
              className="min-h-12 w-full rounded-xl border border-[#D4AF37]/35 bg-[#071A2F] px-4 py-3 text-base text-white outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
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
            className="min-h-12 rounded-xl border border-[#D4AF37]/40 px-5 py-3 font-bold text-[#F5D76E] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45 md:col-span-2 xl:col-span-1"
          >
            Reset filters
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-[#D4AF37]">
              Temples near me
            </h2>
            <p className="mt-2 text-sm text-white/70">
              Use your browser location to sort nearby sacred places first.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={findNearbyTemples}
              disabled={locating}
              className="rounded-xl bg-[#D4AF37] px-5 py-3 font-bold text-[#0F2744] transition hover:bg-[#F5D76E] disabled:opacity-60"
            >
              {locating ? "Finding location..." : "Temples near me"}
            </button>

            {nearMeEnabled && (
              <button
                type="button"
                onClick={() => {
                  setNearMeEnabled(false);
                  setPage(1);
                }}
                className="rounded-xl border border-white/20 px-5 py-3 font-bold text-[#F5D76E] transition hover:bg-white/10"
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
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/70">
          No temples match the current filters.
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
            className="rounded-xl border border-white/20 px-5 py-3 font-bold"
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
            className="rounded-xl bg-[#D4AF37] px-5 py-3 font-bold text-[#0F2744]"
          >
            Next
          </button>
        )}
      </div>
    </section>
  );
}
