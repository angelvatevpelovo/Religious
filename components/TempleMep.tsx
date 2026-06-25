"use client";

import Image from "next/image";
import Link from "next/link";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Temple = {
  id: string;
  name: string;
  religion: string | null;
  country: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  image_url: string | null;
};

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export default function TempleMap({ temples }: { temples: Temple[] }) {
  const validTemples = temples.filter(
    (temple) => temple.latitude !== null && temple.longitude !== null
  );

  return (
    <div className="mt-8 h-[600px] overflow-hidden rounded-2xl border border-white/20">
      <MapContainer
        center={[31.7683, 35.2137]}
        zoom={2}
        scrollWheelZoom={true}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {validTemples.map((temple) => (
          <Marker
            key={temple.id}
            position={[temple.latitude!, temple.longitude!]}
            icon={markerIcon}
          >
            <Popup>
              <div className="w-48">
                {temple.image_url && (
                  <Image
                    src={temple.image_url}
                    alt={temple.name}
                    width={192}
                    height={96}
                    unoptimized
                    className="mb-2 h-24 w-full rounded object-cover"
                  />
                )}

                <strong>{temple.name}</strong>

                <p>
                  {temple.religion}
                  <br />
                  {temple.city}, {temple.country}
                </p>

                <Link href={`/temple/${temple.id}`}>View details</Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
