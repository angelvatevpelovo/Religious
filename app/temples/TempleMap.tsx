"use client";

import L from "leaflet";
import { useEffect, useMemo } from "react";
import "leaflet.markercluster";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { getTempleMarkerStyle } from "./templeDisplay";
import type { TempleMapTemple } from "./types";

function getPoint(temple: TempleMapTemple): [number, number] | null {
  const lat = Number(temple.latitude);
  const lng = Number(temple.longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return [lat, lng];
}

function markerIcon(temple: TempleMapTemple) {
  const style = getTempleMarkerStyle(temple.religion);

  return L.divIcon({
    html: `<span class="temple-marker__symbol">${escapeHtml(style.symbol)}</span>`,
    className: `temple-marker ${style.className}`,
    iconSize: L.point(34, 42, true),
    iconAnchor: [17, 38],
    popupAnchor: [0, -34],
  });
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
  const style = getTempleMarkerStyle(temple.religion);
  const image = temple.image_url
    ? `<div class="temple-popup__image" style="background-image:url('${escapeHtml(
        temple.image_url
      )}');"></div>`
    : `<div class="temple-popup__image temple-popup__image--fallback"><span>${escapeHtml(
        style.symbol
      )}</span><small>Sacred Place</small></div>`;
  const denomination = temple.denomination
    ? `<span class="temple-popup__meta">${escapeHtml(temple.denomination)}</span>`
    : "";
  const location = getLocationLabel(temple) || "Location not available";
  const navigationUrl = googleMapsUrl(temple);
  const navigationLink = navigationUrl
    ? `<a href="${escapeHtml(
        navigationUrl
      )}" target="_blank" rel="noreferrer" class="temple-popup__button temple-popup__button--secondary">Navigate</a>`
    : "";

  return `
    <div class="temple-popup">
      ${image}
      <div class="temple-popup__badges">
        <span class="temple-popup__badge ${style.className}">${escapeHtml(
          style.symbol
        )} ${escapeHtml(style.label)}</span>
        ${denomination}
      </div>
      <h3 class="temple-popup__title">${escapeHtml(
        temple.name || "Unnamed temple"
      )}</h3>
      <p class="temple-popup__location">${escapeHtml(
        location
      )}</p>
      <a href="/temple/${encodeURIComponent(
        temple.id
      )}" class="temple-popup__button temple-popup__button--primary">View Details</a>
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

      const marker = L.marker(point, { icon: markerIcon(temple) });
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
