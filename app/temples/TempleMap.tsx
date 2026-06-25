"use client";

import L from "leaflet";
import Link from "next/link";
import { useEffect, useMemo } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import type { TempleMapTemple } from "./types";

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

    const frameId = window.requestAnimationFrame(() => {
      map.invalidateSize();

      if (points.length === 0) {
        map.setView([20, 0], 2, { animate: false });
        return;
      }

      if (points.length === 1) {
        map.setView(points[0], 12, { animate: true });
        return;
      }

      map.fitBounds(L.latLngBounds(points), {
        animate: true,
        maxZoom: 13,
        paddingTopLeft: [36, 36],
        paddingBottomRight: [36, 36],
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [map, temples]);

  return null;
}

function PopupImage({ temple }: { temple: TempleMapTemple }) {
  if (!temple.image_url) {
    return (
      <div className="flex h-32 items-center justify-center rounded-2xl border border-[#D4AF37]/30 bg-[#0F2744]">
        <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#D4AF37]">
          Sacred Place
        </span>
      </div>
    );
  }

  return (
    <div
      className="h-32 rounded-2xl border border-[#D4AF37]/25 bg-cover bg-center"
      style={{ backgroundImage: `url(${temple.image_url})` }}
      aria-label={temple.name ? `Image of ${temple.name}` : "Temple image"}
    />
  );
}

function getLocationLabel(temple: TempleMapTemple) {
  return [temple.city, temple.country].filter(Boolean).join(", ");
}

export default function TempleMap({ temples }: { temples: TempleMapTemple[] }) {
  const validTemples = useMemo(
    () => temples.filter((temple) => getPoint(temple)),
    [temples]
  );

  return (
    <section className="overflow-hidden rounded-[2rem] border border-[#D4AF37]/35 bg-white/10 shadow-2xl shadow-black/20">
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
          const location = getLocationLabel(temple);

          return (
            <Marker key={temple.id} position={point} icon={markerIcon}>
              <Popup minWidth={260} maxWidth={300} className="religious-map-popup">
                <div className="w-[260px] overflow-hidden rounded-2xl bg-[#071A2F] p-3 text-[#F8FAFC] shadow-2xl">
                  <PopupImage temple={temple} />

                  <div className="mt-4">
                    {temple.religion && (
                      <span className="rounded-full border border-[#D4AF37]/35 bg-[#D4AF37]/10 px-3 py-1 text-xs font-bold text-[#F5D76E]">
                        {temple.religion}
                      </span>
                    )}
                  </div>

                  <h3 className="mt-3 text-lg font-bold leading-snug text-[#F8FAFC]">
                    {temple.name ?? "Unnamed temple"}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-[#CBD5E1]">
                    {location || "Location not available"}
                  </p>

                  <Link
                    href={`/temple/${temple.id}`}
                    className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-[#D4AF37] px-4 py-2.5 text-sm font-bold text-[#071A2F] transition hover:bg-[#F5D76E]"
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
