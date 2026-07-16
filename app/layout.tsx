import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import MobileBottomNav from "../components/MobileBottomNav";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://religious-rb2l.vercel.app"),
  title: {
    default: "RELIGIOUS | Sacred Texts, Temples, Prayer and AI Guidance",
    template: "%s | RELIGIOUS",
  },
  description:
    "RELIGIOUS is a calm spiritual companion for sacred texts, prayers, temples, search, favorites and reflective AI guidance.",
  applicationName: "RELIGIOUS",
  keywords: [
    "RELIGIOUS",
    "religion app",
    "sacred texts",
    "holy books",
    "prayers",
    "temples",
    "spiritual guidance",
    "interfaith",
    "AI religious guide",
  ],
  authors: [{ name: "RELIGIOUS" }],
  creator: "RELIGIOUS",
  publisher: "RELIGIOUS",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "RELIGIOUS",
    title: "RELIGIOUS | Sacred Texts, Temples, Prayer and AI Guidance",
    description:
      "Explore sacred texts, prayers, temples and reflective AI guidance in one calm spiritual companion.",
  },
  twitter: {
    card: "summary",
    title: "RELIGIOUS | Sacred Texts, Temples, Prayer and AI Guidance",
    description:
      "A calm spiritual companion for sacred texts, prayers, temples and reflective AI guidance.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-[#071A2F] text-[#F8FAFC]">
        {children}
        <MobileBottomNav />
      </body>
    </html>
  );
}
