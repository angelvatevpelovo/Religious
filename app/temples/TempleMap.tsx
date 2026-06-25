"use client";

import L from "leaflet";
import Link from "next/link";
import { useEffect } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export type TempleMapTemple = {
  id: string;
  name: string | null;
  religion: string | null;
  country: string | null;
  city: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  image_url: string | null;
};

function getPoint(temple: TempleMapTemple): [number, number] | null {
  const lat = Number(temple.latitude);
  const lng = Number(temple.longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return [lat, lng];
}

function MapAutoFit({ temples }: { temples: TempleMapTemple[] }) {
  const map = useMap();

  useEffect(() => {
    const points = temples
      .map(getPoint)
      .filter((point): point is [number, number] => Boolean(point));

    if (points.length === 0) return;

    if (points.length === 1) {
      map.setView(points[0], 12);
      return;
    }

    map.fitBounds(L.latLngBounds(points), {
      maxZoom: 13,
      padding: [40, 40],
    });
  }, [map, temples]);

  return null;
}

function PopupImage({ temple }: { temple: TempleMapTemple }) {
  if (!temple.image_url) return null;

  return (
    <div
      className="mb-3 h-28 rounded-lg bg-cover bg-center"
      style={{ backgroundImage: `url(${temple.image_url})` }}
      aria-label={temple.name ? `Image of ${temple.name}` : "Temple image"}
    />
  );
}

export default function TempleMap({ temples }: { temples: TempleMapTemple[] }) {
  const validTemples = temples.filter((temple) => getPoint(temple));

  return (
    <section className="overflow-hidden rounded-2xl border border-[#D4AF37]/35 bg-white/10">
      <div className="border-b border-white/10 px-5 py-4">
        <h2 className="text-2xl font-bold text-[#D4AF37]">World Map</h2>
        <p className="mt-1 text-sm text-white/65">
          Showing {validTemples.length} sacred places with coordinates.
        </p>
      </div>

      <MapContainer
        center={[20, 0]}
        zoom={2}
        scrollWheelZoom
        className="h-[360px] w-full sm:h-[460px] lg:h-[560px]"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapAutoFit temples={validTemples} />

        {validTemples.map((temple) => {
          const point = getPoint(temple);
          if (!point) return null;

          return (
            <Marker key={temple.id} position={point} icon={markerIcon}>
              <Popup>
                <div className="min-w-[220px] text-[#0F2744]">
                  <PopupImage temple={temple} />

                  <h3 className="text-base font-bold">
                    {temple.name ?? "Unnamed temple"}
                  </h3>

                  {temple.religion && (
                    <p className="mt-1 text-sm font-semibold text-[#7a5a08]">
                      {temple.religion}
                    </p>
                  )}

                  <p className="mt-1 text-sm">
                    {[temple.city, temple.country].filter(Boolean).join(", ")}
                  </p>

                  <Link
                    href={`/temple/${temple.id}`}
                    className="mt-3 inline-block rounded-lg bg-[#D4AF37] px-3 py-2 text-sm font-bold text-[#0F2744]"
                  >
                    View Details
                  </Link>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </section>
  );
}
