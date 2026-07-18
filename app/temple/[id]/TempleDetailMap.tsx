"use client";

import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { getTempleMarkerStyle } from "../../temples/templeDisplay";

export type TempleDetailMapProps = {
  name: string;
  religion: string | null;
  city: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
};

function MapResizeAndCenter({ position }: { position: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      map.invalidateSize();
      map.setView(position, 14, { animate: false });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [map, position]);

  return null;
}

export default function TempleDetailMap({
  name,
  religion,
  city,
  country,
  latitude,
  longitude,
}: TempleDetailMapProps) {
  const position: [number, number] = [latitude, longitude];
  const location = [city, country].filter(Boolean).join(", ");
  const markerStyle = getTempleMarkerStyle(religion);
  const markerIcon = L.divIcon({
    html: `<span class="temple-marker__symbol">${markerStyle.symbol}</span>`,
    className: `temple-marker ${markerStyle.className}`,
    iconSize: L.point(34, 42, true),
    iconAnchor: [17, 38],
    popupAnchor: [0, -34],
  });

  return (
    <section className="overflow-hidden rounded-[2rem] border border-[#D4AF37]/25 bg-white/[0.045] shadow-2xl shadow-black/25 backdrop-blur-2xl">
      <div className="border-b border-white/10 px-5 py-4">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#F5D76E]">
          Location
        </p>
        <h2 className="mt-2 text-2xl font-black text-[#F8FAFC]">Location Map</h2>
        <p className="mt-1 text-sm text-[#AFC0D4]">
          Interactive map centered on this sacred place.
        </p>
      </div>

      <MapContainer
        center={position}
        zoom={14}
        scrollWheelZoom
        className="h-[320px] w-full sm:h-[420px]"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapResizeAndCenter position={position} />

        <Marker position={position} icon={markerIcon}>
          <Popup minWidth={220}>
            <div className="rounded-xl bg-[#071A2F] p-3 text-[#F8FAFC]">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#F5D76E]">
                {markerStyle.symbol} {markerStyle.label}
              </p>
              <h3 className="mt-2 text-base font-bold">{name}</h3>
              {location && (
                <p className="mt-1 text-sm text-[#CBD5E1]">{location}</p>
              )}
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </section>
  );
}
