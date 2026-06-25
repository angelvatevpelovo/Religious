import Image from "next/image";
import {
  BackLink,
  GlassCard,
  GoldButton,
  PageShell,
  SectionHeader,
} from "../../../components/DesignSystem";
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

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="rounded-2xl border border-white/12 bg-black/20 p-5">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#F5D76E]">
        {label}
      </p>
      <p className="mt-3 text-base leading-7 text-[#F8FAFC]">
        {value || "Not available"}
      </p>
    </div>
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
      <PageShell>
        <BackLink href="/temples">Back to Temples</BackLink>

        <GlassCard className="mt-10 p-8">
          <h1 className="text-4xl font-bold text-[#D4AF37]">
            Could not load temple
          </h1>
          <p className="mt-4 text-[#CBD5E1]">
            There was a problem loading this sacred place. Please try again
            later.
          </p>
        </GlassCard>
      </PageShell>
    );
  }

  if (!temple) {
    return (
      <PageShell>
        <BackLink href="/temples">Back to Temples</BackLink>

        <GlassCard className="mt-10 p-8">
          <h1 className="text-4xl font-bold text-[#D4AF37]">
            Temple not found
          </h1>
          <p className="mt-4 text-[#CBD5E1]">
            This sacred place may have been removed or the link may be invalid.
          </p>
        </GlassCard>
      </PageShell>
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
    [temple.religion, temple.denomination].filter(Boolean).join(" - ") ||
    "Sacred Place";
  const locationLabel =
    [temple.city, temple.country].filter(Boolean).join(", ") ||
    "Location not available";

  return (
    <PageShell>
      <BackLink href="/temples">Back to Temples</BackLink>

      <section className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <GlassCard className="overflow-hidden">
          {temple.image_url ? (
            <div className="relative h-72 w-full sm:h-96 lg:h-[30rem]">
              <Image
                src={temple.image_url}
                alt={temple.name ? `Image of ${temple.name}` : "Temple image"}
                fill
                unoptimized
                sizes="(min-width: 1024px) 60vw, 100vw"
                className="object-cover"
              />
            </div>
          ) : (
            <div className="flex h-72 w-full items-center justify-center bg-[#0F2744] sm:h-96 lg:h-[30rem]">
              <span className="rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-5 py-2 text-sm font-bold uppercase tracking-[0.2em] text-[#F5D76E]">
                Sacred Place
              </span>
            </div>
          )}

          <div className="p-6 sm:p-8">
            <SectionHeader
              eyebrow={typeLabel}
              title={temple.name || "Unnamed temple"}
              description={temple.description || "No description available yet."}
            />

            <div className="mt-7 flex flex-wrap gap-3">
              {googleMapsUrl && (
                <GoldButton href={googleMapsUrl}>
                  Navigate with Google Maps
                </GoldButton>
              )}

              {temple.website_url && (
                <a
                  href={temple.website_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-2xl border border-[#D4AF37]/45 bg-white/[0.06] px-5 py-3 text-sm font-bold text-[#F5D76E] transition hover:bg-white/10"
                >
                  Visit Website
                </a>
              )}
            </div>
          </div>
        </GlassCard>

        <div className="space-y-5">
          <GlassCard className="p-6">
            <h2 className="text-2xl font-bold text-[#D4AF37]">
              Temple Details
            </h2>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <DetailItem label="Religion" value={temple.religion} />
              <DetailItem label="Denomination" value={temple.denomination} />
              <DetailItem label="Country" value={temple.country} />
              <DetailItem label="City" value={temple.city} />
              <DetailItem
                label="Address"
                value={temple.address || locationLabel}
              />
              <DetailItem
                label="Coordinates"
                value={
                  coordinates
                    ? `${coordinates[0].toFixed(6)}, ${coordinates[1].toFixed(6)}`
                    : null
                }
              />
            </div>
          </GlassCard>

          {!coordinates && (
            <GlassCard className="p-6">
              <h2 className="text-2xl font-bold text-[#D4AF37]">
                Map unavailable
              </h2>
              <p className="mt-3 text-[#CBD5E1]">
                This temple does not have valid latitude and longitude yet.
              </p>
            </GlassCard>
          )}
        </div>
      </section>

      {coordinates && (
        <div className="mt-8">
          <TempleDetailMapWrapper
            name={temple.name || "Unnamed temple"}
            religion={temple.religion}
            city={temple.city}
            country={temple.country}
            latitude={coordinates[0]}
            longitude={coordinates[1]}
          />
        </div>
      )}

      <section className="mt-10">
        <TemplePhotoGallery templeId={temple.id} />
      </section>

      <section className="mt-8">
        <TemplePhotoUpload templeId={temple.id} />
      </section>

      <ReviewsList reviews={reviews ?? []} />

      <ReviewForm templeId={temple.id} />
    </PageShell>
  );
}
