"use client";

import dynamic from "next/dynamic";
import type { TempleDetailMapProps } from "./TempleDetailMap";

const TempleDetailMap = dynamic(() => import("./TempleDetailMap"), {
  ssr: false,
  loading: () => (
    <section className="rounded-[2rem] border border-[#D4AF37]/25 bg-white/[0.045] p-6 text-[#CBD5E1] shadow-2xl shadow-black/20 backdrop-blur-2xl">
      Loading map...
    </section>
  ),
});

export default function TempleDetailMapWrapper(props: TempleDetailMapProps) {
  return <TempleDetailMap {...props} />;
}
