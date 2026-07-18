import Image from "next/image";
import Link from "next/link";
import { BackLink, GlassCard, PageShell } from "../../../components/DesignSystem";
import TemplePhotoGallery from "../../../components/TemplePhotoGallery";
import TemplePhotoUpload from "../../../components/TemplePhotoUpload";
import { supabase } from "../../../lib/supabase";
import ReviewForm from "./ReviewForm";
import ReviewsList from "./ReviewsList";
import TempleDetailMapWrapper from "./TempleDetailMapWrapper";

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
};

function getCoordinates(temple: Temple): [number, number] | null {
  const latitude = Number(temple.latitude);
  const longitude = Number(temple.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return [latitude, longitude];
}

function locationLabel(temple: Temple) {
  return [temple.city, temple.country].filter(Boolean).join(", ");
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  if (!value) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <dt className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7890AA]">
        {label}
      </dt>
      <dd className="mt-2 text-sm font-semibold leading-6 text-[#DCE7F4]">
        {value}
      </dd>
    </div>
  );
}

function NotFoundState({ title, description }: { title: string; description: string }) {
  return (
    <PageShell className="temple-detail-shell relative overflow-hidden">
      <div className="temple-detail-atmosphere pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative">
        <BackLink href="/temples">Back to Sacred Places Explorer</BackLink>
        <GlassCard className="mt-10 p-8">
          <h1 className="text-4xl font-black text-[#F8FAFC]">{title}</h1>
          <p className="mt-4 text-[#CBD5E1]">{description}</p>
          <Link
            href="/temples"
            className="mt-6 inline-flex rounded-2xl bg-[#D4AF37] px-5 py-3 text-sm font-black text-[#071A2F] transition hover:bg-[#F5D76E]"
          >
            Return to explorer
          </Link>
        </GlassCard>
      </div>
    </PageShell>
  );
}

export default async function TempleDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: temple, error } = await supabase
    .from("temples")
    .select(
      "id, name, religion, denomination, country, city, address, latitude, longitude, description, image_url, website_url"
    )
    .eq("id", id)
    .maybeSingle<Temple>();

  if (error) {
    return (
      <NotFoundState
        title="Could not load sacred place"
        description="There was a problem loading this sacred place. Please try again later."
      />
    );
  }

  if (!temple) {
    return (
      <NotFoundState
        title="Sacred place not found."
        description="This sacred place may have been removed or the link may be invalid."
      />
    );
  }

  const { data: reviews } = await supabase
    .from("temple_reviews")
    .select("*")
    .eq("temple_id", temple.id)
    .order("created_at", { ascending: false });

  const coordinates = getCoordinates(temple);
  const googleMapsUrl = coordinates
    ? `https://www.google.com/maps/dir/?api=1&destination=${coordinates[0]},${coordinates[1]}`
    : null;
  const typeLabel =
    [temple.religion, temple.denomination].filter(Boolean).join(" / ") ||
    "Sacred Place";
  const placeLocation = locationLabel(temple) || "Location not available";

  return (
    <PageShell className="temple-detail-shell relative overflow-hidden">
      <div className="temple-detail-atmosphere pointer-events-none absolute inset-0" aria-hidden="true" />

      <div className="relative">
        <BackLink href="/temples">Back to Sacred Places Explorer</BackLink>

        <section className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div className="overflow-hidden rounded-[2rem] border border-white/12 bg-[#061326]/72 shadow-2xl shadow-black/30 backdrop-blur-2xl">
            {temple.image_url ? (
              <div className="relative h-72 w-full sm:h-96 lg:h-[30rem]">
                <Image
                  src={temple.image_url}
                  alt={temple.name ? `Image of ${temple.name}` : "Sacred place image"}
                  fill
                  unoptimized
                  sizes="(min-width: 1024px) 60vw, 100vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#030817]/72 via-transparent to-transparent" />
              </div>
            ) : (
              <div className="temple-image-placeholder flex h-72 w-full items-center justify-center sm:h-96 lg:h-[30rem]">
                <span className="rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-5 py-2 text-sm font-bold uppercase tracking-[0.2em] text-[#F5D76E]">
                  Sacred Place
                </span>
              </div>
            )}

            <div className="p-6 sm:p-8">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-[#D4AF37]/35 bg-[#D4AF37]/10 px-3 py-1.5 text-xs font-bold text-[#F5D76E]">
                  {typeLabel}
                </span>
                <span className="rounded-full border border-white/12 bg-white/[0.06] px-3 py-1.5 text-xs font-bold text-[#CBD5E1]">
                  {placeLocation}
                </span>
              </div>

              <h1 className="mt-5 text-4xl font-black leading-tight text-[#F8FAFC] sm:text-5xl">
                {temple.name || "Unnamed sacred place"}
              </h1>

              <p className="mt-5 text-lg leading-8 text-[#CBD5E1]">
                {temple.description || "No description available yet."}
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                {googleMapsUrl && (
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex rounded-2xl bg-[#D4AF37] px-5 py-3 text-sm font-black text-[#071A2F] transition hover:bg-[#F5D76E]"
                  >
                    Navigate
                  </a>
                )}

                {temple.website_url && (
                  <a
                    href={temple.website_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex rounded-2xl border border-[#D4AF37]/45 bg-white/[0.06] px-5 py-3 text-sm font-bold text-[#F5D76E] transition hover:bg-white/10"
                  >
                    Visit Website
                  </a>
                )}
              </div>
            </div>
          </div>

          <aside className="space-y-5">
            <section className="rounded-[2rem] border border-white/12 bg-white/[0.045] p-6 shadow-2xl shadow-black/20 backdrop-blur-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#F5D76E]">
                Place details
              </p>

              <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <DetailItem label="Religion" value={temple.religion} />
                <DetailItem label="Denomination" value={temple.denomination} />
                <DetailItem label="Country" value={temple.country} />
                <DetailItem label="City" value={temple.city} />
                <DetailItem label="Address" value={temple.address || placeLocation} />
                <DetailItem
                  label="Coordinates"
                  value={
                    coordinates
                      ? `${coordinates[0].toFixed(6)}, ${coordinates[1].toFixed(6)}`
                      : null
                  }
                />
              </dl>
            </section>

            {!coordinates && (
              <section className="rounded-[2rem] border border-white/12 bg-white/[0.045] p-6 shadow-2xl shadow-black/20 backdrop-blur-2xl">
                <h2 className="text-2xl font-black text-[#F8FAFC]">
                  Map unavailable
                </h2>
                <p className="mt-3 text-[#CBD5E1]">
                  This sacred place does not have valid latitude and longitude yet.
                </p>
              </section>
            )}
          </aside>
        </section>

        {coordinates && (
          <section className="mt-8">
            <TempleDetailMapWrapper
              name={temple.name || "Unnamed sacred place"}
              religion={temple.religion}
              city={temple.city}
              country={temple.country}
              latitude={coordinates[0]}
              longitude={coordinates[1]}
            />
          </section>
        )}

        <section className="mt-10">
          <TemplePhotoGallery templeId={temple.id} />
        </section>

        <section className="mt-8">
          <TemplePhotoUpload templeId={temple.id} />
        </section>

        <ReviewsList reviews={reviews ?? []} />

        <ReviewForm templeId={temple.id} />
      </div>
    </PageShell>
  );
}
