import { BackLink, GlassCard, PageShell } from "../../../components/DesignSystem";
import { supabase } from "../../../lib/supabase";

import ReviewForm from "./ReviewForm";
import ReviewsList from "./ReviewsList";

import TemplePhotoGallery from "../../../components/TemplePhotoGallery";
import TemplePhotoUpload from "../../../components/TemplePhotoUpload";

function hasCoordinates(temple: {
  latitude?: number | string | null;
  longitude?: number | string | null;
}) {
  return temple.latitude !== null && temple.latitude !== undefined &&
    temple.longitude !== null && temple.longitude !== undefined;
}

export default async function TempleDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: temple } = await supabase
    .from("temples")
    .select("*")
    .eq("id", id)
    .single();

  if (!temple) {
    return (
      <PageShell>
        <BackLink href="/temples">
          ← Back to Temple Map
        </BackLink>

        <h1 className="mt-10 text-5xl font-bold text-[#D4AF37]">
          Temple not found
        </h1>
      </PageShell>
    );
  }

  const { data: reviews } = await supabase
    .from("temple_reviews")
    .select("*")
    .eq("temple_id", temple.id)
    .order("created_at", { ascending: false });

  const googleMapsUrl =
    hasCoordinates(temple)
      ? `https://www.google.com/maps/search/?api=1&query=${temple.latitude},${temple.longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${temple.name} ${temple.city} ${temple.country}`
      )}`;
  const googleMapsEmbedUrl = hasCoordinates(temple)
    ? `https://www.google.com/maps?q=${temple.latitude},${temple.longitude}&output=embed`
    : null;
  const websiteUrl = temple.website_url || temple.website;
  const typeLabel =
    [temple.religion, temple.denomination].filter(Boolean).join(" - ") ||
    temple.type ||
    "Religious Place";

  return (
    <PageShell>
      <BackLink href="/temples">
        ← Back to Temple Map
      </BackLink>

      <GlassCard className="mt-10 p-6 sm:p-8">
        {temple.image_url && (
          <div
            className="mb-8 h-72 rounded-2xl border border-white/15 bg-cover bg-center sm:h-96"
            style={{ backgroundImage: `url(${temple.image_url})` }}
            aria-label={`Image of ${temple.name}`}
          />
        )}

        <h1 className="text-5xl font-bold text-[#D4AF37]">
          {temple.name}
        </h1>

        <p className="mt-3 text-xl text-white/80">
          {temple.description}
        </p>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-white/20 bg-black/20 p-5">
            <h2 className="text-2xl font-bold text-[#D4AF37]">
              Address
            </h2>

            <p className="mt-3 text-white/80">
              {temple.address}
              <br />
              {temple.city}, {temple.country}
            </p>
          </div>

          <div className="rounded-2xl border border-white/20 bg-black/20 p-5">
            <h2 className="text-2xl font-bold text-[#D4AF37]">
              Coordinates
            </h2>

            <p className="mt-3 text-white/80">
              Latitude: {temple.latitude ?? "N/A"}
              <br />
              Longitude: {temple.longitude ?? "N/A"}
            </p>
          </div>

          <div className="rounded-2xl border border-white/20 bg-black/20 p-5">
            <h2 className="text-2xl font-bold text-[#D4AF37]">
              Contact
            </h2>

            <p className="mt-3 text-white/80">
              Phone: {temple.phone || "Not available"}
              <br />
              Website:{" "}
              {websiteUrl ? (
                <a
                  href={websiteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#D4AF37] hover:underline"
                >
                  Visit Website
                </a>
              ) : (
                "Not available"
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-white/20 bg-black/20 p-5">
            <h2 className="text-2xl font-bold text-[#D4AF37]">
              Type
            </h2>

            <p className="mt-3 text-white/80">
              {typeLabel}
            </p>
          </div>
        </div>

        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-8 inline-block rounded-2xl bg-[#D4AF37] px-6 py-4 font-bold text-[#0F2744]"
        >
          Open in Google Maps
        </a>

        {googleMapsEmbedUrl && (
          <div className="mt-8 overflow-hidden rounded-2xl border border-white/20">
            <iframe
              title={`${temple.name} map`}
              src={googleMapsEmbedUrl}
              className="h-80 w-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        )}
      </GlassCard>

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
