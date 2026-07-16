import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search Sacred Texts",
  description:
    "Search verses and sacred text passages across the RELIGIOUS library.",
  alternates: {
    canonical: "/search",
  },
};

export default function SearchLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
