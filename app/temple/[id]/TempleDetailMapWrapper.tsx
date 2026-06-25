"use client";

import dynamic from "next/dynamic";
import type { TempleDetailMapProps } from "./TempleDetailMap";

const TempleDetailMap = dynamic(() => import("./TempleDetailMap"), {
  ssr: false,
  loading: () => (
    <section className="rounded-[2rem] border border-[#D4AF37]/30 bg-white/10 p-6 text-[#CBD5E1]">
      Loading map...
    </section>
  ),
});

export default function TempleDetailMapWrapper(props: TempleDetailMapProps) {
  return <TempleDetailMap {...props} />;
}
