"use client";

import dynamic from "next/dynamic";
import type { TempleMapTemple } from "./types";

const TempleMap = dynamic(() => import("./TempleMap"), {
  ssr: false,
  loading: () => (
    <section className="rounded-2xl border border-[#D4AF37]/35 bg-white/10 p-5 text-[#CBD5E1]">
      Loading map...
    </section>
  ),
});

export default function TempleMapWrapper({
  temples,
}: {
  temples: TempleMapTemple[];
}) {
  return <TempleMap temples={temples} />;
}
