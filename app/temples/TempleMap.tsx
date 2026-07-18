"use client";

import L from "leaflet";
import { useEffect, useMemo } from "react";
import "leaflet.markercluster";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
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

function escapeHtml(value: string | null | undefined) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getLocationLabel(temple: TempleMapTemple) {
  return [temple.city, temple.country].filter(Boolean).join(", ");
}

function googleMapsUrl(temple: TempleMapTemple) {
  const point = getPoint(temple);

  if (!point) return null;

  return `https://www.google.com/maps/dir/?api=1&destination=${point[0]},${point[1]}`;
}

function popupHtml(temple: TempleMapTemple) {
  const image = temple.image_url
    ? `<div style="height:128px;border:1px solid rgba(212,175,55,.25);border-radius:16px;background-image:url('${escapeHtml(
        temple.image_url
      )}');background-size:cover;background-position:center;"></div>`
    : `<div style="display:flex;height:128px;align-items:center;justify-content:center;border:1px solid rgba(212,175,55,.3);border-radius:16px;background:#0F2744;"><span style="font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#D4AF37;">Sacred Place</span></div>`;
  const religion = temple.religion
    ? `<div style="margin-top:16px;"><span style="display:inline-flex;border:1px solid rgba(212,175,55,.35);border-radius:999px;background:rgba(212,175,55,.1);padding:4px 12px;font-size:12px;font-weight:800;color:#F5D76E;">${escapeHtml(
        temple.religion
      )}</span></div>`
    : "";
  const location = getLocationLabel(temple) || "Location not available";
  const navigationUrl = googleMapsUrl(temple);
  const navigationLink = navigationUrl
    ? `<a href="${escapeHtml(
        navigationUrl
      )}" target="_blank" rel="noreferrer" style="margin-top:10px;display:flex;width:100%;align-items:center;justify-content:center;border:1px solid rgba(212,175,55,.35);border-radius:16px;background:rgba(255,255,255,.06);padding:10px 16px;font-size:14px;font-weight:800;color:#F5D76E;text-decoration:none;">Navigate</a>`
    : "";

  return `
    <div style="width:260px;overflow:hidden;border-radius:16px;background:#071A2F;padding:12px;color:#F8FAFC;box-shadow:0 24px 60px rgba(0,0,0,.4);">
      ${image}
      ${religion}
      <h3 style="margin:12px 0 0;font-size:18px;line-height:1.25;font-weight:800;color:#F8FAFC;">${escapeHtml(
        temple.name || "Unnamed temple"
      )}</h3>
      <p style="margin:8px 0 0;font-size:14px;line-height:1.6;color:#CBD5E1;">${escapeHtml(
        location
      )}</p>
      <a href="/temple/${encodeURIComponent(
        temple.id
      )}" style="margin-top:16px;display:flex;width:100%;align-items:center;justify-content:center;border-radius:16px;background:#D4AF37;padding:10px 16px;font-size:14px;font-weight:800;color:#071A2F;text-decoration:none;">View Details</a>
      ${navigationLink}
    </div>
  `;
}

function ClusteredTempleMarkers({
  temples,
}: {
  temples: TempleMapTemple[];
}) {
  const map = useMap();

  useEffect(() => {
    const markerClusterGroup = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 52,
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      iconCreateFunction: (cluster) =>
        L.divIcon({
          html: `<span>${cluster.getChildCount()}</span>`,
          className: "religious-cluster",
          iconSize: L.point(46, 46, true),
        }),
    });

    const bounds = L.latLngBounds([]);

    for (const temple of temples) {
      const point = getPoint(temple);

      if (!point) continue;

      const marker = L.marker(point, { icon: markerIcon });
      marker.bindPopup(popupHtml(temple), {
        className: "religious-map-popup",
        maxWidth: 300,
        minWidth: 260,
      });
      markerClusterGroup.addLayer(marker);
      bounds.extend(point);
    }

    map.addLayer(markerClusterGroup);

    const frameId = window.requestAnimationFrame(() => {
      map.invalidateSize();

      if (!bounds.isValid()) {
        map.setView([20, 0], 2, { animate: false });
        return;
      }

      if (temples.length === 1) {
        map.setView(bounds.getCenter(), 12, { animate: true });
        return;
      }

      map.fitBounds(bounds, {
        animate: true,
        maxZoom: 13,
        paddingTopLeft: [36, 36],
        paddingBottomRight: [36, 36],
      });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      map.removeLayer(markerClusterGroup);
    };
  }, [map, temples]);

  return null;
}

export default function TempleMap({ temples }: { temples: TempleMapTemple[] }) {
  const validTemples = useMemo(
    () => temples.filter((temple) => getPoint(temple)),
    [temples]
  );

  return (
    <section className="overflow-hidden rounded-[2rem] border border-[#D4AF37]/25 bg-white/[0.045] shadow-2xl shadow-black/25 backdrop-blur-2xl">
      <div className="border-b border-white/10 px-5 py-4">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#F5D76E]">
          Interactive map
        </p>
        <h2 className="mt-2 text-2xl font-black text-[#F8FAFC]">World Map</h2>
        <p className="mt-1 text-sm text-[#AFC0D4]">
          Showing {validTemples.length} sacred places with coordinates.
        </p>
      </div>

      <MapContainer
        center={[20, 0]}
        zoom={2}
        scrollWheelZoom
        className="h-[380px] w-full sm:h-[480px] lg:h-[620px]"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <ClusteredTempleMarkers temples={validTemples} />
      </MapContainer>
    </section>
  );
}
