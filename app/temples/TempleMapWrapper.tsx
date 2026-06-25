"use client";

import dynamic from "next/dynamic";
import type { TempleMapTemple } from "./TempleMap";

const TempleMap = dynamic(() => import("./TempleMap"), {
  ssr: false,
});

export default function TempleMapWrapper({
  temples,
}: {
  temples: TempleMapTemple[];
}) {
  return <TempleMap temples={temples} />;
}
