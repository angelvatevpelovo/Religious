"use client";

import dynamic from "next/dynamic";
import type { TempleMapTemple } from "./types";

const TempleMap = dynamic(() => import("./TempleMap"), {
  ssr: false,
  loading: () => (
    <section className="rounded-[2rem] border border-[#D4AF37]/25 bg-white/[0.045] p-5 text-[#CBD5E1] shadow-2xl shadow-black/20 backdrop-blur-2xl">
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
