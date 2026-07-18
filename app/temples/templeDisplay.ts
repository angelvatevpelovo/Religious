export type TempleMarkerStyle = {
  label: string;
  key: string;
  symbol: string;
  className: string;
};

const religionAliases: Record<string, { label: string; key: string; symbol: string }> = {
  christian: { label: "Christianity", key: "christianity", symbol: "✝" },
  christianity: { label: "Christianity", key: "christianity", symbol: "✝" },
  church: { label: "Christianity", key: "christianity", symbol: "✝" },

  muslim: { label: "Islam", key: "islam", symbol: "☪" },
  islam: { label: "Islam", key: "islam", symbol: "☪" },
  mosque: { label: "Islam", key: "islam", symbol: "☪" },

  jewish: { label: "Judaism", key: "judaism", symbol: "✡" },
  judaism: { label: "Judaism", key: "judaism", symbol: "✡" },
  synagogue: { label: "Judaism", key: "judaism", symbol: "✡" },

  buddhist: { label: "Buddhism", key: "buddhism", symbol: "☸" },
  buddhism: { label: "Buddhism", key: "buddhism", symbol: "☸" },

  hindu: { label: "Hinduism", key: "hinduism", symbol: "ॐ" },
  hinduism: { label: "Hinduism", key: "hinduism", symbol: "ॐ" },

  sikh: { label: "Sikhism", key: "sikhism", symbol: "☬" },
  sikhism: { label: "Sikhism", key: "sikhism", symbol: "☬" },

  taoist: { label: "Taoism", key: "taoism", symbol: "☯" },
  taoism: { label: "Taoism", key: "taoism", symbol: "☯" },

  shinto: { label: "Shinto", key: "shinto", symbol: "⛩" },

  egyptian: { label: "Ancient Egyptian", key: "egyptian", symbol: "☥" },
  "ancient egyptian": { label: "Ancient Egyptian", key: "egyptian", symbol: "☥" },
};

const sacredPlaceLabels = new Set([
  "",
  "unknown",
  "religious place",
  "place of worship",
  "sacred place",
]);

function cleanKey(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function cleanDisplayLabel(value: string | null | undefined) {
  const cleaned = String(value ?? "")
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

  if (!cleaned) return "Sacred place";

  return cleaned
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function normalizeTempleReligionLabel(value?: string | null) {
  const key = cleanKey(value);

  if (religionAliases[key]) return religionAliases[key].label;
  if (sacredPlaceLabels.has(key)) return "Sacred place";
  if (key === "other") return "Other";

  return cleanDisplayLabel(value);
}

export function getTempleMarkerStyle(value?: string | null): TempleMarkerStyle {
  const label = normalizeTempleReligionLabel(value);
  const key = cleanKey(label);
  const alias = religionAliases[key];
  const markerKey = alias?.key || (label === "Sacred place" ? "sacred-place" : "other");
  const symbol = alias?.symbol || (label === "Sacred place" ? "•" : "✦");

  return {
    label,
    key: markerKey,
    symbol,
    className: `temple-marker--${markerKey}`,
  };
}

export function getTempleReligionSearchTerms(value?: string | null) {
  const label = normalizeTempleReligionLabel(value);
  const labelKey = cleanKey(label);
  const terms = new Set<string>();

  if (value?.trim()) terms.add(value.trim());
  terms.add(label);

  for (const [raw, mapped] of Object.entries(religionAliases)) {
    if (mapped.label === label) {
      terms.add(raw);
      terms.add(mapped.label);
    }
  }

  if (labelKey === "sacred place") {
    terms.add("Religious place");
    terms.add("place_of_worship");
  }

  return Array.from(terms).filter(Boolean);
}
