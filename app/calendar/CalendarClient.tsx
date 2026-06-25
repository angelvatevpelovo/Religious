"use client";

import { useMemo, useState } from "react";
import { BackLink, EmptyState, GlassCard } from "../../components/DesignSystem";

export type ReligiousEvent = {
  id: string;
  religion: string | null;
  title: string;
  description: string | null;
  event_date: string;
  country: string | null;
  is_global: boolean | null;
  created_at: string | null;
};

const filters = [
  "All",
  "Christianity",
  "Islam",
  "Judaism",
  "Buddhism",
  "Hinduism",
  "Sikhism",
  "Bahai Faith",
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function sortUpcomingFirst(events: ReligiousEvent[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return [...events].sort((a, b) => {
    const aDate = new Date(`${a.event_date}T00:00:00`);
    const bDate = new Date(`${b.event_date}T00:00:00`);
    const aUpcoming = aDate >= today;
    const bUpcoming = bDate >= today;

    if (aUpcoming !== bUpcoming) {
      return aUpcoming ? -1 : 1;
    }

    return aDate.getTime() - bDate.getTime();
  });
}

export default function CalendarClient({
  events,
  error,
}: {
  events: ReligiousEvent[];
  error: string;
}) {
  const [selectedReligion, setSelectedReligion] = useState("All");

  const filteredEvents = useMemo(() => {
    const filtered =
      selectedReligion === "All"
        ? events
        : events.filter((event) => event.religion === selectedReligion);

    return sortUpcomingFirst(filtered);
  }, [events, selectedReligion]);

  return (
    <section className="mt-10">
      <BackLink>Back Home</BackLink>

      <div className="mt-8 flex gap-2 overflow-x-auto pb-2">
        {filters.map((filter) => (
          <button
            key={filter}
            onClick={() => setSelectedReligion(filter)}
            className={`shrink-0 rounded-2xl border px-4 py-2 text-sm font-bold transition ${
              selectedReligion === filter
                ? "border-[#D4AF37] bg-[#D4AF37] text-[#071A2F]"
                : "border-white/12 bg-white/[0.06] text-[#CBD5E1] hover:border-[#D4AF37]/60 hover:text-[#F5D76E]"
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-8 rounded-2xl border border-red-300/30 bg-red-500/10 p-5 text-red-100">
          {error}
        </p>
      )}

      {!error && filteredEvents.length === 0 && (
        <div className="mt-8">
          <EmptyState
            title="No events found"
            description="Run the religious events seed script after creating the Supabase table."
          />
        </div>
      )}

      {!error && filteredEvents.length > 0 && (
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredEvents.map((event) => (
            <GlassCard
              key={event.id}
              className="p-6 transition hover:-translate-y-1 hover:border-[#D4AF37]/50 hover:bg-white/[0.09]"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#F5D76E]">
                {formatDate(event.event_date)}
              </p>
              <h2 className="mt-4 text-2xl font-bold text-[#F8FAFC]">
                {event.title}
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {event.religion && (
                  <span className="rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-3 py-1 text-xs font-bold text-[#F5D76E]">
                    {event.religion}
                  </span>
                )}
                <span className="rounded-full border border-white/12 bg-white/[0.06] px-3 py-1 text-xs font-bold text-[#CBD5E1]">
                  {event.is_global ? "Global" : event.country ?? "Regional"}
                </span>
              </div>
              {event.description && (
                <p className="mt-4 leading-7 text-[#CBD5E1]">
                  {event.description}
                </p>
              )}
            </GlassCard>
          ))}
        </div>
      )}
    </section>
  );
}
